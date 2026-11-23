# Combat trades and civilian protection, 23 November

The user accepts aggressive play and asked what the reported costly sacrifices
actually achieved. Continue from `bfb01201`. Keep economic settings fixed,
retain the original policy as the default and leave port 5199 unchanged.

Do not use immediate counter-death counts as a rejection rule. Judge a trade
against its alternatives, the target's value, follow-up attacks, captures and
protection of nearby units. A failed finishing roll is not proof of poor play.

The user also clarified that a unit with no useful escape can sacrifice itself
for damage. A costly retreat can be worse than attacking. Trading units to
accelerate a city capture is acceptable. Preserve those options. A civilian
behind a doomed guard must not appear safe merely because the guard waits.

## Initial review

The preceding five-map experiment had eleven immediate counter-deaths with no
enemy killed in the same attack. The original decision records and actual
combat events give a more useful distinction:

- Four targets died to units from the same empire within two turns. Two died
  to later attacks; two died while attacking an ally and taking its counter.
  These are plausible setup attacks. The record does not prove that losing
  the first attacker was necessary.
- Two attacks had a possible finishing roll and lost the damage roll. One
  warrior attacked a spearman on 31 health; one chariot attacked a spearman
  on 41 health. Review them as gambles, not certain pointless deaths.
- Five have no recorded removal of the target by the same empire in the
  following two turns, and were not finishing gambles. That is a review flag,
  not proof that escape was safe.
- Examples needing closer review: warrior 311 on seed 48017, turn 63, lost
  its 18 health to deal 22 damage to a full-health spearman. Swordsman 224 on
  seed 67153, turn 85, lost its 5 health for 14 damage to Rayy's walls.

The earlier display preview intentionally differs from the bot's risk samples
on uncertain finishing attacks. Use the combat samples for planning analysis;
do not treat the displayed counter range as a safety bound.

## Original escape checks

Both private-board captures reproduce their complete accepted command prefixes.
The checks apply each ordinary legal move and fortify command on a copy, then
ask whether enemies visible on the original board can attack the destination
with a full movement allowance. Swaps are excluded.

- Warrior 311 has one ordinary retreat. Both holding and retreating permit
  lethal attacks from two visible enemies, including their minimum damage rolls.
- Swordsman 224 has six ordinary retreats. Holding and every retreat permit
  at least one lethal attack, including its minimum damage roll.

These checks do not predict the enemy's choice or prove that death is inevitable.
They show that neither example had an ordinary retreat free of a known lethal
attack. Calling either trade bad from the lack of a follow-up was too strong.
Three of the eleven cases still lack this detailed alternatives review.

## Implementation

Preserve aggression and existing risk weights. First improve the evaluation of
what a move or attack leaves behind:

1. Review the original private boards for the two examples above and check
   legal exits. Keep the original accepted command prefix as the provenance.
2. Charge a local move or sacrifice for leaving a civilian on the acting unit's
   tile open to a known enemy. Removing the threat can still be the best action.
   Use the shared combat forecast for the shortlisted positions.
3. Keep a valid alternate enemy attack origin when a candidate occupies the
   first origin. Reuse the cached coverage; avoid a new group search.
4. Compare combat outcomes and saved-turn planning cost. Do not promote an
   experiment merely because it loses fewer soldiers.

These changes do not replace the strategic worker and settler guard assignments.
They address local choices made after those assignments, including a civilian
that arrived on a soldier's tile later in the turn.

The implementation reuses the existing civilian value and all existing combat
weights. An attack that removes the threat is still a valid way to protect the
civilian. A retained melee forecast that kills the waiting guard also counts
the civilian as exposed; waiting does not receive a false protection benefit.
The tests preserve a trapped unit's last attack and a finishing attack that
removes a threat to a worker.

Enemy attack origins are cached lazily. If a projected unit or another retained
enemy occupies the first origin, the forecast can use an alternate. Only
`tactics.choices` exact origin attempts are allowed per enemy and target.
Movement paths still come from the current board. This is not a full search
of paths after every hypothetical move or kill.

The combat audit now records whether a counter-death was followed by an allied
kill of the same target or a capture of the same city within two turns. These
are observed follow-ups, not causal proof or new rules for the bot.

## Two-map comparison

The pilot uses seeds 48017 and 67153 with the same twelve leaders and settings
as the previous per-unit version. Each game completes turn 100. All seats use
the same policy within a game; this is not a mixed-policy tournament. Both
maps were used during development. No economic or deck settings changed.

| Completed turn 100, twelve seats | Previous per-unit | Candidate |
| --- | ---: | ---: |
| City captures | 8 | 8 |
| Total unit losses | 173 | 149 |
| Civilian losses in combat arrivals | 29 | 22 |
| Losses to barbarians | 68 | 66 |
| Immediate counter deaths | 14 | 7 |
| Counter deaths followed by an allied kill within two turns | 3 | 3 |
| Counter deaths followed by a city capture within two turns | 0 | 0 |
| Advances followed by death by the next turn | 2 | 7 |
| Attacks | 884 | 731 |
| Ranged attacks | 629 | 544 |
| Median recurring yields | 985.925 | 1,243.277 |
| Seats with at least 800 recurring yields | 7 | 9 |
| Mean score | 1,044.5 | 1,066.5 |

The candidate reduces civilian losses in this sample and retains the capture
count. It also makes fewer attacks and loses more units after advancing. The
whole result is mixed, not proof of stronger combat. Games diverge after a
changed decision, so the income gain cannot be assigned to this change alone.
The capture count does not establish faster captures.

The candidate still selects the original attacks on both captured private
boards. Every candidate score also matches in those two local reassessments.
It preserves the warrior's last damage and the swordsman's attack on Rayy's
walls. These checks do not replay the entire new game from those positions.

All four previous/candidate combat replays match the normal save loader
byte for byte. Both new games finish with no driver warnings. The
[evidence file](bot-combat-trades-evidence-2026-11-23.json) records the seat
metrics, source and artifact hashes, original decision checks and timing rows.

## Planning time

Each fixture runs a complete six-seat turn. The timer includes bot queries,
command execution and diagnostics, but excludes save loading. The order is
original, previous, candidate, candidate, previous, original. No other test or
benchmark ran alongside it.

| Saved turn | Original mean | Previous per-unit mean | Candidate mean |
| --- | ---: | ---: | ---: |
| War, turn 80 | 1,484 ms | 1,950 ms | 1,941 ms |
| Busy late game, turn 90 | 1,365 ms | 1,856 ms | 1,861 ms |

The candidate costs about the same as the previous per-unit version on these
fixtures. It remains about 31% and 36% slower than the original policy.
Both repeats have identical commands and final states for each policy. The
candidate and previous version also make identical decisions on both fixtures,
so this measures the extra checks without a different sequence of commands.
Two repeats are a small runtime sample, not a confidence interval.

## Remaining limits

- Civilian protection covers the acting unit's tile. It does not assign new
  escorts or plan the civilian's own escape.
- A retained melee forecast can identify a doomed guard. The evaluator does
  not search sequences where several enemies first kill the guard and then
  capture the civilian.
- Enemy paths come from the current board. Alternate origins improve coverage,
  but a hypothetical blocker can also change an intermediate path.
- The three remaining counter-death cases need an alternatives review before
  calling them mistakes. The audit's two-turn window can miss later benefits.
- Broader maps, mixed-policy games and work on interrupted-plan reuse remain
  necessary before promotion. Keep `tactics.enabled: 0` as the default.

The prior committed state is `bfb01201`. Port 5199 remains unchanged.

## Validation

Typecheck passes. All 575 core files pass, with 13,012 tests in 78 seconds.
The production build passes in 10 seconds with the existing large-chunk
warning. The four new focused tests cover civilian protection, killing the
threat, a trapped unit's last attack and cached alternate attack origins.
No slow suite, push or deployment was performed. All test, game and benchmark
processes finished before the commit.

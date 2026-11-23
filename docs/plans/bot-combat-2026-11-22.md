# Bot combat improvements, 22 November

The user approved the combat audit's implementation sequence. Start with
war-loss attribution, then target selection and position choice. Keep bot
preferences fixed while measuring each structural change. All selectable
leaders must appear in the comparison.

## Baseline and controls

- Use `de26f9c8`, save version 262. Handoff section 0.1j requires a fresh
  baseline after Claude's weaker-barbarian changes.
- Work in `/private/tmp/webciv-bot-combat-262` on `codex/bot-combat-262`.
- Preserve the baseline commit and frozen runner. Do not include the earlier
  unpromoted income or Scout experiments.
- Keep existing AI preference values, personas and difficulty unchanged.
- Reuse the five-map, six-seat schedule. Every selectable leader appears
  twice, with different seats and opponents. Record fresh baseline games;
  version-260 results cannot stand in for version-262 results.
- Use complete recurring income in measurements, including empire payments.
  This changes the recorder, not the bot's policy.
- Run heavy games and test suites serially. Keep the play server available.

## First change: the opponent's own losses

Use the simulation's existing `Player.warLosses` records. Count only losses
caused by this opponent, during the current war and inside the retained
weariness window. Report that window explicitly. Exclude losses to barbarians
and other opponents. Count each side's unit and town losses separately.

Derive the result from the saved state. Remove the old unsaved lifetime-counter
baselines from worker messages and frozen-plan memory. Loading a game or making
a worker copy must not reset the assessment.

Keep the current peace thresholds and army comparison. Correct the acceptance
explanation so it names the condition that actually decided the answer.
The general lifetime warscore remains a separate reading for now.

Tests cover opponent attribution, barbarian losses, expired records, a new war
after peace, city captures, worker copies and unchanged simulation state.
Compare original decisions and outcomes, not only a freshly repriced replay.

## Evaluation

Record science, culture, other yield rates, technologies, culture drafts,
official score, city captures and losses, unit losses, army size and peace
decisions. Keep eliminated seats in the results. Use shared checkpoints when
an early win prevents a turn-100 comparison. Report the early win separately.

The remaining combat work compares all legal attacks, then holding and moving
positions with expected retaliation. Keep searches bounded and deterministic.
Any preference introduced later belongs in `data/ai.json` and its bounds.

The handoff also identifies camp appraisal as stale under the new muster
chance and attack radius. Keep that as a separate measured change.

## Second change: compare legal attacks

- Compare visible barbarian and rival targets together. Keep the existing
  aggression, siege, ranged-first and healing rules for eligibility.
- Score useful damage minus counter damage, then add value for finishing a
  target. Use a separate penalty when the counter forecast can kill our unit.
- Add two tunable preferences: `military.targetRemovalValue` and
  `military.counterLossCost`. The initial trial uses fifty and one hundred
  score points. These are new controls; all earlier grid-search settings stay
  unchanged, including `cityCaptureValue`.
- Fold the existing certain-city-capture preference into the same target scan.
  Avoid scanning targets again after the choice.
- Use map order only to resolve equal scores. Keep every considered target in
  the spectator explanation. Mark only the selected candidate as chosen.
- Validate better exchanges, finishing attacks, terrain, city captures, mixed
  barbarian/rival targets, illegal shots, deterministic ties and worker parity.
- Freeze a separate runner and compare against the war-loss correction on the
  same five maps. New weights are trial settings, not a completed grid search.

The target scan also missed range bonuses. Mechanics grants the siege line
extra range, but the bot searched only the unit row's base range. `attackRange`
now supplies the forecast, attack scan, finishing-attack check and siege
approach. This is part of discovering all legal targets, not a balance change.

## Combat quality is the main objective

The user clarified that better defense can reduce captures. Judge combat
quality in played games, for attackers and defenders, rather than treating
more conquered cities as an automatic improvement.

Review representative encounters for:

- ranged shots taken and useful firing positions;
- damage traded, units lost and the strength of the units at risk;
- whether melee units protect ranged units and civilians;
- defensive terrain, fortification, healing and retreat;
- attacks on cities and the pressure defenders face;
- potentially missed shots or unsafe advances, with the information the bot
  could actually see when it planned.

Keep the all-leader comparisons, but use their aggregate figures as supporting
evidence. Replay actual encounters before judging the combat policy. Do not
call a loss avoidable solely because a command-only replay reveals a better
move after other players have acted on the frozen turn.

## Findings for the next candidate

The representative replay review is in
[the combat report](../audit/bot-combat-results-2026-11-22.md). It identifies
three gaps that need separate checks before the combat policy is promoted:

1. `planCombat` currently protects the forecast's attacker whenever the best
   attack roll can kill. The resolver protects only a blow that actually kills.
   The optimistic UI presentation is intentional and tested. Supply the bot
   with exact risk from the full roll bounds, rather than treating the display
   as a safety guarantee. Keep the combat rule, RNG and UI presentation unchanged.
2. `favourableBlow` ranks eligible attacks even when their score is negative.
   Compare them with holding. A rejected attack must not silently fall through
   into a camp or campaign move that leaves the same safe position.
3. A capture can be free in the immediate forecast and dangerous after the
   forced advance. Assess the landing tile against visible enemy threats on
   the original frozen planning board. Do not give the bot knowledge from the
   observer's replay.

After these, compare target threat and replacement value with raw damage.
The first-change comparisons include shots that deal more damage to a warrior
but leave a more dangerous swordsman untouched. Better raw exchange scores
are not sufficient evidence of better combat.

Ranged positioning also needs to verify a useful shot and an actual protective
position. Its existing score counts adjacent friendly melee units and distance
from the nearest visible enemy. It does not establish either fact.

Keep searches local and bounded. Preserve the original decision explanation
for reviewed turns, including refusals, so a later replay does not substitute
new knowledge for what the bot knew. Hold the earlier preference settings fixed.

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

## Third candidate: counter risk and holding

- `previewCombatRisk` uses the shared combat plan. Its maximum counter assumes
  the weakest attack roll. Survival protection applies only when that roll
  still kills. The UI keeps its existing optimistic preview.
- The healing exception uses this bound too. A possible kill must not cancel
  healing when the counter can kill the attacker.
- If a counter can kill, hold when its risk penalty outweighs the attack value.
  Stop later camp and campaign marches, including for a fortified unit that
  needs no new command. Healing and withdrawal can act earlier.
- Keep deliberate nonfatal siege trades and the ranking of safe targets.
  The first trial added an assault allowance to the score, but that changed
  an unrelated safe-target choice on turn 43 of seed 48017. Preserve that
  single-map trial separately and narrow the next candidate to counter risk.
  The defended-wall and ranged-first guards remain.
- Keep every earlier preference value fixed. Record original unit decisions
  with `BOT_AUDIT_COMBAT=1`, including the counter bound and refusals.
- Repeat the fixed all-leader schedule. Review actual fighting before deciding
  whether this candidate is better. Post-advance exposure is still separate.

## Army composition finding to verify

The declaration gate's `isSiegePiece` includes every ranged unit. An archer
therefore satisfies `war.siegePiecesWanted`; that setting does not require a
dedicated siege engine. Production has a separate siege share through
`military.mixCampaign` and `mixBonus`. Its default empty-share bonus is small.
This can explain how a large attacking army passes the declaration gate with
no siege engines, but does not yet establish why Mehmed never selected one.
Compare actual production choices and city damage before changing this policy.

## Next structural change: validate the planned defender

The counter-risk review reproduced a lethal stale attack on seed 48017,
turn 60. A plan targeted barbarian spearman 278 on one health. Mehmed's
swordsman 149 killed it and advanced before the command reached the live
board. The attack remained legal, so the bot sent it and lost its warrior.

Record the defender used by each planned attack. Before dispatch, check that
the live attack still targets that unit or the same city siege phase. If the
target changed, stop the unused plan and resume the existing live decision
loop. Do not send a known stale attack merely to get a reducer response.
Keep entity-id remapping, command budgets and accepted sitting marks intact.
Use the same check for workers, ordinary play and the spectator.

The first target-only trial reproduces that failure and fortifies instead.
It then exposes stale health: on turn 61 the same warrior plans with 61 health,
takes damage down to one health, and still sends its planned attack. A second
swordsman on turn 71 plans with seventy health and attacks with one left.
Both die to the counter. The original accepted decisions and actual replay
establish the health difference.

Extend the check to both combatants' health and strength from the shared
forecast. Replan when these combat facts change. Keep surrounding threats as
a separate position question. Record the number of replans and compare
original fights on the same map. This check must not scan the whole map or
invalidate plans solely because an unrelated city or bank changed.

Tests must cover a replaced unit, a changed siege phase, valid unchanged
targets, new ids, no mutation before a cut and completion through the live
loop. Preserve exact replay and worker/coordinator parity.

The completed check is on `codex/bot-combat-target-262`. The
[planned-attack report](../audit/bot-combat-targets-2026-11-22.md) records all
five games, original decisions, defensive exchanges, limits and passed tests.
Keep this as a separate checkpoint before changing position choice. The next
comparison must judge useful attacks, holding and retreat together, including
the tile a unit actually reaches this turn. Keep earlier preferences fixed.

## Position experiment after `1b596864`

The user approved continued work and explicitly said not to update port 5199.
Use `codex/bot-position-262`, with `1b596864` as the unchanged control.

Start by reproducing retreat losses from the original private planning boards.
Compare the chosen stopping tile with reachable alternatives and holding.
Use the shared movement and combat rules. Only enemies visible to the bot
at the original decision can supply threats. Give those enemies their next
full movement allowance. Treat a potential firing position as able to see the
target, so stale enemy visibility does not falsely mark a retreat safe. This
is a conservative threat bound, not a forecast of the enemy's chosen action.
Do not add independent attacks as if every enemy can use the same firing tile.

If a clear failure is reproduced, first improve the retreat destination.
Keep normal attack preferences and the healing thresholds unchanged. Bound
the local search, explain the selected position, and check actual games before
extending the same assessment to attacks or ranged positioning.

The first five reproduced retreats have no destination outside the possible
attacks of the visible enemies. Start with the earlier advance instead.
On seed 48017, turn 43, warrior 184 leaves a fortified position to finish a
five-health spearman. It spends forty health and an archer kills it that turn.
The original private capture matches the complete accepted command prefix.

An initial prototype added a narrow exposure penalty for certain field kills
and civilian captures. It compared holding with the landing tile after the
worst counter, including healing from a kill. It used the strongest independent
enemy attack, not a sum of attacks that might need the same firing tile.
It penalized newly lethal exposure and excluded city captures and units that
could act again after attacking. Its new penalty and limits were tunable;
existing preferences stayed fixed. This prototype is set aside, not enabled.

## Shared tactical evaluation: design discussion

The user proposed scoring tiles by accessibility, available attacks and enemy
attacks, including next-turn threats, with different priorities for ranged,
siege and melee units. Pause the narrow advance penalty while specifying this
shared structure. Its prototype and focused results are preserved separately;
the runtime and AI sheet remain at `1b596864`. Port 5199 stays unchanged.

The proposed evaluation scores an action sequence and its ending position.
A tile has reusable movement and threat facts, but its value also depends on
the unit, remaining health, attack target and job.

The user approved consolidation and research on 23 November. The
[research and implementation plan](../audit/bot-combat-research-2026-11-23.md)
now specifies the shared evaluator, bounded group search, enemy responses,
cache dependencies and validation sequence. It replaces the narrow advance
penalty as the implementation direction. Runtime remains at `1b596864`.

1. Keep the existing operational job: defend a city, escort, clear a camp or
   attack a city. Tactical choices must preserve an essential garrison or escort.
2. Generate legal choices from the shared movement rules: hold or fortify,
   move, attack, move then attack, and attack then move when allowed. Evaluate
   the forced advance after a melee kill. Unreachable choices are excluded.
3. Build reusable facts about possible firing positions and movement. For a
   small candidate set, use the shared combat forecast for exact strength,
   terrain, rivers, fortification and damage. Do not add terrain a second time.
4. Evaluate useful damage, removal of threats, damage received, loss risk,
   protection of allies, healing, progress toward the job and blocked allies.
   Do not reward a count of targets without considering their value or danger.
5. Use shared terms with data-driven role weights. Melee values holding a
   defensive position and safe finishing attacks. Ranged values useful shots
   from protected positions. Siege values wall damage, firing access and cover.
6. Choose and execute a useful action, then update affected facts before the
   next choice. Reuse geometry and unchanged readings within this lifetime.
   Enemy movement, deaths, health, fortification and line-of-sight changes must
   invalidate the affected assessment. The existing live attack checks remain.

Bound enemy responses. Only originally visible enemies enter the assessment.
Distinguish independent possible attacks from a feasible sequence: one enemy
cannot attack every friendly unit, and two enemies may need the same firing
tile. Use a small response search for close decisions rather than adding all
possible damage as though every attack happens. Record uncertainty explicitly.

Build and validate in stages: position facts; melee hold/attack/retreat;
ranged shot and move choices; siege positions and group action ordering.
Retain the current bot as a fixed control. Use exact tactical scenarios plus
the original-decision captures and the same all-leader games. Review useful
trades, city defense, civilian protection and ranged support as well as totals.
Tune role weights only after these structural comparisons are sound.

## Shared planner implementation

The user approved implementation on 23 November. Work is isolated on
`codex/bot-position-262`; the stable control is `1b596864`. The
[implementation record](../audit/bot-tactical-planner-2026-11-23.md) documents
the private position model, shared score terms, bounded response search,
worker dependency checks and validation results. Port 5199 stays unchanged.

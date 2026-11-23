# Shared combat planning: research and implementation plan

Status: researched design, not an enabled policy. Runtime control: `1b596864`.
Work branch: `codex/bot-position-262`. Do not update port 5199.

The user approved a consolidated approach on 23 November and asked for research
into other combat systems. Their proposed inputs were reachable tiles,
available attacks, incoming attacks and different priorities by unit role.
This document makes that direction concrete. Keep the earlier grid-search
preferences fixed while comparing structural changes.

## Findings from other systems

These are observations from primary documentation and source inspected on
23 November. They are architecture examples, not comparative performance tests.

- **Battle for Wesnoth:** its combat evaluation considers several units
  attacking one target. It values damage, kills and unit value, with costs for
  losses and exposure after attacking. This supports comparing short attack
  sequences, rather than choosing a target independently for each soldier.
  [AI aspects](https://wiki.wesnoth.org/AiWML#List_of_AI_Aspects).
- **Wesnoth's main loop:** it executes a candidate action, then evaluates
  again. Most default action categories still have fixed priorities. A priority
  list is not itself a fault; the combat choices inside it need sufficient
  information. [RCA AI](https://wiki.wesnoth.org/RCA_AI).
- **Unciv:** its attack candidates include both a target and an attack origin.
  It distinguishes city attacks from unit attacks, including whether the unit
  can capture the city. Its own comments identify limitations in predicting
  safe movement after an attack. We should reuse that candidate structure,
  without treating a legal attack as a safe final position.
  [BattleHelper](https://github.com/yairm210/Unciv/blob/master/core/src/com/unciv/logic/automation/unit/BattleHelper.kt).
- **Vox Populi, the Civilization V community mod:** its tactical search
  explores unit assignments with explicit limits. It accounts for blocked
  destinations and swaps, evaluates positions after attacks, and caches
  movement and attack queries. Its candidate pruning preserves both movement
  and ranged-attack options. This supports bounded local coordination and a
  diverse shortlist. This is not a claim about the unmodified Civilization V,
  VI or VII bots.
  [CvTacticalAI](https://github.com/LoneGazebo/Community-Patch-DLL/blob/master/CvGameCoreDLL_Expansion2/CvTacticalAI.cpp).

## Gaps in our current implementation

The paths below describe `1b596864`, not the proposed design.

| Area | Current behavior | Consequence |
| --- | --- | --- |
| Alternatives | `soldierCommand` asks healing, retreat, attacks and movement in separate branches. | A branch can select an action before the bot compares the alternatives on the same basis. |
| Attack origin | `favourableBlow` compares targets in range from the current tile. Movement choices use other helpers. | It cannot jointly compare a shot now with moving to a better firing tile. |
| Position after combat | The score includes the immediate counter, but not a shared assessment of the board after a kill or failed kill. | A cheap finishing attack can leave the attacker exposed. |
| Retreat | `fallBackAndHeal` chooses the first route toward a nearby home city. | A reachable destination can still have a dangerous stopping tile this turn. |
| Ranged protection | `screenMarch` scores nearby friendly melee units and distance from the nearest visible enemy. | Adjacency does not establish that a melee unit blocks an approach or protects a shot. |
| Coordination | Ranged deferral and screen-holding rules provide limited cooperation. | They do not compare competing firing tiles, attack order or combined kills. |
| Siege role | `isSiegePiece` includes all ranged units for campaign readiness. | Ranged support and effective wall damage can be confused. This needs measured review, not a name-based replacement. |
| Live execution | `frozenBoard` checks the direct attack target, health, strength and siege phase. | A new planner will also need to check the nearby units and paths that made its position attractive. |

Existing strengths should remain: shared movement costs, the combat ledger,
visible-target filtering, risk bounds, explicit garrison and escort duties,
live attack checks, deterministic execution and spectator explanations.

The retreat investigation also limits what we can conclude. Five reproduced
retreats had no destination outside the independent possible attacks of the
visible enemies. That bound does not prove every loss was unavoidable. It does
show why an earlier attack or advance needs review as well as the retreat.

## One tactical planner with separate responsibilities

Keep campaign selection and economic production outside this planner. They
choose the job and supply the force. The tactical planner chooses how the
available force carries out that job.

### 1. Build a local combat view

- Include our relevant units, cities, protected civilians, visible enemies,
  terrain, occupation and current movement allowances.
- Read actual movement, attack range, line of sight and combat strength from
  the simulation. Do not add a second movement or damage formula in the bot.
- Generate legal hold, fortify, move and attack candidates. Include movement
  before an attack and movement after it only where the rules permit them.
- Record the actual stopping tile this turn, health, remaining movement,
  attacks and fortification. A distant destination is not a stopping tile.
- Keep both possible outcomes when a melee kill is uncertain: the defender
  survives, or the attacker advances. Include city phases and kill rewards.
  Do not read the seeded RNG to predict a result. Do not label the midpoint
  forecast an expected value.

### 2. Score the resulting position with one ledger

Compare every candidate against the same initial position. Use named terms for:

- useful damage and removal of enemy combat capability;
- damage received and loss of our combat capability;
- protection of cities, civilians and exposed ranged units;
- progress toward the assigned job, including a camp cleared or city captured;
- useful firing access, healing and time needed to rejoin the fight;
- blocked friendly actions and exposed retreat routes.

Value losses by the unit's capability and replacement burden, not just a
constant per death. Promotions and a scarce siege unit can matter. Avoid
charging the same damage again as both an exchange loss and an exposure loss.
Cap useful damage by available health. Do not award repeated kill or capture
bonuses in a sequence.

Terrain and fortification already affect combat strength. Do not reward them
again merely because a tile has a hill or a forest. A positional reward must
represent another benefit, such as a protected firing opportunity.

Use common terms with role weights in `data/ai.json`:

- **Melee:** hold useful approaches, protect allies and finish valuable targets.
- **Ranged:** retain useful shots while reducing reachable enemy attacks.
- **Siege:** contribute to the current wall or garrison phase while staying
  protected and leaving a legal capture route for melee.
- **Mobile units:** use remaining movement and legal escape routes when their
  abilities allow it. A unit's capabilities determine its candidates.

Essential escort and garrison duties constrain candidates. Replacing a guard
with another unit can satisfy a duty; simply walking away cannot. Review which
existing guards are game-design requirements before converting them to weights.

### 3. Compare a few coordinated sequences

For a local engagement, keep a small number of promising partial plans. Extend
each with a legal action from any relevant friendly unit. This is a bounded
beam search: retain only the best few alternatives after each extension.

- Preserve at least one hold or retreat option as well as useful attacks.
- Compare ranged-first attacks, melee finishes and movement that opens a tile.
  Do not force one universal action order.
- Update occupation, movement, health and targets after each projected action.
  Two units cannot claim the same tile. A dead target cannot absorb more shots.
- Score the resulting group position, not only the sum of isolated action
  scores. Moving a blocker can be useful before it produces damage.
- Keep the unextended legal plan as a fallback when the search limit is reached.
  Resolve equal scores in a stable order and prefer holding over equal shuffles.

Start with short sequences involving a few interacting units. Do not search
complete empire turns or every permutation of a large army.

### 4. Test legal enemy replies

Use a cheap threat map to reject clearly poor positions and rank candidates.
For the shortlist, construct bounded, feasible enemy replies using the same
movement and combat rules. Separate a possible-attack bound from a reply plan.

- A unit may use only its legal number of attacks and movement points.
- Occupied attack origins and contested destinations constrain the reply.
- Account for enemies removed by our attacks and allies lost in a reply.
- Consider both focused attacks on an exposed unit and attacks on our objective.
  Do not assume the enemy chooses the target most convenient for us.
- Use only enemies known to the bot. Remembered unseen threats would require
  an explicit information model; do not consult their live hidden locations.

Our turns are simultaneous and commands resolve immediately. Model the
available response before our next opportunity to act. Distinguish an enemy's
remaining actions this turn from its allowance after the turn reset. A full
allowance for every enemy is a useful conservative bound, not the exact
schedule. Do not sum incompatible worst cases into a predicted damage total.

A hold is not automatically safe, and an attack is not automatically bad
because it loses a unit. Killing a dangerous enemy or protecting a city can
justify that loss. Compare the alternatives under the same response assumptions.

### 5. Execute one command, then refresh

Execute only the next command from the selected sequence. Reconsider the
sequence after its actual result. Preserve the operational job unless its
conditions change; do not preserve an obsolete tactical command.

The frozen-plan boundary needs dependencies beyond the direct defender. Check
the relevant occupancy, visible threats and movement or strength inputs before
execution. If these change, replan through the existing live path. An unrelated
bank or city update must not invalidate an unchanged local combat assessment.

## Performance and diagnostics

- Bound units, candidates, projected positions and enemy replies by explicit
  counts. Put trial limits and role weights in the AI sheet and its bounds.
  The generated arena must expose them without a page-specific edit.
- Use counts, not elapsed time, to decide which move wins. Machine speed must
  not change the command log. Wall-clock measurements are diagnostics only.
- Cache terrain and topology separately from occupation, zone of control,
  visibility, movement allowances, health and strength. Dynamic queries use
  the current local projection; an unchanged map does not imply unchanged reach.
- First use caches scoped to one assessment. Add reuse across assessments only
  with dependency tests. Do not introduce another broad empire-yield refresh.
- Record candidate counts, exact forecasts, response expansions, cache hits,
  elapsed planning time and fallback frequency.
- The spectator should explain the selected sequence and the best rejected
  alternative with their damage, exposure, objective and support terms.

## Build sequence and acceptance

1. Extract shared position facts and the score ledger. Run them alongside the
   unchanged policy on captured decisions. This stage changes no commands.
2. Replace separate melee attack, hold and retreat comparisons. Include actual
   landing positions and feasible responses, with the old policy as a control.
3. Add ranged movement and short group sequences. Include focus fire, a blocker
   moving first, a protected shot and a wounded unit being replaced in front.
4. Apply the same planner to siege phases and mobile-unit abilities. Retire
   superseded heuristics after their requirements have regression coverage.

Required scenarios include the reproduced turn-43 unsafe finishing attack;
a useful sacrifice; a kill that removes the main threat; an uncertain kill;
two attackers competing for one origin; a ranged shot opened by an ally;
safe retreat versus a shorter unsafe route; a threatened worker; a required
garrison; wall, garrison and capture phases; and an enemy moving between
planning and dispatch. Check fog, RNG isolation and unchanged source state.

After focused scenarios pass, compare the same five maps and thirty leader
seats against `1b596864`. Run heavy games serially. Review original decisions
and fights, including defensive successes, useful trades, civilian losses and
survival after advances. Keep score, income, research, captures and army size
as supporting measures. More captures or fewer deaths alone do not establish
better combat. Preserve exact replay and worker/coordinator parity.

Do not change production, diplomacy or earlier grid-search weights in the same
comparison. Do not claim the new planner is better until these games run.

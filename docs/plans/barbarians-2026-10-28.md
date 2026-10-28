# Batch BR1: barbarian camps keep two guards and send raiders at the players

**Status:** the spec, written 2026-10-28 before any agent starts. The user:
- *"one more thing: barbarians should be a lot tougher. They should spawn with 1-2 units by default"*;
- then: *"a camp should have 2 units nearby, any extra units should be sent to attack the players (ai included)"*.

## Today

- `foundCamps` (`src/sim/barbarians.ts`) founds camps from turn 6 (`rules.barbarians.firstCampTurn`), three every two turns, up to 24 on the board. A new camp is empty.
- `musterCamps` raises one unit at a camp every five turns (`unitEveryTurns`), never on the turn the camp is founded, while fewer than two of its soldiers stand within four hexes of it (`maxUnitsPerCamp`, `campUnitRadius`).
- `barbarianRoles` gives each soldier one job each turn, in this order: escort, **warden** (one a camp, the nearest soldier within `campUnitRadius`), thief, raider. The warden stands on the camp and digs in. A raider attacks a target within `aggressionRadius` (6) and otherwise wanders within `wanderRadius` (3) of the nearest camp.
- So a camp's first unit comes five turns after the camp, and raiders rarely go far from it.

## The rule

1. **A camp starts with its band.** When `foundCamps` founds a camp, the camp raises one or two units at once: a seeded roll on `state.rng`, in the same sweep, after the camp is placed. Each is the type `barbarianUnitType` gives for that camp, seated by `musterTileFor`. The first stands on the camp and digs in. The numbers live in the data: `rules.barbarians.campStartUnitsMin` (1) and `campStartUnitsMax` (2), or names in the file's style.
2. **They do not move on the turn they appear.** Today's rule says a camp must not appear and send a raider out in the same resolution. Keep it true: check the phase order in `src/sim/turn.ts`, and if the barbarians' moves run after `foundCamps`, make sure the new units stand still until the next turn.
3. **Two guards a camp.** Each camp keeps two soldiers near it: the warden (as today) and a second guard, the nearest soldier not already spoken for within `campUnitRadius`. A guard never goes farther from its camp than `campUnitRadius`. It fights what comes within reach, as a raider does today near its camp. The roles stay derived each turn in `barbarianRoles` (CLAUDE.md: never store a role). The guard pass runs where the warden pass runs, after escorts and before thieves.
4. **Every other soldier is a raider, and raiders go after the players.** A raider marches on the nearest town of a real player (`realPlayers`), human or bot. It no longer waits within `aggressionRadius` or wanders near its camp. On the way it attacks what today's raid logic attacks once in range. The wild still never captures a city or a unit. A seat whose law makes the barbarians passive (Wolf-Mother's Pact, `barbariansPassive`) is never a target, as today.
5. **A camp keeps raising units.** The cap of two (`maxUnitsPerCamp`) now counts a camp's guards only. A camp with two guards still musters on its cadence, and the new unit is a raider.
6. **Reading 1: a limit on raiders across the world.** Without one, camps that cannot reach a town (an island camp, say) would pile up raiders for ever. The limit is two raiders for each camp on the board, counted over every barbarian raider (`rules.barbarians.raidersPerCamp`, 2). While the world holds that many, a camp with its two guards does not muster. Thieves and escorts count as raiders for this limit.
7. **Reading 2: the target.** "The nearest town" is by the same distance the barbarians use today, among towns a raider can reach by land; ties go to the seat earlier in `realPlayers` order. A raider re-chooses each turn, so it turns to a nearer town when it meets one.
8. **Readers of the old roles and caps:** a card or a bot may assume one warden a camp, raiders that stay near camp, or a camp that starts empty (The Hunting Grounds, the bots' camp-clearing appraisal and threat reading, The Pacified Marches, any test). Find them and keep each correct.
9. **Everything else stays:** the five-turn cadence, the spacing rules, the clearing reward, the combat bonus (+2) and the unit types by era.

## Not in this batch

For the playtest to judge: the cadence, the combat bonus, the unit types, and the two numbers above (guards and raiders a camp).

## Schema and checks

- Schema 203 (it is 202 after batch R2c), with the changelog entry beside `SCHEMA_VERSION` in `src/sim/state.ts`.
- The explore digests move, because camps appear by turn 6. The digest control as in batch R2a: show that with the old schema number and the change switched off the old pins hold, then re-pin with the reason.
- A barbarian test game: in a short seeded game with a bot seat, raiders from a camp beyond `aggressionRadius` reach and attack a bot's town.
- The six-seat bot digests (`test/sim/aiDigest.slow.test.ts`) move too; they are re-cut at the push gate. The bots will lose more to barbarians; the push gate's slow tests (`aiBot.slow.test.ts`) may need a look.

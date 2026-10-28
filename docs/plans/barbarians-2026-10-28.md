# Batch BR1: a barbarian camp starts with its band

**Status:** the spec, written 2026-10-28 before any agent starts. The user: *"one more thing: barbarians should be a lot tougher. They should spawn with 1-2 units by default"*.

## Today

- `foundCamps` (`src/sim/barbarians.ts`) founds camps from turn 6 (`rules.barbarians.firstCampTurn`), three every two turns, up to 24 on the board. A new camp is empty.
- `musterCamps` raises one unit at a camp every five turns (`unitEveryTurns`), never on the turn the camp is founded, while fewer than two of its soldiers stand within four hexes of it (`maxUnitsPerCamp`, `campUnitRadius`). The first unit stands on the camp and digs in (the warden); later ones stand beside it and go raiding.
- So a camp's first unit comes five turns after the camp, and its second five turns later.

## The rule

1. **A camp starts with its band.** When `foundCamps` founds a camp, the camp raises one or two units at once. The number is a seeded roll on `state.rng`, in the same sweep, after the camp is placed.
2. **The same pieces as a muster.** Each unit is the type `barbarianUnitType` gives for that camp, seated by `musterTileFor`. The first stands on the camp and digs in, as the warden does today. The second stands beside it.
3. **They do not move on the turn they appear.** Today's rule says a camp must not appear and send a raider out in the same resolution. Keep that true: check the phase order in `src/sim/turn.ts`, and if the barbarians' moves run after `foundCamps`, make sure the new units stand still until the next turn.
4. **The numbers live in the data:** `rules.barbarians.campStartUnitsMin` (1) and `campStartUnitsMax` (2), or names in the file's style.
5. **Everything else stays:** the cap of two, the five-turn cadence, the spacing rules, the clearing reward and the combat bonus. A camp that starts with two units is at its cap, so it musters again only when one of them leaves or dies. That is today's rule.
6. **Readers of "a new camp is empty":** a card or a bot may assume a camp is unguarded when it is founded (The Hunting Grounds, the bots' camp-clearing appraisal, any test). Find them and keep each correct.

## Not in this batch

The other levers of "a lot tougher", for the playtest to judge: the cap of two units a camp, the five-turn cadence, the barbarians' combat bonus (+2), and the unit types by era.

## Schema and checks

- Schema bump (next free number), with the changelog entry beside `SCHEMA_VERSION` in `src/sim/state.ts`.
- The explore digests move, because camps appear by turn 6. The digest control as in batch R2a: show that with the old schema number and the change switched off the old pins hold, then re-pin with the reason.
- The six-seat bot digests (`test/sim/aiDigest.slow.test.ts`) move too; they are re-cut at the push gate.

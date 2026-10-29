# Batch R3: the user's Scientific comments of 2026-10-28

**Status:** the spec, written 2026-10-28 before any agent starts. The user left six comments on the Scientific tab of the review page (version 17, "Deck sheets" group), a few minutes after the Devotion comments that became batches R2a to R2d (`docs/plans/devotion-review-2026-10-28.md`). Each comment is quoted below with the card it sits on. The readings are the orchestrator's; each stands until the user changes it.

## The changes

| Card | Where | The comment | The change |
|---|---|---|---|
| The Scribes' Hall | Scientific, Tier 0 | *"move to tier 1"* | Tier I. |
| The Long Study | Scientific, Tier 0 | *"move to tier 1"* | Tier I. |
| The Sky Watchers | Scientific, Tier 0 | *"move to tier 1"* | Tier I. |
| The Prize Essay | Scientific, Tier 0 | *"remove, too similar to royal workshops. Let's add a new card: while you hold a non-charter technology that no other empire has researched: +20% culture and +20% food in your capital."* | Retired, and The Kept Secret is new (below). |
| The Curators of Works (new) | Scientific, Tier 0 | *"add: +1 science and +1 happiness from public works (granaries are included in this right?)"* | New card. |
| The Mountain Observatories (new) | shared with Expansionist, Tier 0 | *"add: cities with a mountain tile gain +3 science. Shared with expansionist."* | New card. |

Retired rows keep `retired: true` and stay in the data for saves. Moved cards keep their text, rarity and type.

**The user's question about granaries.** Yes. The game's public works are the rows marked `publicWork` in `data/buildings.json`: the Granary, the Aqueduct, the Watermill, the Harbour, the Public Bath and the Cistern (`isPublicWork`, Expansionist batch E11).

## The new cards

| Card | Tier | Rarity | Type | Text |
|---|---|---|---|---|
| **The Kept Secret** | 0 | uncommon | Civic | While you know a technology no other empire knows, your capital gains +20% food and +20% culture. Charter technologies do not count. |
| **The Curators of Works** | 0 | common | Civic | Public works give +1 science and +1 happiness. |
| **The Mountain Observatories** | 0 | common | Civic | Cities with a mountain in their borders gain +3 science. |

- **Names** (the orchestrator's; the user did not name them): the secrets a workshop or a state kept from its rivals, as Byzantium kept Greek fire; Rome's curators of public works (*curatores operum publicorum*); and the observatories raised on high ground, from Maragheh to the Andes.
- **Reading 1:** The Kept Secret is uncommon, because a capital share of food and culture is large in Tier 0. The Prize Essay was common.
- **Reading 2:** "a mountain tile" is a mountain hex inside the town's borders (the town scope `terrainInBorders`). The Expansionist card The Mountain Schools (+15% science for towns with two mountains in their borders) reads the same ground; the two stack.
- **Reading 3:** "+1 science and +1 happiness from public works" pays each town +1 science and +1 happiness for each public work in it.
- Flavour lines: write one for each, in the style of the deck's rows, labelled Flavour as always.

## Shapes

- **The Kept Secret needs one new empire condition**, approved by the user's request: the empire knows a technology that no other real player (`realPlayers`) knows, charter technologies left out (`isCharterTech`, as `columnReached` leaves them out). It joins `EmpireCondition` (`src/sim/statecraftData.ts`), its arm in the evaluator, its words in the describers, and the bots' reading of conditions. The +20% shares are the capital's percentages, at the stage the deck's other capital shares use.
- **The Curators of Works** is a town line counted by the public works inside the town. The `publicWorks` count exists for the empire; if it has no form for one town (`within: 'city'`), add it. Under batch R2b's rule, a line counted by a kind or a category of building inside the town is on each building it counts. Extend that rule to a count of buildings by a marker (public works), so that the line's science sits in each public work's package and a doubler on that building reaches it. Happiness is a meter, not a yield, so it pays the town and is not in a package.
- **The Mountain Observatories** is a city line under the `terrainInBorders` scope for mountains. If that scope cannot name mountains, stop and report; do not bend a near fit.

## Sheets and docs

- `docs/decks/scientific.md` is the spec of record: move, retire and add the rows there (the retired row to its retired section), and update its count tables. The shared row goes on `docs/decks/expansionist.md` too. `docs/orders-and-doctrines.md` mirrors the data. Their sync tests must pass.
- The bots price the new rows from their effects; the new condition needs a reading in the bots.
- Add a "Built" note to this file's end when the batch passes the gate.

## Schema and checks

- Schema 205 (it is 204 after batch R2d), with the changelog entry beside `SCHEMA_VERSION` in `src/sim/state.ts`.
- The explore digest control as in batch R2a.
- Tests: the moves and the retirement; each new card on a small board; The Kept Secret on and off as a rival learns the technology, and a charter technology never counting; a doubler on a Granary reaching The Curators of Works' science; every new row printing a line in the hand (the Z3 register test).

## Built

- **R3 (2026-10-29):** as planned. The gate passed: the type check, 10,180 core tests and the build. Schema 205.
  - **The cards:** The Scribes' Hall, The Long Study and The Sky Watchers are at Tier I; The Prize Essay is retired. New: The Kept Secret ("while you know a technology no other empire knows (charter technologies do not count): +20% food in your capital; +20% culture in your capital"), The Curators of Works ("+1 science" and "+1 happiness in every city per public work standing there") and The Mountain Observatories, shared with Expansionist ("+3 science in every city with a mountain hex inside its borders"). The Scientific tiers hold 9, 20, 20, 16 and 13 cards; the game deals 617 Orders.
  - **The new condition** `knowsUniqueTech` (one function, read by the card and by the bots' `conditionIsLive`): the seat knows a technology no other real player knows, charter technologies left out. Two readings the agent took: empires the seat has not met count (the user wrote "no other empire has researched"), and an eliminated empire still counts; the barbarians never do.
  - **The public works:** the `publicWorks` count already had a town form. A line counted by public works inside the town is now on each public work (`cardLinesOnBuilding`), so a doubler on a Granary reaches The Curators of Works' science. Happiness pays the town's meter and is in no package.
  - **A test leak fixed:** `buildingPackage.test.ts` changed a technology's effects and put back only the row, so the `anyCardDef` cache kept the change and `cardTextSnapshot.test.ts` failed when it shared a worker. The test now puts back the cached copy too.
  - **A bot test:** `aiWants.test.ts`'s shared fixture plays six turns, not four: the new pools change what the seats draft, and the focus decision moved a turn later.
  - **The explore digests** moved only by the schema number.

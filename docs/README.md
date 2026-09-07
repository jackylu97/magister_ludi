# Docs — the shelf

**Reference docs** (technical-document voice: current state, bulleted,
data-pointing; each says what it is at the top):

| doc | what |
|---|---|
| `design-notes.md` | the design ledger, condensed — CURRENT state + doctrines |
| `design-history.md` | the unabridged 65-entry ledger (cited entry numbers live here) |
| `flags.md` | every open ruling, deferred row, and live thread |
| `design-specimen.html` | the interface's design language (ink/parchment, the four faces) |
| `tech-tree.md` | the tree — determinations + regenerated as-built tables |
| `tree-worksheet.md` | the user's tree canvas (design record) |
| `themes.md` + `themes/` | the gameplay themes and per-theme worksheets (the user's) |
| `beads.md` | the Bead Race model (cards live in `data/beads.json`) |
| `orders-and-doctrines.md` | the Statecraft master worksheet (sync-tested against data) |
| `orders-candidates.md` | candidate Orders and the rarity proposal |
| `wonders.md` | the wonder framework rules (rows live in data + Compendium) |
| `great-people.md` | renown, legacies, Triumphs — the machinery |
| `religion-v2.md` | the tide, the clergy, the pools — the machinery |
| `trade.md` | caravans, roads, connections — the machinery |
| `luxuries.md` | the resource table and its effect vocabulary |
| `yields.md` | the sequence of record — the order every yield is computed in (sync-tested against the source) |
| `mapgen.md` | the generator, pass by pass, every tunable |
| `war-diplomacy.md` | the war/diplomacy v1 worksheet (in design) |
| `codex.md` | generated card-pool grid (`npm run codex`; never hand-edit) |
| `city-screen.md` | the city screen's usability pass (spec of record) |
| `pamphlet.md` | the pamphlet and the tutorial flow (spec of record) |
| `bot-priorities.md` | the priority system — the bot's spec of record |
| `early-pacing.md` | the opening's pacing readings |
| `fewer-things-plan.md` | the live batch plan (fences, schemas, batches as shipped) |
| `balance-turn.md` | every Order weighed against the turn-92 empire — DRAFTED, awaiting your markup |
| `audit/` | the 2026-09-06 read-only audit: bonuses, simplify, dead code, and the orchestrator's fix queue |
| `art-pass.md` · `splash-art.md` | art direction |
| `playtest_notes.md` | the user's running playtest notes |

`history/` holds working docs whose rulings are now code, and the schema
changelog that outgrew `src/sim/state.ts`. `deprecated/` holds superseded
working docs with the master each points to.

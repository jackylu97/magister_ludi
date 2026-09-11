# Audits

**This folder is history, not current state.** Each file is one finished
read-only pass: what was measured, what was found, what the fix queue was, and
what landed. Nothing here is authoritative about how the game works today — the
reference docs on `docs/README.md`'s shelf are.

It stays at `docs/audit/` rather than moving under `docs/history/` for one
reason: dozens of docblocks in `src/sim/`, `src/ai/`, `src/ui/` and `test/` cite
these paths as the argument behind a shape, and those citations are outside a
docs pass's fence. Read one only when a comment sends you to it.

| file | the pass |
|---|---|
| `bonuses.md` | every bonus in the game, counted and classified |
| `simplify.md` | the reuse/simplification sweep |
| `dead-code.md` | what nothing reads — including the doc-shelf fold of batch H4 |
| `deferred-rows.md` | every row shipping with a struck half, and what shape each waits on |
| `evaluations.md` | the yield pipeline read end to end; the argument behind `src/sim/yields/` and the three verbs |
| `e5-yield-shape.md` | the merge of eight yield kinds into one `pays` with `where` × `basis` — **cited by CLAUDE.md as the live reference for that shape** |
| `legibility.md` | what a player can and cannot read off a surface |
| `test-suite-speed.md` | where the suite's time goes |
| `orchestrator.md` | the fix queue the audits fed |
| `bot-pass-2.md` | the second bot pass |
| `wager-worksheet.md` | the cut/keep list and bench behind `docs/wager.md`; a docblock citing "`docs/wager.md` §1–§11" means **this file's** numbered sections |

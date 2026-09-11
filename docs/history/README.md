# History

Working docs whose rulings are now **code**, plus the changelog that outgrew its
source file. Nothing here is authoritative and nothing here is current state —
these are the record of how a ruling was reached, kept because the reasoning is
worth more than the proposal. Folded 2026-09-07, batch H4
(`docs/audit/dead-code.md` §2.2 and §4.2).

Current state lives on `docs/README.md`'s shelf. A doc that still awaits your
markup, or that a live plan reads as its spec, stays there — not here.

| file | what it was | where it landed |
|---|---|---|
| `schema-changelog.md` | every bump from Milestone 3 to v78 | was a 1443-line docblock in `src/sim/state.ts`; the current entries stay there |
| `card-shapes.md` | the deck-as-identity pass, 2026-09-04 | built, schema 61 |
| `cards-pass-2.md` | the row-by-row read of the built pools, 2026-09-05 | built, schema 68 |
| `age-three.md` | the Æra III fork — tier-18 governments, Pool III, the world age | built, schema 70 |
| `loop-review.md` | the engine view, the synergy pass, the breadth audit | built, schema 67 |
| `doctrine-ideas.md` | three pitch sheets (doctrines, orders, great people), 2026-09-03 | drawn from; the rows that survived are in `data/statecraft.json` |
| `bot-audit.md` | the first in-depth bot pass, 2026-09-04 | superseded by `docs/bot-priorities.md` |
| `tech-gifts.md` | every node's gift after the cut | built, schema 76 |
| `orders-pass-3.md` | every Order's verdict and the deck's grammar | built, schema 77 |
| `fewer-things.md` | the choice-size pass — buildings, religion, shapes, cadence | built, schemas 71–78 |
| `orders-and-doctrines-as-built.md` | the "As built" notes each Statecraft pass left on the worksheet, 2026-08-28 → 2026-09-07, and the Government VI pool that was only ever a proposal | built; the live tables are `docs/orders-and-doctrines.md` |
| `design-history.md` | the unabridged entry ledger, Entry I → LXXI | the condensed current state is `docs/design-notes.md`; cited entry numbers resolve here |
| `flags-log.md` | every ruling of `docs/flags.md` that is resolved or built, whole and unedited, item letters kept | citations like "(pppp)" resolve here |
| `bot-priorities-log.md` | the bot's batch-by-batch measurement narrative, 2026-09-04 → 2026-09-10 | the spec of record stays at `docs/bot-priorities.md` |
| `fewer-things-plan.md` | the choice-size batch plan (A–H19) | built, schemas 61–86 |
| `balance-turn.md` | every Order weighed against a turn-92 empire, with the user's markup | the cuts landed; the live tables are `docs/orders-and-doctrines.md` |
| `early-pacing.md` | the opening's pacing readings and the proposals they drove | built; the figures are in `data/rules.json` |
| `great-people-history.md` · `trade-history.md` · `yields-history.md` · `city-screen-history.md` | the bench runs, renames and overridden redesign cut out of four reference docs on 2026-09-11 | the rules stayed in the references |

Each of the last eight left a one-paragraph redirect at its old path, because
docblocks and tests across the tree cite it.

`docs/deprecated/` is the neighbouring drawer, for a doc that a *later* doc
supersedes rather than one the code caught up with.

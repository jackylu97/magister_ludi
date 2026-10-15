# Deprecated

Superseded working docs, kept as the record of how a ruling was reached. Nothing here is
authoritative; the master for each is named beside it. Moved 2026-08-29.

| file | superseded by |
|---|---|
| `religion.md` — v1: the pantheon and the augur (shipped, Entry XXVIII) | `docs/religion-v2.md` (prophets, religions, spread — as built) |
| `statecraft-cards.md` — the Æra I–II Statecraft working doc, fourth pass | `docs/orders-and-doctrines.md` (the master list) |
| `statecraft-ages-3-5.md` — the later pools, first draft | `docs/orders-and-doctrines.md` (its Æra III–V tables) |
| `playable.md` — the playable-loop plan of 2026-08-23 | executed; `docs/design-notes.md` Entries XVI–XLVII |
| `veins.md` — the vein layer, SHELVED 2026-09-06 | nothing yet. The code is intact and the shelving is one number (`data/mapgen.json` `veins.share = 0`); this doc **is** the drawer it went into. Moved here 2026-09-07 (batch H4) |
| `orders-candidates.md` — candidate Orders and the rarity proposal. Moved 2026-09-11 | `docs/orders-and-doctrines.md` (the master list) and `src/sim/statecraft/draft.ts` (the rarity draw and the skip's pity) |
| `tree-worksheet.md` — the user's tree canvas, revision 3, with the rationale per node. Moved 2026-09-11 | `docs/tech-tree.md` (the as-built reference, Part 2 generated) and `data/techs.json` (the drawn lanes and columns, as data) |
| `tutorial-redesign.md` — the tutorial plan of 2026-09-14, never built. Moved from `docs/plans/` 2026-10-14 | `docs/plans/tutorial.md`, which carries forward its architecture, interface contract and storage rules (and cites its §§5, 6 and 9 for the detail); its lesson copy predates the decks |
| `pamphlet-draft.md` — the pamphlet's second edition, a working draft of 2026-09-14, never built. Moved 2026-10-14 | `docs/plans/tutorial.md` §5.2 (a six-page pamphlet for the deck game); `docs/pamphlet.md` stays the spec of the pamphlet that ships today |

Both of the 2026-09-11 moves left a one-paragraph redirect at the old path,
because docblocks and tests across the tree cite it. The 2026-10-14 moves left
none: nothing in the code or tests cites them.

Earlier consolidations went further and *deleted* rather than moved: `ages.md`,
`mythic-sciences.md`, `tech-tree-ages-2-5.md` and `tech-unlocks.md` live in git history and
in `docs/tech-tree.md`.

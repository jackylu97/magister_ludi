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

Both of the 2026-09-11 moves left a one-paragraph redirect at the old path,
because docblocks and tests across the tree cite it.

Earlier consolidations went further and *deleted* rather than moved: `ages.md`,
`mythic-sciences.md`, `tech-tree-ages-2-5.md` and `tech-unlocks.md` live in git history and
in `docs/tech-tree.md`.

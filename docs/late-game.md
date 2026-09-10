# The late game — Æra IV and V (worksheet, 2026-09-10)

A worksheet in the `wager.md` shape: what exists is stated with its data key,
▢ is a decision still open for the user, (rec) is the orchestrator's default
and stands unless overruled. Nothing here flies until the ▢ are marked and a
batch is cut on the flags board. The user edits this file directly.

Where it came from: the design conversation of 2026-09-10 (the bead ledger
after Q1, the ages' identities, the occult and the renaissance-punk).

## 0. The arc

| Æra | Name | Period | What the age is for |
|---|---|---|---|
| I | Omens | the Bronze Age | expand, unlock luxuries, found a pantheon |
| II | Heroes | the classical world | trade routes, expansion, religion, great people |
| III | Empire | Rome and the Han | empire building, committing to a playstyle, empire-wide infrastructure |
| IV | Cathedrals | high medieval into early Renaissance — Magister Ludi's own time | **scale what is built** (the chips are down; raise the multiplier) and **play for the win** |
| V | ▢ name | the 1500s as Leonardo's notebooks imagined them — renaissance-punk | **extremely powerful units and bonuses**, and **explicit actions that mint beads**: "why haven't you won yet?" |

The mystic thread of Æra I and II (omens, pantheons, rites) returns in IV and V
as the **occult**: the four stages of the Great Work, the homunculus, the
philosopher's stone, the elixir, perpetual motion, the comet.

## 1. What Æra IV introduces today (`data/techs.json`, age 4 — 15 nodes)

- **Multipliers**: University (science per citizen), Bank (+20% gold where
  routes end), Printing House (routes ending here bring science and culture),
  Bourse, Mint, Bazaar (gold per luxury kind), Observatory, the Alchemical
  Society, the Garden (T5). The "increase the mult" half — already the spine.
- **Holding what was built**: Castle, Armoury, Courthouse (captured towns
  only), Divine Right's meter rule, the Inquisitor, the Reliquary.
- **The last military step**: Crossbowman, Pikeman, Longswordsman, Trebuchet,
  Knight, the Astrolabe's three hulls; The Fire Lance at Alchemy (80).
- **The endgame**: three wonder beads (Chart the Stars, The Turning Heavens,
  The Codex), The Closing Work at Alchemy, the Æra IV wager, the Opus door at
  `rules.threshold` 7 (`data/beads.json`).
- **The gap**: the only ways to play for the win are one wager and four
  one-seat grants that all sit on the science line. A culture or conquest
  realm has nothing to point its late game at.

## 2. Æra IV — the four stages of the Great Work (projects that mint beads)

The user: *"I like the idea of unlocking era 4's projects as an additional bead
source (allows those that didn't win wagers to 'come back')."*

- **Four city projects**, one per family, named for the alchemical stages —
  ▢ **Nigredo** (conquest / the levy), **Albedo** (faith), **Citrinitas**
  (gold), **Rubedo** (science) — each a queue row a city pours production into
  (the `ProjectDef` shape; a **cost** rather than a rate — projects keep a flat
  `cost`, `docs/production-costs.md`), unlocked ▢ by an Æra IV node each, or
  all four by one.
- **They pay beads, not yields**: (rec) **1 bead to any realm that finishes
  one; 2 to the first realm in the world** (the wager's own 2/1 economy with
  no stake and no malice — the come-back road). ▢ or 1 flat. Once per empire
  each. A new `ProjectPayout` kind (`bead`) beside gold/science/faith/culture,
  announced as an occasion so the Abacus flips and the beads mint through
  `awardBead`.
- **Long**: ▢ 1500–3000 hammers at Æra IV costs, so a wide production realm
  and a tall one can both reach them, and neither in a hurry.
- **Visible**: the Abacus shows which stage each rival has finished (a fifth
  row under the wagers); the deal sheet is untouched.
- ▢ **A second door** (rec): the Opus opens at the bead threshold **or** to a
  realm that has finished all four stages — every alchemical text says the
  Work has four stages. Two roads to one door: the leader's and the patient's.

## 3. Æra V — Leonardo's future

▢ **The tree**: five or six nodes after Alchemy; the lanes are the user's
chart and are not proposed here. What sorts into them once drawn:

- **The Opus moves here** (rec; the user: *"still considering"*): Alchemy
  closes Æra IV with The Closing Work; the Magnum Opus is Æra V's capstone at
  the end of its short tree, so the fifth age has a beginning, a middle and an
  end. The Fire Lance goes with Alchemy as the age's first unit; Æra IV's
  capstones become the Knight and the Longswordsman.
- **Units from the notebooks** (rows on shapes that exist): the three hulls
  already "awaiting a node" — Corvette 78, Ship of the Line 88, Frigate 66/80;
  ▢ a Musketeer (~70) and a Bombard (~45/70) to complete the land side; the
  **Ornithopter** (a flying scout: ignores all terrain, cannot fight); the
  **Armoured Cart** (siege that ignores zone of control); the **Brass Knight**
  (an automaton bought with science, no upkeep — the Reliquary's shape with a
  different bank); the **Golem** (faith-built, never leaves its city — the
  holy city's defender); the **Diving Bell** (a hull that works water
  resources the city could not reach).
- **Buildings as instruments**: **Uraniborg** (science per citizen, the
  Observatory's heir); the **Homunculus Vat** (faith paid again as science;
  ▢ or the fifth family — the *Artificer*, a great person *made* by spending
  faith and science together, whose works are machines); the **Camera
  Obscura** (the census made permanent: every rival's figures always
  visible); the **Perpetual Clock** (every periodic effect comes sooner and
  pays more — The Great Clock as a building); the **Wunderkammer** (renown
  and culture per great person's work standing in the realm); the
  **Perpetuum** (a wonder: its city's overflow never caps and every completed
  thing feeds the next — the Vizier's Hall's big sister).
- **The closing actions** — explicit, cheap for a realm already scaled, one
  per family, each **once per empire, one bead**, each a project or a verb:
  **Transmutation** (gold into a bead — the Philosopher's Stone as a verb),
  **The Elixir** (faith into a bead; ▢ and a realm-wide heal or a permanent
  happiness), **The Grand Oration** (culture into a bead), **The Great
  Enquiry** (science into a bead). ▢ figures. These are the "why haven't you
  won yet".
- **Æra V deals a wager** like the others (the deck's fourth column) — ▢
  bars; candidates for Æra V-only cards: **The Great Voyage** (a hull of
  yours has visited a harbour of every living empire — the sea build's last
  card, about the map rather than a meter), **The Flight** (ornithopters
  standing), **The Printing of the World** (routes' science and culture).
- **The Comet**: a world occasion on the clock (the census's stranger
  cousin) — when it passes every seat draws a timed omen, a boon or a malice
  for ten turns, read together as the census is. Occasion + `Player.timed`,
  shapes that exist.
- **Faust's bargain**: a doctrine that trades a permanent malice for a large
  immediate gain — the one card a desperate seat takes.
- **The door**: with a fifth wager (≤ 4 beads), four stages (≤ 8 on the
  come-back road), four closing actions (4) and the science grants (4), ▢ the
  Opus threshold moves from 7 to about **10** so the door is an Æra V question
  rather than already open. (rec) measured on the bench as Q1 did.

## 4. Batches (proposed cut)

1. **G4 — the four stages**: four projects, the `bead` payout, the Abacus row,
   ▢ the second door. Data + one payout kind.
2. **A5 — the fifth age**: the user's node chart first; then units, buildings,
   the closing actions, the Æra V wager column, the Opus move, the threshold.
   Schema (the tree changes).
3. **C2 — the Comet**: occasion + timed omens; a later, small batch.

Nothing here is built. The user's marks on this file are the spec; agent
briefs point at it.

# Beads — the win condition's catalogue (working doc, 2026-08-29)

The Bead Race is the ruling (design-notes Entry VI: one unified condition, glass beads across
four families, ~30 in a game, every bead an announced event; first to N wins, otherwise most
at the curtain; the last bead is **golden** and only the Magnum Opus mints it). This doc is
the *content* — what a bead can be — and the drafting model the user asked for on
2026-08-29. Companions: `docs/tech-tree.md` Part 6 (where the ages put victory) and Part 3
(the Æra V accelerants that name beads). **Nothing here is scheduled**; `data/beads.json` does
not exist yet. The user's rulings are in **bold** the first time they appear.

## The model

**Three kinds of bead** (Entry VI's three sources, unchanged):

| kind | what | how it scores |
|---|---|---|
| **feat** | a first in the world | the first seat to do it, once per game (or once per age where marked) |
| **objective** | a public goal, dealt from the deck | *first to* … · *hold for N turns* … · *most at a reckoning* … (below) |
| **age-close** | the leader in each family's standing count when an age closes | one bead per family per age |

**The deck, and how it deals** (user, 2026-08-29):

1. **Objectives are drafted every turn, and revealed per age.** At game start the world
   shuffles one deck per age (III, IV, V — Æra I–II have feats and age-close only; the deck is
   `state.rng`, so a seed is a deal). **Each turn the world draws one card off the deck of the
   age the world is in** and places it face down in that age's *hand*; the hand is dealt over
   the age rather than all at once, so the pressure builds and a late deal is still a full
   deal. Every seat sees the **same** cards — Entry II's fairness: public, identical for all.
2. **A card is revealed at the opening of its age** — every card already in that age's hand
   turns face up the turn the age opens, and each card drawn *after* the opening turns face up
   the turn it is drawn. So an age's objectives arrive as a stream: the first few the moment
   the age opens, the rest one a turn until the hand is full (the hand size is per age,
   `handSize` in data — 3 / 4 / 5 is the first guess).
3. **Objectives persist for the rest of the game** — an age's opening **unlocks more; it never
   closes the last age's.** A "first to" card stays on the table until somebody claims it; a
   "hold for N turns" card can be earned in any later age; a "most at a reckoning" card is
   reckoned at **every** age close from its own age on, and pays again each time (so it is
   worth up to three beads to a seat that keeps the lead — the standing-count beads' bigger
   cousin). This is what keeps a high-science build honest: rushing into Æra IV does not
   forfeit Æra III's table, it adds to it.
4. **Whose clock opens an age?** Recommended: **the world's** — the first seat to enter an
   age opens that age's hand for everyone. The alternative (each seat's own age reveals the
   cards to that seat alone) breaks fairness, since a seat could act on a card the others
   cannot see. With the world clock, the science leader *sees* nothing sooner than anyone,
   but is the one who chose when everyone sees it — that is a real, legible advantage without
   hidden information. **The Long Count** (Æra II) shows the next age's hand a turn before it
   opens; **The Obsidian Mirror** (Æra V) shows every seat's progress on every card.

**Two rules every card obeys** (Entry VI.5, the user's own): a bead is a **claim on the
world, never a bank statement** — no "accumulate X gold"; every card names something
*visible and contestable* by the other seats. And a card names **one family**.

**Three scoring shapes** a card can use, which is all the code needs:

- **first to** — a `Triumph`-shaped occasion, world-contested, once (`state.contested`).
- **hold for N turns** — a standing predicate the `renown` phase sweeps each turn; a seat
  that holds it N turns running claims it, once.
- **most at a reckoning** — a standing count compared across seats at each age close from
  the card's age on; ties pay nobody (a tie is not a claim).

## Feats (the firsts — always in play, not dealt)

| feat | family | once per |
|---|---|---|
| first to enter each age | science | age |
| first wonder of each age | culture | age |
| first religion founded | culture | game |
| first to hold a city on another continent | domination | game |
| first capital captured | domination | game |
| first to circumnavigate (a route or a march that crosses every longitude — ocean at The Astrolabe) | economic | game |
| first great person of each family recruited | culture | family |
| first to hold every strategic resource kind | economic | game |
| first to complete the Engine | science | game |
| first to found a city of size 15 | culture | game |

Ten feats, ~13 beads across a game. Today's Triumphs already record most of these as
occasions; a feat is a Triumph that also clacks a bead.

## Objectives — the deck, by age and family

Each row: the card's text as a player reads it · family · shape · what it needs. Costs and
turn counts are first guesses. **D** domination · **C** culture · **S** science · **E** economic.

### Æra III deck (Empire) — the first hand; the tools are roads, the premiere roster, the university

| card | family | shape | needs |
|---|---|---|---|
| Hold three cities connected to your capital by road | E | hold 10 turns | connections (built) |
| Hold the most trade routes | E | reckoning | built |
| Hold a city on a second continent | D | hold 10 turns | continent ids (mapgen has them) |
| Capture or found a city within 3 hexes of a foreign capital | D | first to | — |
| Win five fights in a single age | D | first to | a per-age kill count |
| Hold the most cities following your religion | C | reckoning | built |
| Raise a Forum, a Hall of Deeds and an amphitheater in one city | C | first to | the buildings |
| Hold the most wonders | C | reckoning | built |
| Complete the university first | S | first to | — |
| Hold the most technologies | S | reckoning | — |
| Recruit a great person of every family | S | first to | built |
| Have every city of yours at size 6 or more | C | hold 5 turns | — |

### Æra IV deck (Cathedrals) — the heavy hand; the age is *for* these

| card | family | shape | needs |
|---|---|---|---|
| Hold a city on every continent | D | hold 10 turns | continent ids |
| Hold two captured cities at once | D | hold 10 turns | `captured` scope (built) |
| Hold the most unit strength in the world (sum of combat strength) | D | reckoning | a sum |
| Take a city that holds a wonder | D | first to | built |
| Have the most followers of your religion in foreign cities | C | reckoning | built |
| Hold three wonders of one age | C | first to | built |
| Hold the most great people recruited | C | reckoning | built |
| Hold the most culture per turn | C | reckoning | — |
| Hold the most luxury kinds | E | reckoning | built |
| Send a trade route to every other empire | E | first to | routes to foreign cities (built) |
| Hold the most connected cities | E | reckoning | built |
| Hold the most gold per turn | E | reckoning | — |
| Complete a technology of the next age first | S | first to | — |
| Hold the most universities | S | reckoning | — |
| Hold the most science per turn | S | reckoning | — |

### Æra V deck (Magister) — the accelerants; four are named on the tree already

| card | family | shape | needs |
|---|---|---|---|
| Hold a city on every continent *(The Paper Lantern's card)* | D | hold 5 turns | continent ids |
| Hold an enemy capital | D | hold 10 turns | — |
| Field an aerostat over a foreign capital | D | first to | the aerostat |
| Have the most followers in foreign cities *(Mesmerism's card)* | C | reckoning | built |
| Hold the most wonders in the world | C | reckoning | built |
| Hold ten great people | C | first to | built |
| Hold the most copies of a manufactured luxury *(The White Gold's card)* | E | reckoning | manufactured luxury |
| Hold the most trade routes in the world | E | reckoning | built |
| Own a Porcelain Works and a Manufactory in one city | E | first to | the buildings |
| Complete the Engine first *(The Calculating Engine's card)* | S | first to | the Engine |
| Hold the most technologies | S | reckoning | — |
| Learn every Æra V technology | S | first to | — |
| **The Magnum Opus** — the golden bead | all | first to | the Opus (Part 6) |

## Age-close scoring (the steady builder's beads)

At each age close from Æra II on, one bead to the leader in each family's standing count:
**D** cities held · **C** culture per turn · **S** technologies · **E** gold per turn. Four
ages × four families = up to 16, so a game that hands out ~13 feats + ~12 objectives + ~16
age-close beads has a top end near 40 and a realistic winner's count of ~20–25 — which is why
Entry VI's N is the pacing knob and ~20 on Quick is the first guess. Ties pay nobody.

## What the code needs (for the ruling, not for now)

`data/beads.json` (feats, three decks, hand sizes, N by speed) · `GameState.beads` — the
three hands (face-down and face-up, drawn by `state.rng` in the `renown` phase) and each
seat's string of beads, append-only and turn-stamped like `Player.triumphs` · one switch on a
card's shape in a `beads.ts` that owns feats' occasions (hooked at the Triumph seams),
standing predicates (swept once a turn) and reckonings (at age close) · the Abacus's rods
read the string; the golden slot stays empty until the Opus · every award is announced through
the turn report like a Triumph. The Long Count and The Obsidian Mirror are two readers of the
same hands.

## Open questions

- Hand sizes (3 / 4 / 5?), and whether Æra II gets a small deck of its own.
- Whether a reckoning card pays at *every* later age close or only the first time (the user's
  "persist" reads as every time; it is the stronger rule and rewards holding a lead).
- N by speed and seat count; whether a solo game can win by threshold at all.
- The Opus: hammers + science + culture in what proportion; halved on interruption (proposed).

## Revisions

*(yours — edit away)*

# Beads — the win condition's catalogue (working doc, 2026-08-29)

The Bead Race is the ruling (design-notes Entry VI: one unified condition, glass beads across
four families, ~30 in a game, every bead an announced event; first to N wins, otherwise most
at the curtain; the last bead is **golden** and only the Magnum Opus mints it). This doc is
the *content* — what a bead can be — and the drafting model the user asked for on
2026-08-29. Companions: `docs/tech-tree.md` Part 6 (where the ages put victory) and Part 3
(the Æra V accelerants that name beads). **Nothing here is scheduled**; `data/beads.json` does
not exist yet. The user's rulings are in **bold** the first time they appear.

## The model

**Three kinds of bead** — feats, dealt objectives, and the age reckonings — and, after the
user's cut of 2026-08-29, **no "hold X for N turns" cards at all**: holding something for the
sake of a card is tedious (the user), so every dealt objective is either a **race** you can
see other seats running, a **quest** you complete with a decision, or a **reckoning** the age
takes of everyone at once.

| kind | what | how it scores |
|---|---|---|
| **feat** | a first in the world, always in play | the first seat to do it, once per game (or per age where marked) |
| **endeavour** | a *race project* dealt from the deck — a queue row every empire can build | **the first three empires to complete it** each clack a bead (the user's idea: rewards high production, and three winners keeps the race alive after the leader finishes) |
| **quest** | a deed dealt from the deck — something you *do*, in Statecraft, religion, war, exploration | the first seat to do it, once; a few pay every seat that does it (marked ∗) |
| **reckoning** | the age's snapshot | **taken the moment the first seat enters the next age** (user): every seat is measured at once and a victor named per card; ties pay nobody |

**The deck, and how it deals** (user, 2026-08-29):

1. **Objectives are drafted every turn and revealed per age.** One deck per age (III, IV, V;
   Æra I–II have feats and reckonings only), shuffled from `state.rng` so a seed is a deal.
   Each turn the world draws one card off the current age's deck into that age's hand, face
   down; the hand fills over the age (`handSize` per age, 4 / 5 / 5 first guess). Every seat
   sees the same cards — Entry II's fairness.
2. **An age begins when the first seat reaches it** (user) — the world's clock, one clock
   for everyone. The turn it opens, every card in that age's hand turns face up, and each card
   drawn after turns face up as it is drawn.
3. **Objectives persist for the rest of the game** (user) — a new age unlocks more and never
   closes the last age's. A race or a quest stays on the table until claimed; a reckoning
   card is **taken once, at the moment the *next* age begins** (the user's rule: "calculated
   once one player advances to the next age, snapshot all players and assign a victor"), so
   rushing the tree never forfeits a table — it *calls* the reckoning.
4. **Two rules every card obeys** (Entry VI.5): a bead is a **claim on the world, never a
   bank statement** — nothing private, nothing you accumulate unseen; and a card names one
   family (**D** domination · **C** culture · **S** science · **E** economic).

**What the code needs, by kind** — an endeavour is a `project` queue row that *finishes*
(unlike Tithes and Scholarship it leaves the queue) and a world register keyed `(id, age)`
holding up to three claimants (the wonder register with a count); a quest is a Triumph-shaped
occasion hooked at the seam it names, world-contested through `state.contested`; a reckoning
is a standing count read once, in the `renown` phase of the turn the first seat's age
advances, across `realPlayers`. **The Long Count** (Æra II) shows the next hand a turn early;
**The Obsidian Mirror** (Æra V) shows every seat's progress on every card.

## Feats (always in play, not dealt)

| feat | family | once per |
|---|---|---|
| first to enter each age | S | age |
| first wonder of each age | C | age |
| first religion founded | C | game |
| every capital captured (user) | D | game |
| first to circumnavigate (ocean at The Astrolabe) | E | game |
| first great person of each family recruited | C | family |
| first to complete the Engine | S | game |
| first to found a city of size 15 | C | game |

Eight feats, ~12 beads. Removed by the user's cut: a city on another continent, every
strategic kind.

## Endeavours — the race projects (the user's mechanic)

A dealt endeavour puts a **project row** in every empire's build list the turn it is revealed
(the city panel's `insertionIndex` already sorts projects). It costs hammers on a scale that
climbs by age (first guesses below; ×speed), pays nothing on its own, and **the first three
empires to finish one each clack a bead** — first place a bead of the card's family, second
and third the same bead a beat later, announced in order. A fourth finisher gets the
building's fallback (the row's `pays`) and nothing else. Because it sits in the queue like
anything else, it competes with a settler, a wonder, a unit — the decision *is* the game.

| endeavour | age | ⚙ | family | flavour |
|---|---|---|---|---|
| **The Census of the World** | III | 120 | S | the first count of every soul in the realm — the King List's promise kept |
Must be built in a city with population > 15. Awards +1 population in every city.
| **The Great Games** | III | 150 | C | funeral games for the whole age; the Olympiad |
Must have funerary rites built in every city. Awards +10 happiness for the rest of the game.
| **The Grand Caravan** | III | 180 | E | a caravan to the edge of the known world |
Must have 10 active trade routes. Awards +2 trade route capacity.
| **The Cathedral of the Age** | IV | 260 | C | a house of the faith taller than the walls |
Must have a cathedral built in every city. Gain a religious follower slot. If you have no religion, awards a great prophet and the ability to found a religion.
| **The Encyclopaedia** | IV | 280 | S | every known thing written down once — the House of Wisdom's task |
Must have a house of wisdom built in every city.
| the grand satrapy | III
must have 10 or more cities. Awards 5 happiness and 10 authority for the rest of the game.
| **The Mint** | IV | 240 | E | one coin for the whole realm |
Must have a mint in every city. 15% purchasing costs for the rest of the game
| **The Muster of the Realm** | IV | 220 | D | every levy counted and drilled|
Must have a barracks + armory (age 4 building, TBD) in every city. Newly trained units gain +2 combat strength.
| **The Grand Orrery** | V | 400 | S | the heavens in brass; the Engine's rehearsal |
TBD
| **The Exposition** | V | 380 | C | every wonder of yours shown to the world; +1🎵 per wonder you hold, once |
TBD
| **The Armada** | V | 360 | D | a fleet for the far shore; pays two embarked units of your best type |
TBD

## Quests — deeds dealt from the deck

Each is a first-to unless marked ∗ (pays every seat that does it, once). Written to play into
the systems the game already has — **Statecraft**, religion, great people, discoveries,
trade, war — and to be *done*, not held.

### Æra III deck (Empire)

| quest | family | the deed | needs |
|---|---|---|---|
| **The Archetype** ∗ | C | hold three Orders of one theme in your slots at once (the archetype lines are the point of the themes) | a slot read | [too rng, remove]
| **The Reformer** | C | adopt a new government and fill every slot within three turns of the adoption | — | [too easy to do, remove]
| **The Deepening** | C | raise an Order to its third level, have it slotted for 10 turns | `level` (built) |
| **The Missionary** | C | your religion becomes the majority in a foreign city | built | [too easy to do, remove]
| **The Pilgrim** | C | plant a holy site on ground you do not own | `plantHolySite` (built) | [too easy to do, remove]
| **The Cartographer** | S | claim ten ruins and villages | `pendingDiscovery` count | [too easy to do, remove]
| **The Scholar's Wager** | S | complete a technology two ages above the world's lowest seat *(a science lead made public)* | — |
| **The Patron** | S | have three great people improvements built adjacent to each other | built |
| **The Road-Builder** | E | eight cities connected to your capital by road (user's number) | connections (built) |
| **The Factor** ∗ | E | send a trade route to every other empire | routes to foreign cities (built) | [too map-dependent, remove]
| **The Wall-Breaker** | D | raze five cities (upon conquering a city, give the option to raze or keep the city) | `cityMaxHp` (built) |
| **The Camp-Burner** ∗ | D | clear five barbarian camps in one age | `arrivals` (built) | [remove, age III too late in the game for this]

### Æra IV deck (Cathedrals)

| quest | family | the deed | needs |
|---|---|---|---|
| **Three of the Age** | C | hold three wonders of the current age (user's wording) | built |
| **The Enhancer** | C | enhance your religion, then convert a foreign capital | built |
| **The Laureate's Court** | C | plant a great work of every family | `greatWork` (built) |
| **The Legislator** | C | slot a Doctrine and every Order of one government within five turns of adopting it | — | [too easy, remove]
| **The Encyclopaedist** | S | complete a technology of the next age before anyone completes the current age's last | — |
| **The Observatory** | S | hold a university and an observatory in one city beside a mountain | the observatory | [too rng, remove]
| **The Silk Exchange** | E | import a luxury you do not hold by trade route, and hold it for the reckoning | the Silk Road's rule | [do we have importing luxuries? remove]
| **The Banker** | E | buy a great person with gold | `purchaseGreatPersonOffer` (built) |
| **The Plunderer** | D | plunder a caravan carrying another empire's route | built | [too rng, remove]
| **The Liberator** ∗ | D | retake a city of yours that another empire captured | — | [too rng, remove]

### Æra V deck (Magister)

| quest | family | the deed | needs |
|---|---|---|---|
| **The Mirror** | S | complete The Obsidian Mirror, then see every seat's capital | the tree |
| **The Engine** | S | complete the Engine first (the tree's own card) | the tree |
| **The Aeronaut** | D | field an aerostat over a foreign capital | the aerostat |
| **The Usurper** | D | hold an enemy capital at the reckoning | — |
| **The Porcelain Trade** | E | hold the most copies of a manufactured luxury at the reckoning | manufactured luxury |
| **The Exposition** | C | the endeavour above — listed here as the age's culture race | — |
| **The Entranced** | C | run The Entranced Workforce in three cities at once | the project |
| **The Magnum Opus** | all | the golden bead | Part 6 |

## Reckonings — the age's snapshot

Taken the moment the first seat enters the next age (user): every seat measured at once, a
victor per card, ties pay nobody. One per family per age is *dealt* (so the four below are a
pool, not a fixed set); the two the user wrote are the first two.

| reckoning | family |
|---|---|
| the most cities under your control (user) | D |
| the most great people recruited during the age (user) | C |
| the highest-population city of the age (user) | C |
| the most cumulative yields from trade routes over the age (user) | E |
| the most technologies of the age completed | S |
| the most followers of your religion in foreign cities | C |
| the most wonders of the age | C |
| the most unit strength in the world | D |

## The count

Feats ~12 · endeavours 3 per age dealt of 10 written (9 beads a game, spread over three
seats) · quests ~2 per age dealt of ~30 written · reckonings 4 per age from Æra II. A busy
winner reaches ~20; N ≈ 20 on Quick is the first guess, and it is Entry VI's pacing knob.

## Open questions

- Hand sizes; how many endeavours per age hand (one at a time, so the race is *the* race?).
- The endeavour's ⚙ scale by speed and seat count; whether a fourth finisher gets anything.
- Whether a quest marked ∗ (pays everyone) dilutes the race — or is the comeback structure.
- N by speed and seat count; whether a solo game can win by threshold.
- The Opus: hammers + science + culture in what proportion; halved on interruption (proposed).

## Revisions

*(yours — edit away)*

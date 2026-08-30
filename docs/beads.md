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
| **The Deepening** | C | raise an Order to its third level, have it slotted for 10 turns | `level` (built) |
| **The Scholar's Wager** | S | complete a technology two ages above the world's lowest seat *(a science lead made public)* | — |
| **The Patron** | S | have three great people improvements built adjacent to each other | built |
| **The Road-Builder** | E | eight cities connected to your capital by road (user's number) | connections (built) |
| **The Wall-Breaker** | D | raze five cities (upon conquering a city, give the option to raze or keep the city) | `cityMaxHp` (built) |

### Æra IV deck (Cathedrals)

| quest | family | the deed | needs |
|---|---|---|---|
| **Three of the Age** | C | hold three wonders of the current age (user's wording) | built |
| **The Enhancer** | C | enhance your religion, then convert a foreign capital | built |
| **The Laureate's Court** | C | plant a great work of every family | `greatWork` (built) |
| **The Encyclopaedist** | S | complete a technology of the next age before anyone completes the current age's last | — |
| **The Banker** | E | buy a great person with gold | `purchaseGreatPersonOffer` (built) |

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

## Quest candidates — third pass (2026-08-29), for the user to filter

The shape your endeavours found is the right one: **a condition you can plan toward from
any position** (never the map's luck, never an opponent's choice, never a draw), **a thing to
do** that costs a real trade-off, and **a reward that lasts** beside the bead. Written in that
shape, grouped by the system each plays into. Rewards are first guesses; a quest without one
listed pays the bead alone. Families as before; ∗ pays every seat that does it.

### Statecraft — the empire's law

| quest | family | the deed | reward |
|---|---|---|---|
| **The Long Reign** | C | hold one government for 25 turns without adopting another | +1 wildcard slot for the rest of the game |
| **The Deepening** (kept) | C | raise an Order to its third level and keep it slotted 10 turns | that Order is never sealed again |
| **The Full Bench** | C | hold every slot of a tier-IV or later government filled by Orders of level 2+ | Orders seal for 3 turns instead of 5 |
| **The Grand Doctrine** | C | hold five Doctrines | one more card on every Doctrine draft |
| **The Turncoat** | C | adopt three different governments across the game | adoption's amnesty also refunds the culture of the draft that opened it |
| **The Codifier** ∗ | S | hold an Order of every one of the fourteen themes at some point in the game (the Statecraft screen tracks it) | +10% 🎵 for the rest of the game |

### Religion — the faith's reach

| quest | family | the deed | reward |
|---|---|---|---|
| **The Enhancer** (kept) | C | enhance your religion, then convert a foreign capital | +1 follower slot |
| **The Apostle** | C | have your religion followed by twenty foreign citizens | your proclamations cost no charge |
| **The Cloister** | C | hold a temple, a monastery and a cathedral in one city | +1 enhancer slot |
| **The Hierophant** | C | spend 500 faith on augurs and prophets across the game | a free prophet |
| **The Tide** | C | your holy city's pressure reaches every city of yours | rites last 50% longer |
| **The Concord** ∗ | C | every city of yours follows your religion at once | +1 happiness per following city, permanent |

### Great people and renown

| quest | family | the deed | reward |
|---|---|---|---|
| **The Patron** (kept) | S | three great works planted adjacent to one another | those works +1 of their yield |
| **The Laureate's Court** (kept) | C | plant a great work of every family | +2 renown per turn |
| **The Dynasty** | C | recruit six great people | the seventh is half price |
| **The School** | S | earn 100 renown in one family (the feed) | that family's draft shows one more card |
| **The Banker** (kept) | E | buy a great person with gold | great people cost −25% gold |
| **The Legacy** | C | hold four legacies unrevoked at once | legacies can no longer be revoked |

### Cities, growth and the ground

| quest | family | the deed | reward |
|---|---|---|---|
| **The Metropolis** | C | grow a city to size 20 | that city's crowding demand is halved |
| **The Twelve** | E | hold twelve cities of size 6 or more | +1 authority capacity per city of size 8+ |
| **The Breadbasket** | E | one city working eight farms at once | farms +1🌾 in that city |
| **The Forge-City** | E | one city working six mines at once | mines +1⚙ in that city |
| **The Garden** | C | one city with every happiness building of the age | +2 happiness in every city |
| **The Founder** | E | found eight cities yourself (captures do not count) | settlers cost −25% |
| **The Surveyor** | E | buy twenty tiles across the game | tiles cost −25% |
| **The Waterworks** | E | an aqueduct in every city of size 6+ | growth surplus +10% empire-wide |

### Buildings and wonders

| quest | family | the deed | reward |
|---|---|---|---|
| **Three of the Age** (kept) | C | hold three wonders of the current age | +1🎵 per wonder |
| **The Builder** | C | complete six wonders across the game | wonders −10% ⚙ |
| **The Library of the Realm** | S | a library in every city and a university in three | +1🔬 per library |
| **The Market Town** | E | a market and a harbour (or a bazaar) in one city with three routes ending there | that city's routes +1🪙 |
| **The Bulwark** | D | walls in every city that touches a foreign border | those walls +5 strength |
| **The Renewal** | S | hold every renewal of one thread (Fire, Sky, Water, Fate) | the thread's buildings +1 of their yield |

### Trade and the road

| quest | family | the deed | reward |
|---|---|---|---|
| **The Road-Builder** (kept) | E | eight cities connected to your capital by road | road maintenance halved |
| **The Long Haul** | E | a trade route that runs for 40 turns without lapsing (auto-resend counts) | +1 route capacity |
| **The Caravanserai** | E | ten routes ending in one city over the game | that city's routes +2🪙 |
| **The Exchange** | E | a route to a foreign city returns 100 cumulative gold | foreign routes +1🪙 +1🔬 |
| **The Ledger** ∗ | E | 500 cumulative gold from routes | the Trade screen shows every empire's routes |

### Science and the chart

| quest | family | the deed | reward |
|---|---|---|---|
| **The Scholar's Wager** (kept) | S | complete a technology two ages above the world's lowest seat | +5% 🔬 |
| **The Encyclopaedist** (kept) | S | complete a technology of the next age before anyone completes the current age's last | the next age's first tech −25% |
| **The Thread** | S | complete every node of one thread | the thread's masteries are drawn from a hand of four |
| **The Polymath** | S | hold a mastery from every thread | one free reroll die |
| **The Star-Reader** | S | complete three technologies in five turns | +10% 🔬 for ten turns |
| **The Tablet House** | S | research 2000 cumulative science from libraries and their renewals | libraries +1🔬 |

### War, proactive (never "be attacked")

| quest | family | the deed | reward |
|---|---|---|---|
| **The Wall-Breaker** (kept, user) | D | raze five cities *(needs the raze-or-keep choice on capture)* | razing pays double gold |
| **The Conqueror** | D | capture three cities | captured cities cost one less authority |
| **The Veteran Host** | D | hold ten units with the veteran stamp at once | new units +5 hp stamp |
| **The Siege Master** | D | take a city while it stands under siege (every neighbour hex yours) | siege chip damage doubled |
| **The Standing Army** | D | hold twenty combat units at once for a turn | unit upkeep −1 per age |
| **The General's Road** | D | a great general's aura covers a fight that kills a unit two strengths above yours | the aura +1 |
| **The Fleet** | D | six embarked units at once | embarked units +1 movement |
| **The Marches** | D | hold a city within 3 hexes of three different empires' borders — *map-dependent; keep only if the map guarantees neighbours* | that city +5 strength |

### Exploration and discovery (map-independent forms)

| quest | family | the deed | reward |
|---|---|---|---|
| **The Wayfarer** | S | reveal 40% of the world | scouts +1 sight |
| **The Chronicler** | S | claim every ruin within 6 hexes of your capital *(the count is the map's; the reach is yours)* | ruins pay double |
| **The Circumnavigator** (feat) | E | a route or a march crossing every longitude | embarked +1 movement |

### Projects and the queue

| quest | family | the deed | reward |
|---|---|---|---|
| **The Tithe** | E | run Tithes for 20 conversions across the game | Tithes pays +2🪙 |
| **The Scholarship** | S | run Scholarship for 20 conversions | Scholarship pays +2🔬 |
| **The Overflow** | E | complete three items in one city in three turns (chops and windfalls count) | that city's overflow doubled for the age |

*Forty-odd. The ones I'd keep first, by your criteria: The Long Reign, The Full Bench, The
Apostle, The Concord, The Dynasty, The Metropolis, The Twelve, The Founder, The Builder,
The Long Haul, The Thread, The Conqueror, The Veteran Host, The Standing Army.*

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

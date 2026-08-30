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
| **endeavour** | a *race project* dealt from the deck — a queue row every empire can build | **the first empire to complete it** clacks the bead and takes the boon (user, 2026-08-29 — first only, for both); everyone else's hammers are spent |
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
holding one claimant (the wonder register, exactly); a quest is a Triumph-shaped
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

## Endeavours — the race projects (the user's mechanic, reworked 2026-08-29)

A dealt endeavour puts a **project row** in every empire's build list the turn it is revealed
(projects sort at the back of the queue by `insertionIndex`). Each has a **prerequisite** on
the empire — a condition you can see and plan toward — a hammer cost that climbs by age, and
a **boon** beside the bead. **The first empire to finish takes the bead and the boon; nobody
else gets either** (user, 2026-08-29) — a race with one winner, which is what makes it a
race. Boons are **one-time** — a windfall, a grant, a permanent step in a *cap* (authority,
happiness) — never a standing rate. A later finisher's hammers are spent for the row's
fallback `pays` alone, so a seat that sees the race lost should drop the row — the queue's
remove is the fold.

| endeavour | age | ⚙ | family | prerequisite (user) | boon (bead and boon to the first finisher only) |
|---|---|---|---|---|---|
| **The Census of the World** | III | 120 | S | built in a city of size 15+ | +1 population in every city, once |
| **The Great Games** | III | 150 | C | Funeral Games in every city | +2 happiness, permanent (a cap, not a rate) |
| **The Grand Caravan** | III | 180 | E | ten active trade routes | +2 route capacity, permanent |
| **The Grand Satrapy** | III | 200 | D | ten or more cities | +5 happiness and +10 authority capacity, permanent (the signature one) |
| **The Cathedral of the Age** | IV | 260 | C | a cathedral in every city | +1 follower slot; with no religion: a free prophet and the right to found one |
| **The Encyclopaedia** | IV | 280 | S | a House of Wisdom (the university's successor building) in every city | a free technology of the current age, once |
| **The Mint** | IV | 240 | E | a mint in every city | a one-time treasury of 300 gold, and purchases −15% for 20 turns (timed) |
| **The Muster of the Realm** | IV | 220 | D | a barracks and an armoury (the Æra IV barracks renewal) in every city | every unit you hold gains the +2 strength veteran stamp, once |
| **The Grand Orrery** | V | 400 | S | an observatory in three cities | two Magister's Dice |
| **The Exposition** | V | 380 | C | four wonders held | a one-time windfall of 20🎵 per wonder held |
| **The Armada** | V | 360 | D | six embarked units at once | two free units of your best type, embarked, at the capital |

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

## Quest candidates — third pass (2026-08-29), rewards reworked to one-time boons

The shape: **a condition you can plan toward from any position** (never the map's luck,
never an opponent's choice, never a draw), **a deed** with a real trade-off, and a **one-time
boon** beside the bead (user, 2026-08-29): a Magister's Die, a windfall, a grant, or a
permanent step in a *cap* — authority or happiness — never a standing rate. Where a quest
says "a die" that is the dice economy's source (Entry XV; cap 3 held). ∗ pays every seat that
does it, once. Grouped by the system each plays into.

### Statecraft — the empire's law

| quest | family | the deed | boon |
|---|---|---|---|
| **The Long Reign** | C | hold one government for 25 turns without adopting another | a die · every sealed Order unseals now |
| **The Deepening** (kept) | C | raise an Order to its third level and keep it slotted 10 turns | a die |
| **The Full Bench** | C | hold every slot of a tier-IV or later government filled by Orders of level 2+ | a free Order draft, now |
| **The Grand Doctrine** | C | hold five Doctrines | a die · +2 authority capacity |
| **The Turncoat** | C | adopt three different governments across the game | a free Doctrine draft, now |
| **The Codifier** ∗ | C | hold an Order of every one of the fourteen themes at some point in the game | a one-time windfall of 100🎵 |

### Religion — the faith's reach

| quest | family | the deed | boon |
|---|---|---|---|
| **The Enhancer** (kept) | C | enhance your religion, then convert a foreign capital | a free prophet |
| **The Apostle** | C | have your religion followed by twenty foreign citizens | a die · +2 happiness |
| **The Cloister** | C | hold a temple, a monastery and a cathedral in one city | a one-time windfall of 150🕯 |
| **The Hierophant** | C | spend 500 faith on augurs and prophets across the game | a free prophet |
| **The Tide** | C | your holy city's pressure reaches every city of yours | every city of yours converts fully, once |
| **The Concord** ∗ | C | every city of yours follows your religion at once | +3 happiness, permanent |

### Great people and renown

| quest | family | the deed | boon |
|---|---|---|---|
| **The Patron** (kept, user) | S | three great works planted adjacent to one another | a die |
| **The Laureate's Court** (kept) | C | plant a great work of every family | a free great person of your choice of family |
| **The Dynasty** | C | recruit six great people | a one-time windfall of renown equal to the next recruitment's price |
| **The School** | S | earn 100 renown in one family | a free great person of that family |
| **The Banker** (kept) | E | buy a great person with gold | a die |
| **The Legacy** | C | hold four legacies unrevoked at once | every revoked legacy of yours is restored, once |

### Cities, growth and the ground

| quest | family | the deed | boon |
|---|---|---|---|
| **The Metropolis** | C | grow a city to size 20 | +3 happiness, permanent |
| **The Twelve** | E | hold twelve cities of size 6 or more | +6 authority capacity, permanent |
| **The Breadbasket** | E | one city working eight farms at once | +1 population in that city and every city beside fresh water, once |
| **The Forge-City** | E | one city working six mines at once | a one-time windfall of 200⚙ in that city |
| **The Garden** | C | one city with every happiness building of the age | +2 happiness, permanent |
| **The Founder** | E | found eight cities yourself (captures do not count) | a free settler at the capital |
| **The Surveyor** | E | buy twenty tiles across the game | every city claims its next border tile now |
| **The Waterworks** | E | an aqueduct in every city of size 6+ | +1 population in every city with an aqueduct, once |

### Buildings and wonders

| quest | family | the deed | boon |
|---|---|---|---|
| **Three of the Age** (kept) | C | hold three wonders of the current age | a die |
| **The Builder** | C | complete six wonders across the game | a one-time windfall of 300⚙ in the capital |
| **The Library of the Realm** | S | a library in every city and a university in three | a one-time windfall of 300🔬 |
| **The Market Town** | E | a market and a harbour (or a bazaar) in one city with three routes ending there | a one-time treasury of 200 gold |
| **The Bulwark** | D | walls in every city that touches a foreign border | every city heals to full, once |
| **The Renewal** | S | hold every renewal of one thread (Fire, Sky, Water, Fate) | a die · a free mastery draft from that thread |

### Trade and the road

| quest | family | the deed | boon |
|---|---|---|---|
| **The Road-Builder** (kept) | E | eight cities connected to your capital by road | +2 authority capacity, permanent |
| **The Long Haul** | E | a trade route that runs for 40 turns without lapsing | +1 route capacity, permanent (a cap) |
| **The Caravanserai** | E | ten routes ending in one city over the game | a free trader at that city |
| **The Exchange** | E | a route to a foreign city returns 100 cumulative gold | a one-time treasury of 150 gold |
| **The Ledger** ∗ | E | 500 cumulative gold from routes | a die |

### Science and the chart

| quest | family | the deed | boon |
|---|---|---|---|
| **The Scholar's Wager** (kept) | S | complete a technology two ages above the world's lowest seat | a die |
| **The Encyclopaedist** (kept) | S | complete a technology of the next age before anyone completes the current age's last | a free technology of the current age |
| **The Thread** | S | complete every node of one thread | a free mastery draft from that thread |
| **The Polymath** | S | hold a mastery from every thread | two dice |
| **The Star-Reader** | S | complete three technologies in five turns | a one-time windfall of 200🔬 |
| **The Tablet House** | S | 2000 cumulative science from libraries and their renewals | a die |

### War, proactive (never "be attacked")

| quest | family | the deed | boon |
|---|---|---|---|
| **The Wall-Breaker** (kept, user) | D | raze five cities *(needs the raze-or-keep choice on capture)* | a one-time treasury of 300 gold |
| **The Conqueror** | D | capture three cities | +4 authority capacity, permanent |
| **The Veteran Host** | D | hold ten units with the veteran stamp at once | every unit heals to full, once |
| **The Siege Master** | D | take a city while it stands under siege (every neighbour hex yours) | a free unit of your best type at that city |
| **The Standing Army** | D | hold twenty combat units at once for a turn | +2 happiness, permanent |
| **The General's Road** | D | a great general's aura covers a fight that kills a unit two strengths above yours | a free great general |
| **The Fleet** | D | six embarked units at once | a die |

### Exploration and discovery (map-independent forms)

| quest | family | the deed | boon |
|---|---|---|---|
| **The Wayfarer** | S | reveal 40% of the world | a one-time windfall of 100🔬 |
| **The Circumnavigator** (feat) | E | a route or a march crossing every longitude | a die |

### Projects and the queue

| quest | family | the deed | boon |
|---|---|---|---|
| **The Tithe** | E | run Tithes for 20 conversions across the game | a one-time treasury of 200 gold |
| **The Scholarship** | S | run Scholarship for 20 conversions | a one-time windfall of 200🔬 |
| **The Overflow** | E | complete three items in one city in three turns (chops and windfalls count) | a one-time windfall of 100⚙ in that city |

*Removed from the earlier batch as map-dependent: The Marches, The Chronicler.*

*What this buys: every standing modifier the victory system hands out is a cap (authority
capacity, happiness, route capacity), and there are nine of them across ~50 candidates;
everything else is a die, a windfall through Entry XVIII's seams, or a grant through the
completion-grant path — all built. The dice finally have a source.*

## The count

Feats ~12 · endeavours 3 per age dealt of 11 written (9 beads a game, one seat each) · quests ~2 per age dealt of ~30 written · reckonings 4 per age from Æra II. A busy
winner reaches ~20; N ≈ 20 on Quick is the first guess, and it is Entry VI's pacing knob.

## Open questions

- Hand sizes; how many endeavours per age hand (one at a time, so the race is *the* race?).
- The endeavour's ⚙ scale by speed and seat count; whether a losing seat is warned when another finishes (the announcement is the warning).
- Whether a quest marked ∗ (pays everyone) dilutes the race — or is the comeback structure.
- N by speed and seat count; whether a solo game can win by threshold.
- The Opus: hammers + science + culture in what proportion; halved on interruption (proposed).

## Revisions

*(yours — edit away)*

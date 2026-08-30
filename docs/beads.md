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
| **The Great Games** | III | 150 | C | Funeral Games in every city | +5 happiness, permanent (a cap, not a rate) |
| **The Grand Caravan** | III | 180 | E | ten active trade routes | +2 route capacity, permanent |
| **The Grand Satrapy** | III | 200 | D | ten or more cities | +5 happiness and +10 authority capacity, permanent (the signature one) |
| **The Cathedral of the Age** | IV | 260 | C | a cathedral in every city | +1 follower slot; with no religion: a free prophet and the right to found one |
| **The Encyclopaedia** | IV | 280 | S | a House of Wisdom (the university's successor building) in every city | a free technology of the current age, once |
| **The Mint** | IV | 240 | E | a mint in every city | purchases −25% for 20 turns (timed) |
| **The Muster of the Realm** | IV | 220 | D | a barracks and an armoury (the Æra IV military building) in every city | every unit you hold gains the +2 strength veteran stamp, once |
| **The Grand Orrery** | V | 400 | S | an observatory in three cities | two Magister's Dice |
| **The Exposition** | V | 380 | C | six wonders held | a one-time windfall of 20🎵 per wonder held |
| **The Armada** | V | 360 | D | 15 naval units at once | naval units +5 combat strength for 20 turns |

## Quests — deeds dealt from the deck, by age

A quest is dealt from its age's deck and **persists** after (the model, rule 3). Its age is
the earliest the deed is plausible — the deck it lives in — so a quest that needs a Cathedral
is Æra IV's even though a fast seat could finish it in III. Each row: quest · the system it
plays into · family · the deed · the one-time boon (a **die** is a Magister's Die; a
**cap** is a permanent step in authority capacity or happiness; everything else is a windfall
or a grant through built seams). ∗ pays every seat that does it, once. **Never** the map's
luck, an opponent's choice, or a draw. The user filters; the counts are a pool, not a hand.

### Æra III deck (Empire) — 28 candidates

| quest | system | family | the deed | boon |
|---|---|---|---|---|
| **The Long Reign** | Statecraft | C | hold one government with combined 15 levels for 10 turns without adopting another | a free order draft |
| **The Deepening** (kept) | Statecraft | C | raise an Order to its third level and keep it slotted 10 turns | a die |
| **The Turncoat** | Statecraft | C | adopt three different governments across the game | a free Doctrine draft, now [too easy, remove]|
| **The Apostle** | religion | C | have your religion followed by twenty foreign citizens | a die · +2 happiness (cap) |
| **The Hierophant** | religion | C | spend 1500 faith on augurs and prophets across the game | a free prophet |
| **The Tide** | religion | C | your holy city's pressure reaches every city of yours | every city of yours converts fully, once | [remove]
| **The Concord** ∗ | religion | C | every city of yours follows your religion at once | +3 happiness (cap) | [remove, too easy]
| **The Patron** (kept, user) | great people | S | three great works planted adjacent to one another | a die |
| **The School** | great people | S | earn 200 renown in one family | a free great person of that family |
| **The Banker** (kept) | great people | E | buy a great person with gold | a die | [we don't have this ability until later ages, no? remove]
| **The Breadbasket** | cities | E | one city has a food yield of 100+ for 10 turns | +1 population in that city and every city beside fresh water, once |
| **The Forge-City** | cities | E | one city has a production yield of 100+ for 10 turns | a one-time windfall of 200⚙ in that city |
| **The Garden** | cities | C | one city with every happiness building of the age | +2 happiness (cap) | [remove, too easy]
| **The Founder** | cities | E | found eight cities yourself (captures do not count) | a free settler at the capital |
| **The Surveyor** | cities | E | buy twenty tiles across the game | every city claims one more tile |
| **The Waterworks** | cities | E | an aqueduct in 4 cities of size 10+ | +1 population in every city with an aqueduct, once |
| **Three of the Age** (kept) | wonders | C | hold three wonders of the current age | a die |
| **The Library of the Realm** | buildings | S | a library and university built in 4 cities | a one-time windfall of 300🔬 |
| **The Market Town** | buildings | E | a market and a harbour (or a bazaar) in one city with four routes ending there | a one-time treasury of 200 gold |
| **The Bulwark** | buildings | D | palisades and castle in 4 cities | a die |
| **The Road-Builder** (kept) | trade | E | eight cities connected to your capital by road | +4 authority capacity (cap) |
| **The Exchange** | trade | E | routes to foreign cities accumulate 250 gold | a one-time treasury of 150 gold |
| **The Ledger** ∗ | trade | E | 600 cumulative yields from routes | a die |
| **The Scholar's Wager** (kept) | science | S | complete a technology two ages above the world's lowest seat | a die |
| **The Star-Reader** | science | S | complete three technologies in five turns | a one-time windfall of 200🔬 |
| **The Wall-Breaker** (kept, user) | war | D | raze five cities *(needs the raze-or-keep choice on capture)* | a one-time treasury of 300 gold |
| **The Conqueror** | war | D | capture three cities | +4 authority capacity (cap) |
| **The Siege Master** | war | D | take a city while it stands under siege (every neighbour hex yours) | a free unit of your best type at that city |
| **The General's Brilliance** | war | D | a great general's aura covers a fight that kills a unit with greater base strength | a free great general |
| **The Fleet** | war | D | 9 naval units at once | a die |
| **The Wayfarer** | exploration | S | reveal 40% of the world | a one-time windfall of 100🔬 |
| **The Tithe** | projects | E | gain 600 cumulative gold from tithes| a one-time treasury of 200 gold |
| **The Scholarship** | projects | S | gain X cumulative science from scholarship | a one-time windfall of 200🔬 |
| **The Overflow** | projects | E | complete three items in one city in three turns (chops and windfalls count) | a one-time windfall of 100⚙ in that city |

### Æra IV deck (Cathedrals) — 16 candidates

| quest | system | family | the deed | boon |
|---|---|---|---|---|
| **The Full Bench** | Statecraft | C | hold one tier-IV or later government filled by combined level of (number of slots * 2) for 10 turns | a free Order draft, now |
| **The Codifier** ∗ | Statecraft | C | hold an Order of every one of the fourteen themes at some point in the game | a one-time windfall of 100🎵 | [tedious, themes not important to players visually, remove]
| **The Enhancer** (kept) | religion | C | enhance your religion, then convert a foreign capital | a free prophet |
| **The Cloister** | religion | C | hold a temple, a monastery and a cathedral in four cities | a one-time windfall of 150🕯 |
| **The Laureate's Court** (kept) | great people | C | plant a great work of every family in one city | a free great person of your choice of family |
| **The Dynasty** | great people | C | recruit six great people in this age | a one-time windfall of renown equal to the next recruitment's price |
| **The Legacy** | great people | C | hold fifteen legacies unrevoked at once | every revoked legacy of yours is restored, once |
| **The Metropolis** | cities | C | grow a city to size 20 | +3 happiness (cap) |
| **The Twelve** | cities | E | hold twelve cities of size 6 or more | +6 authority capacity (cap) |
| **The Builder** | wonders | C | complete ten wonders across the game | a die |
| **The Renewal** | buildings | S | hold every renewal of one thread (Fire, Sky, Water, Fate) | a die · a free mastery draft from that thread | [too tedious, remove]
| **The Long Haul** | trade | E | accumulate (X) yields in one trade route this age | +1 route capacity (cap) |
| **The Caravanserai** | trade | E | ten routes originating from one city during the age | +1 route capacity |
| **The Encyclopaedist** (kept) | science | S | complete a technology of the next age before anyone completes the current age's last | a free technology of the current age |
| **The Thread** | science | S | complete every node of one thread | a free mastery draft from that thread | [what is a thread? remove probably]
| **The Tablet House** | science | S | 2000 cumulative science from libraries and their renewals | a die | [remove]
| **The Veteran Host** | war | D | hold ten units with the veteran stamp at once | every unit heals to full, once | [remove]
| **The Standing Army** | war | D | hold twenty combat units at once for ten turns | +2 happiness (cap) |

### Æra V deck (Magister) — 12 candidates

| quest | system | family | the deed | boon |
|---|---|---|---|---|
| **The Grand Doctrine** | Statecraft | C | hold five Doctrines (the fifth government's) | a die · +2 authority capacity (cap) |
| **The Magister's Table** | Statecraft | C | hold three Magister's Dice at once and spend one on a seal | a free Order draft, now |
| **The Polymath** | science | S | hold a mastery from every thread | two dice |
| **The Engine** (the tree's card) | science | S | complete the Engine first | a die |
| **The Mirror** | science | S | complete The Obsidian Mirror, then see every seat's capital | a die |
| **The Alchemist** | buildings | E | a Distillery in every city | a one-time treasury of 400 gold |
| **The Clockwork Host** | buildings | E | hold five Clockwork Workers | every worker of yours gains a charge, once |
| **The Porcelain Trade** | trade | E | hold the most copies of a manufactured luxury at the reckoning | two dice |
| **The Aeronaut** | war | D | field an aerostat over a foreign capital | a free aerostat |
| **The Usurper** | war | D | hold an enemy capital at the reckoning | +4 authority capacity (cap) |
| **The Entranced** | projects | C | run The Entranced Workforce in three cities at once | a one-time windfall of 300⚙ in the capital |
| **The Exposition** | wonders | C | hold six wonders of any age at once | a one-time windfall of 20🎵 per wonder held |
| **The Magnum Opus** | — | all | the golden bead | Part 6 |

*Removed as map-dependent: The Marches, The Chronicler. The Circumnavigator is a feat.
Standing modifiers across all three decks: nine, every one a cap; the rest are dice,
windfalls and grants through built seams.*

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

Feats ~12 · endeavours 3 per age dealt of 9 written (9 beads a game, one seat each) · quests ~2 per age dealt of ~30 written · reckonings 4 per age from Æra II. A busy
winner reaches ~20; N ≈ 20 on Quick is the first guess, and it is Entry VI's pacing knob.

## Open questions

- Hand sizes; how many endeavours per age hand (one at a time, so the race is *the* race?).
- The endeavour's ⚙ scale by speed and seat count; whether a losing seat is warned when another finishes (the announcement is the warning).
- Whether a quest marked ∗ (pays everyone) dilutes the race — or is the comeback structure.
- N by speed and seat count; whether a solo game can win by threshold.
- The Opus: hammers + science + culture in what proportion; halved on interruption (proposed).

## Revisions

*(yours — edit away)*

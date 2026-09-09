# The Wager — design worksheet (draft, 2026-09-08)

The user: *"lets take the idea of a global age (takes the mean of all players,
with a 10 turn countdown for age end). Let's call it 'the wager'. 5 turns into
each new age, players are shown three targets drawn from a deck, that scales
based on the age. Each player chooses one of the wagers, if they fail to
fulfill it, they take a malice, if they get it, they gain 2 beads. Beating the
other wagers will result in just a single bead. That's 4 possible per age, plus
the deeds, which makes an age 4 win very possible."*

A worksheet in the `war-diplomacy.md` shape: the ruled parts are stated, the
▢ are decisions still open, (rec) is the orchestrator's default and stands
unless overruled. Marginalia here are rulings. Nothing flies until the ▢ are
marked. What exists today is `docs/beads.md` (the Bead Race: feats,
endeavours, quests, reckonings, grants; threshold 20 opens the Opus; the
builder wins) and the world clock (an age opens when the **first** seat
reaches it, `worldTechReached`).

## 1. The global age — one clock, averaged

- **The world's age is the mean of every real player's progress** (`realPlayers`),
  not the first seat's. ▢ *Progress* = (rec) the age of each empire's highest
  researched technology, averaged and floored — so the world enters Æra II when
  the average empire has; a runaway leader does not drag everyone into an age
  they have not reached, and a lagging bot does not hold the leader back for
  ever, because the mean moves as soon as most seats do.
- **The countdown.** When the mean first crosses into the next age, the current
  age is given **10 turns** to close (the user's figure; `rules.wager.countdown`).
  At the close: the age's wagers are judged, then the new age opens. ▢ (rec)
  The countdown is public on the top bar's age card and the Abacus — "Æra II
  closes in 7 turns" — because a wager with a hidden deadline is a coin toss.
- **What the clock gates**: (rec) only the calendar — the wager deals, the
  age's deed table, the age-entry occasions. It does **not** gate research or
  the tree (an empire may research ahead of the world) and it does not move the
  Opus door. The bead tables that opened "on the world's clock" (the open
  Abacus ruling on the flags board) open on *this* clock, which settles that
  ruling too.
- The **first** age has no countdown to start it and deals no wager (§2,
  ruled). The **last** age closes only by the Opus; its wager (Æra IV's, while
  the chart ends there — §2) is judged when the Opus is raised or at
  `rules.wager.lastAgeTurns` (rec 40) after the age opened, whichever is first.

## 2. The deal — three targets, five turns in

- **The deal turn** (the user, 2026-09-08: *"a five turn delay only for age 1
  (so the player has some semblance of a game plan) before committing to a
  wager, or even starting it in age 2 and skipping age 1 altogether"*): ▢ mark
  one —
  - (a) **Æra I deals on turn 5**, every later age on the turn it opens;
  - (b) **RULED** (the user, 2026-09-08: "lets go with b") — **no wager in
    Æra I**: the first deal is the turn Æra II opens.
    Æra I is the opening — settling, the first drafts, the first war — and a
    bar laid over it competes with learning the board; the deeds still pay
    beads there, so the first age is not empty of the race. Æra II–IV give
    three wagers × 4 = **12** beads, plus the deeds, against the threshold of
    20 — still an Æra IV Opus, a little less certain, and `rules.threshold`
    is the dial.
  Three wagers are drawn from the age's deck and shown to every seat at once —
  the same three for everyone (a wager is a claim on the world, like a bead).
  The deal is from `state.rng`, so a seed is a deal.
- **Each seat chooses one** — a command, `chooseWager {playerId, index}`.
  **RULED** (the user, 2026-09-08: "lets have every player pick their wager on
  the same turn. Choices are not public"): the choice is made **on the deal
  turn** — it is an End Turn blocker for every seat that turn, like an Order
  draft, so nobody ends the turn without a wager — and **the choice is
  secret**: a seat's pick is written to its own `Player.wager` and shown to
  nobody else until the judgement, when every seat's pick and result are
  revealed together on the wager sheet. (What everyone *does* see is the three
  dealt cards and, all age long, each seat's standing against every bar — a
  bead is a claim on the world — so the secret is only *which* bar a rival
  staked on.) A bot picks in the same window; a seat that cannot (an absent
  human in hot-seat) is dealt its first card by the reducer's default.
- **Judged at the age's close** (§1). For each seat: the chosen wager met pays
  **2 beads**; each of the other two met pays **1 bead**; the chosen wager
  missed takes a **malice** (§4). So an age pays at most 4 beads, and a seat
  that chases nothing risks only its own choice.
- The **threshold arithmetic**: four ages × 4 = 16 from wagers alone, plus the
  deeds (feats, quests, endeavours) — the user's reading, an Æra IV win is very
  possible. ▢ Keep `rules.threshold` at 20 (rec) and re-measure on the arena
  after the first cut; the dial is one number.
- **Æra V has no wager** (the user, 2026-09-08, confirmed: "era 5 will be
  added later, and will have no wager"). The wager runs in Æra II, III and
  IV — Æra IV keeps its wager while the chart ends there and after Æra V
  lands alike; Æra IV's is judged at the Opus or at `rules.wager.lastAgeTurns`
  (rec 40) after the age opened, whichever is first, and Æra V deals
  nothing: the Opus is its whole business.

## 3. The deck — targets that scale with the age

- **A wager is a bar, not a race**: "bank 300 culture this age", "hold 5
  improved luxuries", "12 citizens in one city", "field 30 strength of army",
  "6 buildings in one city", "3 trade routes running", "2 wonders", "a religion
  followed by 4 cities". Anyone who clears it clears it; the leader is not the
  only winner.
- **Scaling — RULED** (the user, 2026-09-08: "lets have it fixed per age.
  This will be something we tweak with difficulty level"; then: "Difficulty
  we can defer to later — I plan to make modifications/bonuses to the bot to
  enable harder difficulties, after we try to get as much performance as
  possible out of the bot"): each card carries **three figures**, one per
  wagering age (II · III · IV), in `data/wagers.json`. **No difficulty
  setting yet** — the figures are one table, cut for a realm playing well
  (the §3a means at 1.5× or above); a difficulty rung, when it comes, is the
  bot's business first and a multiplier on this table second. The bar prints
  as a number the turn it is dealt and never moves after.
- **A first cut of the deck** — every card is a reading the Ledger already
  prints (the rule two bullets down). The *rate* column is (b)'s stretch over
  the world's mean at the deal; the *floor* is the least an age may ask, so a
  poor world still asks something. The figures are filled from the probe in
  §3a and are a first cut for the arena, not a ruling.

  | Wager | Family | Reads | Kind |
  |---|---|---|---|
  | The Counting House | E | gold banked this age | flow |
  | The Academies | S | science per turn at the age's close | standing |
  | The Chroniclers | C | culture per turn at the age's close | standing |
  | The Congregation | C | faith banked this age | flow |
  | The Metropolis | E | citizens in your largest city | standing |
  | The Many Hearths | E | cities you hold | standing |
  | The Caravans | E | what your trade routes pay a turn, all voices summed | standing |
  | The Standing Army | D | army strength fielded | standing |
  | The Conqueror | D | cities captured this age | flow |
  | The Faithful | C | cities in the world following your religion | standing |
  | The Laureates | S | great people called this age | flow |
  | The Roads | E | cities joined to your capital by road | standing |

  Ten generic rows kept after the user's two cuts (2026-09-08). **The
  principle the user set for every wager** (*"the wagers need to feel like
  'stat checks' for the player, that they're doing the things needed to win at
  the game, similar to a boss ante in balatro … think more difficult and
  involve multiple arenas of gameplay"*): a wager is a **boss ante** — a bar
  that only a realm playing well *across* the game clears, so it asks two or
  three arenas at once, at figures above the mean, and a build that neglects
  one of them fails it. Three of the first suggestions survived the cut, with
  the user's figures:

  | Wager | Family | Reads | Kind | Æra II · III · IV |
  |---|---|---|---|---|
  | The Wonder of the Age | C | wonders unlocked *in this age* raised by you (`wondersHeldBy` × the row's age) | standing | 3 · 3 · 3 — "must be difficult to accomplish" |
  | The Missionary | C | **rivals'** cities following your religion (`followingForeign`) | standing | 3 · 4 · 5 — "can be redeemed the moment the condition is true" |
  | The Taken Town | D | cities you captured this age *and still hold* (`City.captured`, the occasion stamped) | flow | 1 · 3 · 5 |

  **Redeemed the moment it is true** (the user's note on The Missionary, read
  as a rule for every standing wager — ▢ rec): a standing wager is **claimed
  the turn its bar is first met**, an announced occasion (the Abacus flips,
  the beads are minted then), never at the close — so a bar met and then lost
  to a war or a conversion still paid, and a player can *see* it land. A flow
  wager is claimed the turn its count reaches the bar. The judgement at the
  close then has one job: the chosen wager still unclaimed takes the malice.

  **The compound wagers** — the orchestrator's second round, each asking two
  or three arenas at once, every clause a reading the Ledger already prints
  (the figures are journeyman first cuts at 1.5× the §3a means, or above,
  and every conjunction must hold **at once** on one turn to be claimed):

  | Wager | Family | The bar — every clause at once | Æra II · III · IV |
  |---|---|---|---|
  | **The Capital of the World** | C | your capital holds **N citizens**, **M buildings**, and **a wonder** | 10 · 5 · 1 — 16 · 11 · 2 — 25 · 16 · 3 |
  | **Bread and Iron** | D | your realm banks **F food surplus a turn** (the growth channel, summed) while fielding **A army strength** | 12 · 150 — 25 · 480 — 40 · 1 000 |
  | **The War Chest** | E | **G gold in the treasury** and **A army strength**, neither borrowed (no debt) | 300 · 150 — 1 000 · 480 — 2 500 · 1 000 |
  | **The Schooled Realm** | S | **every** city of yours holds a science building, you hold **C cities**, and **S science a turn** | 4 · 16 — 7 · 42 — 12 · 120 |
  | **The Merchant Princes** | E | **R trade routes** running, **U unique luxuries**, and **G gold a turn** | 2 · 2 · 12 — 4 · 4 · 60 — 6 · 7 · 150 | [remove, unique luxuries may be difficult to get, i dont want this to be contingent on ai deals]
  | **The Pilgrim Empire** | C | your religion followed by **K cities** of which **R are rivals'**, and **F faith a turn** | 4 · 1 · 5 — 8 · 3 · 15 — 14 · 5 · 60 | [remove, i view religion more as a way to get bonuses, but religious spread is tedious as a mechanic]
  | **The Marcher Lords** | E | you hold **C cities**, **none unhappy** (every city's happiness at or above nought), and **authority in surplus** | 5 — 9 — 18 |
  | **Hammer and Word** | C | a **wonder of this age** raised **and** a **great person called** this age | 1 · 1 — 1 · 1 — 2 · 2 |
  | **The Conqueror's Peace** | D | a city **captured** this age, still held, **and** the age closed **at peace with every rival** — the war won and closed | 1 — 1 — 2 | [remove, peace is not necessarily something you can do with agency in multiplayer]
  | **The Fortified Frontier** | D | **every** city of yours holds a wall and a garrison, and **no city of yours was pillaged** this age (a standing count of the pillage occasions) | — |
  | **The Full Ledger** | E | **every one of the six voices** at or above its bar a turn at once — the breadth check, the ante with no arena to neglect | 20🌾 15⚙ 8💰 8🔬 6🎵 3🕯 — 60 · 50 · 30 · 30 · 25 · 8 — 120 · 150 · 70 · 60 · 100 · 25 | [remove]
  | **The Renowned Court** | S | **R renown a turn** and **W great persons' works** standing in your borders | 6 · 1 — 12 · 3 — 24 · 5 |
  | **The Laurels of the Age** | — | **T Triumphs earned this age** (deeds already spanning every arena; the count is the check) | 3 · 4 · 5 | [remove]
  | **The Tall Realm** | E | **three** cities each of **N citizens** with **a market and a granary**, joined to your capital by road | 8 — 12 — 16 | [remove]
  | **The Faith and the Sword** | D | a **religion founded** by you followed by **K cities**, and **a rival's unit killed inside a city that follows it** this age (the Crusade's ground) | 4 · 1 — 8 · 2 — 12 · 3 |

  What each asks across arenas: The Capital of the World — growth, building,
  a wonder. Bread and Iron — the farms and the levy at once. The War Chest —
  a treasury *and* an army, which is the thing a warmonger and a merchant
  each neglect. The Schooled Realm — wide *and* learned. The Merchant Princes
  — routes, luxuries, coin. The Pilgrim Empire — a faith at home and abroad
  with the faith to keep it. The Marcher Lords — expansion without the
  unhappiness and the overrun it usually costs. Hammer and Word — hammers
  and renown in one age. The Conqueror's Peace — a war *and* the diplomacy to
  end it. The Fortified Frontier — walls, garrisons and vigilance. The Full
  Ledger — no neglected voice. The Renowned Court — renown and the works it
  buys. The Laurels — the deeds themselves. The Tall Realm — three good
  towns, not one. The Faith and the Sword — religion and war on one ground.
  A wager that would need a new reading is deferred and annotated, never
  bent; every clause above reads something that exists (the "none unhappy",
  "no city pillaged" and "every city holds" clauses are folds over
  `citiesOf` the Ledger already walks).

  **The competency checks — one number, many causes** (the user, 2026-09-08:
  *"think single checks that check for overall competency. A good example:
  total trade yields check = player has founded multiple cities with markets,
  built buildings in their cities, set up trade routes"*). Each is a single
  reading the Ledger already folds, and each is reachable only by doing
  several things well — the check is the *number*, the competency is what it
  takes to move it. Measured 2026-09-08 on the same two bot duels (the mean
  empire by age; the bars are 1.5× that, or a floor where the bots are a poor
  yardstick — noted):

[ i'm just going to guess at numbers, let's playtest these. Could you add a statistics dashboard when implementing these that appears in the menu, with a flag so that it only appears when i'm playtesting locally? ]

[definitions: yields also include authority and happiness, when calculating 'total yields' ]
  | Wager | Family | The one number | What it takes to move it | mean II · III · IV | bar II · III · IV |
  |---|---|---|---|---|---|
  | **The Caravanserai** | E | total yields from trade routes | cities to run routes between, markets for the slots, buildings and luxuries at both ends, roads and safe roads | 0 · 5 · 7 *(bots barely trade — a human yardstick is owed)* | 50 · 100 · 400 |
  | **The Renowned** | C | total banked renown | specialist buildings across every family, wonders, great persons' works, the Orders that feed them | 80 250 1000 
  | **The Deck** | S | what your government yields, total | a government tier bought with culture, drafts taken well, Orders that multiply each other | 150 · 500 · 1500
  | **The Builders** | E | what your buildings pay a turn (the Ledger's buildings class) | many cities, each built up, the shares that multiply them | 11 · 47 · 136 | 17 · 70 · 200 |
  | **The Solvent Realm** | E | total gold accumulated | markets and routes and connections against a levy kept in proportion — the check a warmonger and a builder each fail from one side | −5 · +5 · +13 *(bots run in the red; the bar is a floor)* | 500 2000 8000 |
  | **The Six Voices** | — | food, production, gold, science, culture and faith a turn, summed | width and height at once; nothing neglected | 95 · 312 · 841 | 1000 · 5000 · 25000 | 
  | **The Lettered** | S | specialists at work | buildings with seats and the food surplus to fill them | 1 · 6 · 12 | 2 · 8 · 18 | [remove, specialists are too low agency for a victory condition]
  | **The Contented Trade** | E | happiness paid by luxuries | improved luxury tiles, the reveal technologies, workers with charges, lends from rivals, the Grand Bazaar | 8 · 27 · 69 | 12 · 40 · 100 | [remove, too map dependent]
  | **The Marvels' Pay** | C | what your wonders pay, accumulated | wonders raised in their age, in towns that keep them | 5 · 33 · 68 | 60 250 1000 | 
  | **The Tithe** | C | what your religion pays a turn (the Ledger's religion class) | a pantheon and a faith founded, beliefs that pay, temples in following towns | 0 · 6 · 34 | — · 125 · 800 | [age 3 and up only]
  | **The Worked Land** | E | total yields from tiles in your capital [this is the tile-maxxing strategy]
  | **The King's Roads** | E | gold from city connections, total | a wide realm joined to its capital by road, kept paved | *not measured* | — |

  These sit beside the compound wagers above rather than replacing them: a
  compound wager names the arenas, a competency check hides them inside one
  figure — the Balatro reading, where the score is the check and the deck is
  how you got there. The two unmeasured rows and the two where the bots are
  a poor yardstick want a human game's numbers before their bars are trusted.

  **The theme checks — a skill check per playstyle** (the user, 2026-09-08:
  *"more specific skill checks that were playstyle specific, maybe in line
  with our themes"*). The worksheet's fifteen lines (`docs/orders-and-
  doctrines.md` §Themes) are the playstyles the Orders are written for; each
  check below is one number that only a player *good at that line* reaches,
  because moving it takes the line's several skills at once — and the deal's
  guarantee (below) becomes **three different lines**, so a player is always
  offered a wager in a style they could play and picks the one they *are*
  playing. Every reading is a fold the Ledger already carries (a tile line
  names its improvement and its ground; a building line names its row; the
  meters name their sources), so each is a JSON row over an existing sum.

  | Line | Wager | The one number | The skills it takes | bar II · III · IV |
  |---|---|---|---|---|
  | 🌱 The Green Belt | **The Great City** | citizens in your largest city | fresh water, a granary and an aqueduct, farms improved, the happiness to keep growing, the luxuries behind it | 12 · 21 · 30 |
  | 🌾 The Ploughshare | **The Harvest** | food paid by **farms** a turn, across the realm | farms built and worked, the river and the Cistern, Harvest Blessing and the farm Orders, citizens placed on them | 20 · 60 · 140 |
  | ⛰ The Highlands | **The Quarrymen** | production paid by **hills and mines** a turn | hill towns founded, mines dug, veins surfaced, Mountain Hold and The Deep Delving, citizens on the slopes | 15 · 50 · 120 | [remove, not enough mines +production abilities in the game, keep on the backburner]
  | 🐫 The Long Caravan | **The Bazaar** | happiness paid by luxuries **plus** gold paid by luxuries, a turn | improved luxury tiles, the reveal technologies, workers, lends from rivals, the Grand Bazaar, Salt Tithes | 10 · 35 · 90 | [remove]
  | ⚓ The Tide | **The Admiralty** | what your trade routes pay a turn, **from coastal cities** | harbours and lighthouses, fishing boats worked, routes sent by sea, the Tide Orders | 4 · 15 · 30 | [remove]
  | ✶ The Star Chart | **The Observatory** | science a turn **per citizen** — the efficiency, not the mass | libraries and universities in every town, scholars seated, the science Orders, the Star Chart's shares; a wide realm of unschooled towns fails it | 1.5 · 2.5 · 4 | [this is great]
  | ☽ The Cloister | **The Scriptorium** | science paid by **faith buildings** a turn (Cathedrals of the Sky, The Curia, The Scriptoria, the consecrated Cathedral) | a religion founded and kept, temples and cathedrals raised, the beliefs and Orders that make faith pay learning | 4 · 15 · 40 | [great]
  | 🕯 The Procession | **The Tide of Faith** | cities in the world that **converted to your faith this age** (a flow of the tide, not a standing count) | a holy site placed well, pressure buildings, the road and the caravan clauses, lumps and proclamations timed | 3 · 5 · 8 | [remove]
  | 🏛 The Marble Court | **The Patronage** | renown a turn **plus** the works standing (each work counted as five) | specialist buildings across families, wonders, great people called and placed, the court Orders | 15 · 50 · 100 | [great]
  | 📜 The Charter | **The Founders** | cities founded this age **with authority never negative** at the age's close — a count that resets to nought the turn the writ overruns | settlers timed to the writ, monuments and charters raised ahead of the towns, the Charter Orders, the palace's six spent well | 2 · 4 | [remove: with authority never negative, only age 2 and age 3, settling new cities disadvantageous in age 4]
  | ⚒ The Forge Levy | **The Arsenal** | hammers put into **units** this age, across the realm | wide production, barracks and forges, the levy Orders, an army actually raised rather than a treasury hoarded | 150 · 600 · 1 800 | [great]
  | 🎖 The Banner | **The Field of Glory** | rival units killed this age **minus** units lost — the exchange, not the body count | choosing the ground, ranged before melee, generals, the war Orders, the campaign pressed and then stopped | +3 · +6 · +10 | [great]
  | 🏹 The Wild Hunt | **The Warden** | barbarian camps cleared this age **plus** raiders killed, weighted (a camp three, a raider one) | scouting the fog, a standing levy, the hunt Orders, the Horde's surge answered within its grace | 6 · 12 · 20 | [remove]
  | 🧭 The Wayfarers | **The Cartographers** | veins **surfaced** this age plus rivals' capitals **sighted** (each five) | explorers kept ranging, Prospecting, the map read and the world met | 3 · 6 · 9 | [remove, we removed veins]
  | 🜍 The Athanor | **The Great Work** | *(the last age's own — the Opus is its check; no wager)* | — | — |

  What makes these skill checks rather than meters: **The Observatory** is a
  ratio, so a wide realm cannot buy it with towns; **The Founders** resets on
  an overrun, so expansion past the writ scores nothing; **The Field of
  Glory** is an exchange, so a war of attrition fails it; **The Great City**
  asks that every citizen works, so a town grown on happiness alone with idle
  hands fails it. Every bar is a first cut; the tile-class and building-class
  folds (farms, hills, faith buildings, coastal routes) are readings the
  Ledger's lines carry today and want a probe each before the figures are
  trusted — the bot duels above measured the totals, not these slices.

- **Families.** Every card names one of the four bead families (D · C · S · E,
  `docs/beads.md`) **and one theme line**; ▢ (rec) the deal is guaranteed
  three cards from **three different lines** (and so from at least two
  families), so every build is offered a wager in a style it could play —
  and a competency check or a compound wager may be dealt beside two theme
  checks, never three of the generic kind at once.
- **What a wager may ask**: (rec) only readings the Ledger already prints —
  a meter, a count the `CountKind` vocabulary has, a fold of a voice over the
  age — so a card is a JSON row and the register test pins that every card's
  reading exists. A wager that would need a new reading is deferred and
  annotated, never bent.
- **"This age" counts**: a wager over a *flow* ("bank 300 culture") counts from
  the deal to the close (`Player.wagerBanked`, absolute stamps, nothing
  ticks); a wager over a *standing* ("12 citizens in one city") reads the
  board at the close.

### 3b. The consolidation — a proposed cut/keep list (2026-09-08)

After the user's marks the pool stands at **41** cards (12 generic, 3
survivors, 9 compound, 10 competency, 7 theme). A game deals nine (three
ages × three), so a pool of ~24 gives a different hand every game without
diluting the ones that matter. The cut principle: **one reading, one card**
— where a generic row and a competency or theme row read the same number,
the one with the skill framing stays; where the user has ruled a mechanic
out (religious spread, luxury deals, specialists), every row leaning on it
goes. ▢ Mark each row; (rec) stands unless overruled.

**Keep — 24** (the user's marks of 2026-09-09 folded in: The Schooled Realm,
The Scriptorium and The Fortified Frontier cut; The Academies now *total
science accumulated*; The Tithe *total yields from religion*; The Patronage
*yields from great people*; two added — *Total culture banked* and *Total
surplus happiness, accumulated*; The Six Voices' basis is **accumulated**;
The Missionary stays cut). Family in the second column (D · C · S · E), the
line it is dealt under in the third. Bars marked *bot baseline* are to be
measured on the bot bench before the figure is set; the user: "use the bot
for a baseline here".

| Wager | Fam | Line | Reads | II · III · IV |
|---|---|---|---|---|
| The Capital of the World | C | 🌱 Green Belt | capital holds N citizens, M buildings, a wonder | 10·5·1 — 16·11·2 — 25·16·3 |
| The Worked Land | E | 🌱 Green Belt | total yields from the capital's tiles | *bot baseline* |
| The Harvest | E | 🌾 Ploughshare | food paid by farms a turn | 20 · 60 · 140 |
| Bread and Iron | D | 🌾 Ploughshare | food surplus a turn and army strength | 12·150 — 25·480 — 40·1 000 |
| The Caravanserai | E | 🐫 Long Caravan | total yields from trade routes | 50 · 100 · 400 |
| The King's Roads | E | 🐫 Long Caravan | gold from city connections, total | *bot baseline* |
| The Solvent Realm | E | 🐫 Long Caravan | total gold accumulated | 500 · 2 000 · 8 000 |
| The War Chest | E | 🐫 Long Caravan | treasury and army, no debt | 300·150 — 1 000·480 — 2 500·1 000 |
| The Academies | S | ✶ Star Chart | total science accumulated | *bot baseline* |
| The Observatory | S | ✶ Star Chart | science a turn per citizen | 1.5 · 2.5 · 4 |
| The Tithe | C | ☽ Cloister | total yields from religion (Æra III+) | — · 125 · 800 |
| The Wonder of the Age | C | 🏛 Marble Court | wonders of this age raised by you | 3 · 3 · 3 |
| The Marvels' Pay | C | 🏛 Marble Court | what your wonders pay, accumulated | 60 · 250 · 1 000 |
| The Patronage | C | 🏛 Marble Court | yields from great people — works standing, boons paid, legacies — accumulated | *bot baseline* |
| The Renowned | C | 🏛 Marble Court | total banked renown | 80 · 250 · 1 000 |
| The Chronicle | C | 🏛 Marble Court | total culture banked | *bot baseline* |
| The Deck | S | 📜 Charter | what your government yields, total | 150 · 500 · 1 500 |
| The Marcher Lords | E | 📜 Charter | C cities, none unhappy, authority in surplus | 5 — 9 — 18 |
| The Builders | E | 📜 Charter | what your buildings pay a turn | 17 · 70 · 200 |
| The Six Voices | — | 📜 Charter | every voice summed, **accumulated over the age** (with authority and happiness) | 1 000 · 5 000 · 25 000 |
| The Contented Realm | E | 📜 Charter | surplus happiness, accumulated a turn over the age | *bot baseline* |
| The Arsenal | D | ⚒ Forge Levy | hammers put into units this age | 150 · 600 · 1 800 |
| The Field of Glory | D | 🎖 Banner | kills minus losses this age | +3 · +6 · +10 |
| The Taken Town | D | 🎖 Banner | cities captured this age, still held | 1 · 3 · 5 |

By family: D 5 · C 7 · S 3 · E 8 (The Six Voices unfamilied). By line:
eight lines carry cards (☽ Cloister one, The Tithe); 🏹 Wild Hunt, 🧭
Wayfarers and 🕯 Procession carry none, ⛰ Highlands on the backburner, so the
deal's guarantee is **three different lines** over the eight.

**Cut — 19**, each with the row that covers it.

| Cut | Why |
|---|---|
| The Metropolis · The Great City | one reading (largest city's citizens), twice; The Capital of the World asks the same growth *and* the buildings and the wonder behind it |
| The Many Hearths | The Marcher Lords is the same count with the writ and the happiness that make it a skill |
| The Caravans | identical to The Caravanserai |
| The Standing Army | a subset of Bread and Iron, The War Chest and The Arsenal |
| The Conqueror | identical to The Taken Town |
| The Laureates | The Patronage and The Renowned read the renown that calls them |
| The Roads | The King's Roads is the same road network read as the gold it pays |
| The Counting House | The Solvent Realm and The War Chest read the treasury |
| The Chroniclers | culture a turn is what The Deck's total government pay is made of; The Six Voices carries the breadth |
| The Congregation | faith banked; The Tithe reads what faith buys, and the user reads religion as bonuses, not a target |
| The Faithful · The Missionary | following cities, home and abroad — the spread mechanic the user cut The Pilgrim Empire and The Tide of Faith for (▢ The Missionary carried the user's own figures 3·4·5; cut for consistency, rec) |
| The Faith and the Sword | needs a following city *and* a battle inside it — contingent on rivals' geography and on the spread the user ruled tedious |
| Hammer and Word | a wonder and a great person at 1·1 — both already asked by The Wonder of the Age and The Patronage, at a harder bar |
| The Renowned Court | The Patronage, which the user marked great, is the same two readings |
| The Schooled Realm · The Scriptorium · The Fortified Frontier | the user's marks of 2026-09-09 — cut |

**The four marks, resolved (2026-09-09).** The Six Voices is *accumulated
over the age*; The Fortified Frontier is cut; The Academies stays, as *total
science accumulated*; The Missionary stays cut. The user's note on the
competency table — a dev-flagged **statistics sheet** printing every wager
reading for the local seat each turn — is batch G2's ruling; *"yields also
include authority and happiness"* defines the total-yields readings.

**Progress is public, the pick is private — RULED** (the user, 2026-09-09:
*"I want the wagers each player has chosen to be private, but the wager
progress public. So the wager options are the same for every player, and
every turn progress is updated so you see where you stand compared to the
other players … there isn't as much stakes if you don't know how the other
players are doing"*): the wager sheet shows, for each of the three dealt
cards, **every seat's standing against the bar, ranked, updated every
turn** — the figure each seat has reached, who leads, who has claimed it —
while *which* card each seat staked on stays that seat's own until the
judgement. The standings are the same reading the bars are judged by
(`countOf` and the meters), so a rival's row is exact, not an estimate; the
sheet is the one surface that shows another empire's figure, which is the
"select visibility into their empire's progress/yields" the user asked for.
The bars are cut **difficult** (the user: "we should make the wagers
difficult to make games more engaging"), and the pressure comes from the
ranking, not from the deck.

### 3a. The scaling — a first cut off measured play

**Measured 2026-09-08**: two bot duels (seeds 4242 and 20260903, two balanced
seats, barbarians on) sampled every ten turns for 220 turns, 88 samples. The
mean empire, by the age its own tree stands in:

| Æra | samples | cities | citizens | largest city | buildings in one city | luxuries | army | wonders | routes | food/t | prod/t | gold/t | sci/t | culture/t | faith/t |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I | 21 | 1.9 | 6 | 4.3 | 0.7 | 0.3 | 42 | 0.1 | 0 | 16 | 11 | 2.6 | 4.5 | 3.1 | 1.1 |
| II | 15 | 3.3 | 15 | 7.1 | 3.5 | 1.0 | 101 | 1.5 | 0 | 41 | 28 | 6.8 | 10.3 | 6.7 | 2.7 |
| III | 44 | 6.2 | 34 | 11.1 | 7.4 | 2.9 | 320 | 3.5 | 2.0 | 100 | 93 | 47 | 28 | 36 | 8.5 |
| IV | 8 | 11.8 | 69 | 17.5 | 10.9 | 4.9 | 679 | 5.6 | 4.0 | 177 | 276 | 106 | 79 | 165 | 39 |

Ages on these boards: Æra I ends about turn 60, Æra II about turn 100, Æra
III between turns 190 and 210, and Æra IV runs to the Opus — so an Æra II
wager has forty turns, an Æra III one ninety, which is why the sizing turns
below differ by age. **Two caveats**: these are *bots* on a *duel* map — a
human plays wider and taller than a balanced bot, and a six-seat standard
map's mean will differ — and the mean is what (b) scales off *at the deal*,
so a stronger world lifts its own bars. The table is a first cut for the
arena, not a ruling.

**How the fixed figures were cut** (the scaling is fixed per age — §3, ruled —
so this is the *derivation* of the journeyman figures, not a rule the game
runs): a standing bar is `ceil(1.5 × the measured mean standing)`; a flow bar
is `friendly(1.5 × the mean per turn × 30 · 60 · 40 sizing turns)`; the two
per-turn wagers (The Academies, The Chroniclers) are `ceil(1.5 × the mean
rate at the age's close)`. What the table would ask this world:

| Wager | Æra II | Æra III | Æra IV | note |
|---|---|---|---|---|
| The Counting House (gold banked) | 300 | 4 200 | 6 400 | — |
| The Academies (science a turn at the close) | 16 | 42 | 120 | — |
| The Chroniclers (culture a turn at the close) | 10 | 54 | 250 | — |
| The Congregation (faith banked) | 120 | 770 | 2 300 | — |
| The Metropolis (largest city) | 11 | 17 | 26 | 8 · 12 · 18 |
| The Many Hearths (cities) | 5 | 9 | 18 | 4 · 6 · 10 |
| The Caravans (what your routes pay a turn) | 8 | 30 | 60 | *routes' pay needs a measurement; first cut* |
| The Standing Army (strength) | 150 | 480 | 1 000 | 100 · 300 · 600 |
| The Marvels (wonders held) | 2 | 5 | 8 | 2 · 3 · 5 |
| The Roads (cities joined to the capital) | 2 | 4 | 8 | 2 · 3 · 5 |
| The Conqueror (cities captured this age) | 1 | 1 | 2 | 1 · 1 · 1 |
| The Faithful (following cities) | 3 | 5 | 8 | 2 · 4 · 6 |
| The Laureates (great people this age) | — | — | — | *needs a measurement* |

The Laureates and the routes' pay want a probe before their figures are
trusted; every figure above is a first cut for the arena. ▢ Whether a flow wager counts from the
**deal** or from the **age's opening** — one and the same now that the deal
is the age's first turn (§2); a flow's stamp is `Player.wagerBanked` from
that turn.

## 4. The malice

**Ruled** (the user, 2026-09-08): *"the malice be a card that must remain
slotted in your government with a malice effect."* So a malice is an Order
with a bad face: it sits in one of your chairs, it cannot be unslotted, and it
pays its effect through `liveEffects` exactly as the Order beside it does —
the same vocabulary, the same describer, the same Compendium entry, the
Ledger crediting its lines to it in red. It costs you the chair, which is the
sharper half of the punishment: a Government III realm with eight chairs
loses an eighth of its deck.

- **Which chair.** ▢ (rec) the malice names a flavour (military · economic ·
  wildcard, like an Order) and takes the **last** chair of that flavour; the
  Order sitting there is unslotted into the hand (its seal broken, no refund
  needed — nothing was spent). A realm with no chair of that flavour takes it
  in a wildcard; a realm with no free chair at all still takes it — the malice
  is never refused.
- **How long.** ▢ (rec) until the **next age's wager is judged**: met, the
  malice leaves the chair; missed, the old malice stays and a new one joins
  it. The comeback is the point — a malice is a debt the next wager pays.
  Adoption (a new government) rebuilds the slots with total amnesty for
  Orders' seals, ▢ (rec) but a malice survives adoption and re-seats itself.
- **Stacking.** ▢ (rec) at most two malices in the chairs at once; a third
  failure replaces the older one rather than adding.
- **Drawn how.** From `data/malices.json` by `state.rng` at the judgement,
  one per failed seat; a seat never holds two copies of the same malice.
  Announced to every seat (the deed sheet's flip).
- **Bots** take malices like anyone; the bot's appraisal already prices a
  slotted card, so a malice's negative lines price themselves.

**Example malices** — each one card effect the vocabulary already has, worded
as a card would be. Numbers are a first cut.

| Malice | Chair | Effect (card vocabulary) | Voice |
|---|---|---|---|
| The Lean Years | economic | −1 food in every city (`pays` city flat) | E |
| The Idle Hands | economic | −10% production in every city (`percentYields`) | E |
| The Debased Coin | economic | −2 gold in every city | E |
| The Closed Schools | wildcard | −10% science in every city | S |
| The Silent Choirs | wildcard | −10% culture in every city | C |
| The Doubting Flock | wildcard | your religion presses half as hard (`pressureRule`) | C |
| The Restless Cities | wildcard | −1 happiness in every city (`happiness`) | E |
| The Thin Ranks | military | −1 combat strength for all your units (`combatLine`) | D |
| The Deserters | military | your units cost +1 gold a turn in maintenance (`upkeepSurcharge`) | D |
| The Broken Levies | military | +50% production toward units costs −50% (`productionBonus` −50, units) | D |
| The Short Draft | wildcard | your Order drafts show one card fewer (`offerRider`) | — |
| The Heavy Writ | wildcard | −2 authority capacity (`authority`) | — |

Twelve, three a chair-flavour plus three wildcards; the register test pins
that every malice's effect kind is one the evaluator reads.

## 5. What it replaces, what stays

- **Reckonings retire** (rec): the wager *is* the age's snapshot, taken for
  everyone rather than paying the leader. Their eight rows keep their bodies
  (`retired: true`) for saves.
- **Feats, quests, endeavours stay as the deeds** — the world firsts and the
  races are a different pleasure from a bar you set yourself, and the user's
  arithmetic counts them.
- **The bead Orders** (the four last-age deed cards) stay.
- ▢ The age-opening **deed sheet** becomes the **wager sheet**: the three
  cards face up, the countdown, every seat's declared choice, and the
  standing of each wager against each seat (rec — the Abacus's flip modal
  stays for the award).

## 6. Bots

- A bot chooses the wager whose reading its own appraisal (`ValueContext`)
  values highest relative to its current standing — the want book gains a
  *wager want* with the bar as its stock, so the bot leans into it as a player
  would, and the arena panel walks the knob (`ai.wager.*`). The spectate feed
  prints the choice with its terms. This is batch **W2** after the sim lands.

## 7. Rulings needed before anything flies

0. ~~§2 the first deal~~ — **ruled**: no wager in Æra I.
1. §1 progress = the mean age of each empire's highest tech (rec) — or of
   beakers banked?
2. ~~§2 Æra V~~ — **ruled**: Æra V, when added, has no wager; Æra IV keeps
   its own.
3. ~~§2 the choice window and public choices~~ — **ruled**: same turn, secret.
4. ~~§3 scaling~~ — **ruled**: fixed per age; difficulty deferred to the
   bot. Open: the family guarantee (rec yes); **which of the fifteen compound
   wagers to keep** (§3), and their first-cut figures; whether every standing
   wager is claimed the moment it is met (rec yes, from the Missionary
   note).
5. §4 the malice's chair (rec: the last chair of its flavour, displacing the
   Order there), its term (rec: until the next wager is judged), stacking (rec:
   two).
6. §5 reckonings retire (rec yes).
7. §9 the Horde: the count per seat (rec yes); the grace (rec 15 turns).

## 9. The Horde — an escalating check at every age

The user: *"an escalating military check on players — at the beginning of
each age, new barbarian camps spawn, and their units are upgraded. Let's think
about how we could do this in a way that feels fun and not punishing to
players who are 'along curve'."*

**What exists.** The wild already musters against the **median** real seat's
technology tree (`barbarianTier`, `barbarians.ts`): its footmen and horsemen
are whatever the middle of the pack could build, so an on-curve player already
meets raiders of their own tier. Camps found from turn 6, three every two
turns up to 24, never within 4 of a city or 6 of a start; a camp musters a
unit every 5 turns (two at most); clearing one pays 25 gold and 25 food and
is a deed. What is missing is the *event*: nothing marks an age's opening, and
the pressure is a flat trickle.

**The design principle** (rec): the check is **a surge announced ahead, sized
to the world's mean, that pays to answer**. Fun for the on-curve player comes
from three things — knowing it is coming, being able to see it, and being
rewarded for meeting it — and punishment comes from the opposite three.

- **The surge.** When the world's age closes (§1's countdown reaching nought),
  **the Horde stirs**: `rules.horde.campsPerAge[age]` new camps found at once
  on the same placement rules (rec 3 · 4 · 5 for Æra II · III · IV), each
  mustering **at once** rather than after five turns, and every standing camp
  musters one more. The wild's tier steps to the world's **new** mean age on
  the same turn (it already follows the median seat; this pins the step to the
  age boundary so the upgrade is one event, not a drift).
- **Announced ahead.** The countdown card says it: "Æra II closes in 7 turns —
  the Horde stirs when it does." A player who has kept up has seven turns to
  garrison; one who has not has been told what the bill is.
- **Where.** ▢ (rec) the surge's camps found **at the edge of the world's
  borders**, never inside 4 of any city (today's rule) and (new) never inside
  the ring of hexes any real seat can see this turn — the Horde comes out of
  the fog, which is where a horde should come from. **RULED** (the user,
  2026-09-08): a surge camp **cannot found within a city's sight** (the ring
  a town sees — `citySight`), but **may found within a unit's sight** — a
  scout watching a valley can see the Horde arrive, which is what a scout is
  for, and a town is never ambushed from a hex its walls could see.
- **Sized to the mean, never to the leader — RULED** (the user, 2026-09-08):
  the wild's units are **the lesser of** the premier units of the *previous*
  world age (§1's clock, one age back — the best footman and horseman the
  last age's tree opens) **and** the median seat's roster (today's
  `barbarianTier`) — `min` of the two tiers, so the Horde never outruns the
  middle of the pack and never outruns the age the world has just left. A
  surge camp founds **with three units** (mustered at once, `rules.horde.
  surgeUnits` 3) and musters at **1.5× the Æra I rate** thereafter
  (`unitEveryTurns` 5 → a surge camp's own `surgeUnitEveryTurns` ≈ 3). ▢ (rec)
  the surge's *count* still scales with the number of real seats (camps per
  seat, not per world).
- **It pays.** ▢ (rec) a surge camp carries a bigger bounty — `campClearGold`
  × the age (50 · 75 · 100) — and **The Camp-Burners** wager (§3) is dealt
  more often in an age with a surge, so meeting the check is a bead, not a
  chore. A camp the Horde founded and nobody cleared within
  `rules.horde.graceTurns` (rec 15) starts **raiding harder** (its raiders
  gain the age's `combatBonus`) — the check bites those who ignored it, not
  those who answered it. **RULED** (the user, 2026-09-08, "let's make the
  rewards meaningful"): clearing a surge camp pays **a discovery** — the
  ruin's own mechanism (`claimDiscoveryAt`, a find drawn from a pool by
  `state.rng`) with a **Horde pool** of its own, sized by the age (Æra II ·
  III · IV):
  - 100 · 200 · 400 gold
  - 50 · 100 · 200 science
  - 50 · 100 · 200 culture
  - 75 · 150 · 300 faith
  - +1 citizen in your nearest city (confirmed, 2026-09-08)
  - a random military unit (the roster the clearer could build today, the
    Camp Followers' reading)
  The find is announced as a ruin's is (the discovery card), and the ordinary
  `campClearGold`/`campClearFood` bounty is folded into it rather than paid
  beside it. The pool lives in `data/discoveries.json` beside the ruins',
  walked by the Compendium.
- **Not punishing when on curve**, stated as the tests the batch must pass on
  the arena: a balanced bot that has kept pace loses **no city** to a surge
  across a hundred games; a seat that is one age behind the mean loses at
  most an outlying town; the surge's camps are cleared within the grace by an
  on-curve seat more often than not. If a first cut fails those, the dials
  are `campsPerAge`, the muster and the grace — not the tier.
- **What it is not** (rec): no Horde units that outrank the median seat's
  roster (that is the "punishing" reading), no spawning inside sight, no
  surge in Æra I (the opening keeps today's trickle), no surge when the Opus
  is open (the last age's close is the game's).

Batch **H1** after G1 (it reads the same countdown). Knobs in
`rules.horde`; the arena panel walks `data/ai.json` only, so the surge's
measured effect on bot seats is read off the arena's per-seat averages.

## 10. The census — a periodic world ranking (proposed, not ruled)

The user, 2026-09-09: *"every few turns, a notification is shown of every
player's yield of a major stat (i.e. Hipparchus has published his census of
the world's science, with each player ranked by their science yield). We
could surface stats like total technologies, culture/science/food/production/
gold per turn, total statecraft drafts, number of followers of each religion,
etc."* — offered with less confidence than the wager rulings above.

The orchestrator's view: **worth building, as the wager sheet's sibling
rather than a stream of toasts.** It is the same principle the user just
ruled for the wagers — stakes come from seeing where the others stand — and
it costs almost nothing, because every reading it would rank is a fold the
Ledger already prints for the local seat. Three shapes to choose between:

- (a) **A toast every N turns** naming one stat and the ranking. Cheap and
  loud; the risk is notification fatigue, and a toast that names a rival's
  exact science every ten turns is a lot of visibility given away for free
  against a rival who is not looking.
- (b) **A census page** — a tab on the Abacus (the world ledger): every stat
  ranked, refreshed on a cadence (rec every ten turns, `rules.census.every`),
  with ONE toast when the census is taken ("Hipparchus has taken the census of
  Æra II — you stand third in science, first in culture"). The page is the
  reference; the toast is the summons. (rec)
- (c) **The census as a wager reading**: the ranking itself is what some
  wagers ask — "lead the world in science at the close" — which turns a
  bar into a race the user has so far avoided ("a wager is a bar, not a
  race"). Not recommended for the deck; fine as a Triumph.

What to rank (rec, one row each, the user's list): technologies held;
science, culture, food, production, gold and faith a turn; drafts taken;
followers of each faith; cities and citizens; army strength; beads. The
great person's name on the census is flavour and stays labelled so.
▢ the user's call on (a) vs (b), and the cadence.

## 8. Engine notes (the orchestrator's, not decisions)

Schema. New state: `GameState.worldAge` (derived, not stored — the mean is a
reading) but `GameState.ageClose?: {age, turn}` (the countdown, absolute) and
`GameState.wagers: {age, dealt: WagerId[3], judged: boolean}[]` (append-only,
like triumphs) with each seat's pick on `Player.wager: {age, index}` — the
state carries every pick (a replay must), and *secrecy* is a UI gate exactly as
`localPlayerId` is: a sheet shows a rival's pick only after the judgement;
`Player.malices: {id, untilAge}[]`; a claimed wager is an announced
occasion (`wagerClaimed`) the Abacus flips on. The deal in the `renown` phase of the deal turn; the
judgement in the phase that closes the age; `chooseWager` a command with the
usual gates. The wager readings reuse `countOf`/the meters; a new
`data/wagers.json` and `data/malices.json`, both walked by the Compendium and
sync-tested against `docs/wager.md`'s tables once the rows are written. The
Abacus and the top bar's age card read the countdown. Batches: **G1** (the
clock and the countdown, retiring the first-seat rule) → **G2** (the deal,
the choice, the judgement, the sheet) → **G3** (the malice deck) → **W2** (the
bots). Each a schema.

## Revisions

*(yours — edit away)*

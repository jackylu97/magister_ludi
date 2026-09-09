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
builder wins) and the world clock — **built** as §1 states it (batch G1,
schema 101): the mean of the board, with a ten-turn countdown. Until G1 an age
opened the turn the **first** seat reached it.

## 1. The global age — one clock, averaged

**BUILT — batch G1, schema 101** (2026-09-09). The whole of this section is
code: `src/sim/worldClock.ts` (the readings, a leaf), the `worldClock` phase in
`END_OF_TURN_PHASES` directly before `beads` (its body in `beads.ts`, which owns
the age's own table), `GameState.ageClose` (one absolute `{age, turn}` stamp,
nothing stored and nothing ticking), the `ageClosed` occasion, and
`rules.wager.countdown` / `rules.wager.lastAgeTurns`. The first-seat rule —
`BeadTable.worldAge`, a stored clock raised by `Math.max` over the seats — is
**retired**, which settles the flags board's open Abacus world-clock ruling. The
top bar's age card carries the age and the countdown. `test/sim/worldClock.test.ts`
is the register.

- **The world's age is the mean of every real player's progress** (`realPlayers`),
  not the first seat's. **RULED** (§11): *progress* = the age of each empire's
  highest researched technology, averaged and floored — an **eliminated** seat is
  excluded, so a conquered rival frozen in Æra I does not hold the survivors
  back — so the world enters Æra II when
  the average empire has; a runaway leader does not drag everyone into an age
  they have not reached, and a lagging bot does not hold the leader back for
  ever, because the mean moves as soon as most seats do.
- **The countdown.** When the mean first crosses into the next age, the current
  age is given **10 turns** to close (the user's figure; `rules.wager.countdown`).
  At the close the age's occasion is announced to every seat (`ageClosed` — the
  moment G2 judges its wagers on), the closing age's reckonings are taken, and
  the new age opens. **RULED**: the countdown is public on the top bar's age
  card ("Æra II · closes in 7 turns") — a wager with a hidden deadline is a coin
  toss. The Abacus prints no age today and gains one with G2's rework.
- **What the clock gates**: only the calendar — the wager deals, the age's deed
  table, the age-entry occasions. It does **not** gate research or the tree (an
  empire may research ahead of the world) and it does not move the Opus door:
  `worldTechReached` (`tech.ts`) is a *different* question — has anybody
  anywhere reached this node — and stays the first seat's reading, because a
  finish line announces itself to all contestants at once. The bead tables that
  opened "on the world's clock" (the open Abacus ruling on the flags board) open
  on *this* clock, which settles that ruling too.
- The **first** age has no countdown to start it and deals no wager (§2,
  ruled): `ageClose` absent *is* the first age, which is also what a save from
  before G1 loads as. The **last** age closes only by the Opus; its wager (Æra
  IV's, while the chart ends there — §2) is judged when the Opus is raised or at
  `rules.wager.lastAgeTurns` (40) after the age opened, whichever is first —
  built as one comparison rather than as two rules: the last age's stamp is
  written the turn it opens, and `closeTheGreatWork` pulls it forward to *now*.

## 2. The deal — three targets, five turns in

**BUILT — batch G2, schema 102** (2026-09-09). The whole of this section is
code: `data/wagers.json` (the deck), `src/sim/wagerData.ts` (the rows and the
one reading vocabulary), `src/sim/wagers.ts` (the deal, the standing, the claim,
the judgement), the `wagers` phase in `END_OF_TURN_PHASES` between `worldClock`
and `beads`, `chooseWager` in the reducer, the `'wager'` End Turn blocker, the
`wagerClaimed` occasion, and two screens — `src/ui/wagerSheet.ts` (the deal
sheet, the eleventh on `modalShell.ts`) and the Abacus reworked as the wager
screen (`src/ui/abacusScreen.ts`). `test/sim/wagers.test.ts` and
`test/sim/wagerDocSync.test.ts` are the register.


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

**BUILT.** The table below is `data/wagers.json` and is **sync-tested** against
it (`test/sim/wagerDocSync.test.ts`): a row edited in one place and not the other
fails core. The *Reads* column is the row's member of `WagerCount` — the closed
reading vocabulary of `src/sim/wagerData.ts`, every member of which is a fold the
Ledger already prints — and a clause row's figures are one group per clause.

| Wager | Fam | Line | Reads | Kind | II · III · IV |
|---|---|---|---|---|---|
| The Capital of the World | C | 🌱 Green Belt | `clauses: capitalCitizens, capitalBuildings, capitalWonders` | standing | 10·16·25 — 5·11·16 — 1·2·3 |
| The Worked Land | E | 🌱 Green Belt | `capitalTileYields` | flow | 4500 · 9000 · 11000 |
| The Harvest *(deferred)* | E | 🌾 Ploughshare | `farmFood` | standing | 20 · 60 · 140 |
| Bread and Iron | D | 🌾 Ploughshare | `clauses: foodSurplus, armyStrength` | standing | 60·150·265 — 150·480·1000 |
| The Caravanserai | E | 🐫 Long Caravan | `tradeYields` | flow | 50 · 2500 · 3000 |
| The King's Roads | E | 🐫 Long Caravan | `connectionGold` | flow | 40 · 900 · 1100 |
| The Solvent Realm | E | 🐫 Long Caravan | `gold` | flow | 1600 · 8500 · 10000 |
| The War Chest | E | 🐫 Long Caravan | `clauses: treasury, armyStrength` | standing | 300·1000·2500 — 150·480·1000 |
| The Academies | S | ✶ Star Chart | `science` | flow | 4000 · 16000 · 20000 |
| The Observatory | S | ✶ Star Chart | `sciencePerCitizen` | standing | 3 · 4 · 5 |
| The Tithe | C | ☽ Cloister | `religionYields` | flow | 0 · 6400 · 8000 *(Æra III+)* |
| The Wonder of the Age | C | 🏛 Marble Court | `wondersOfThisAge` | standing | 3 · 3 · 3 |
| The Marvels' Pay | C | 🏛 Marble Court | `wonderYields` | flow | 900 · 4500 · 5500 |
| The Patronage | C | 🏛 Marble Court | `peopleYields` | flow | 650 · 2900 · 3500 |
| The Renowned | C | 🏛 Marble Court | `renown` | flow | 1000 · 5000 · 6000 |
| The Chronicle | C | 🏛 Marble Court | `culture` | flow | 3700 · 14500 · 18000 |
| The Deck | S | 📜 Charter | `deckYields` | flow | 2800 · 11000 · 13000 |
| The Marcher Lords | E | 📜 Charter | `clauses: cities, happiness, authority` | standing | 5·9·18 — 0·0·0 — 0·0·0 |
| The Builders | E | 📜 Charter | `buildingYields` | standing | 120 · 240 · 300 |
| The Six Voices | E | 📜 Charter | `allVoices` | flow | 25000 · 85000 · 100000 |
| The Contented Realm | E | 📜 Charter | `happinessSurplus` | flow | 650 · 700 · 900 |
| The Arsenal *(deferred)* | D | ⚒ Forge Levy | `unitHammers` | flow | 150 · 600 · 1800 |
| The Field of Glory | D | 🎖 Banner | `killsMinusLosses` | flow | 3 · 6 · 10 |
| The Taken Town | D | 🎖 Banner | `capturedThisAge` | standing | 1 · 3 · 5 |

Two rows are **deferred and annotated** rather than bent into a near-fit, which
is the vocabulary's own convention: **The Harvest** wants the food a *farm* pays
told apart from the food the ground under it pays, and **The Arsenal** wants the
hammers a town put behind a *soldier* told apart from its other work. Neither
line exists in `docs/yields.md`'s sequence today; both rows keep their bodies, so
shipping either is deleting a `deferred`. A deferred row leaves every pool.

Two figures in the table are the deck's own shape rather than a bar: **The
Marcher Lords**' second and third clauses ask for nought — contentment and
authority *at or above nothing* — which is what "none unhappy, authority in
surplus" means as a number; and **The Tithe**'s Æra II figure is nought because
the row is not dealt before Æra III (`fromAge`).

One departure from the worksheet: **every card names a family**. §3b left The Six
Voices unfamilied, and the beads a kept wager mints are ordinary repeatable grant
rows that have to land on a rod — so the row is economic, and a fifth rod for one
card was not worth minting.

**As built**, by family: D 4 · C 7 · S 3 · E 10 (The Six Voices is economic — see
above; the two deferred rows are one E and one D). By line, nine carry a row and
**eight can be dealt from in Æra II** (☽ Cloister's one card is Æra III and up,
⛒ Forge Levy's one row is deferred): 🏹 Wild Hunt, 🧭 Wayfarers, 🕯
Procession and ⚓ The Tide carry none, ⛰ Highlands is on the backburner. So the
deal's guarantee — **three different lines** — has seven to eight bags to draw
from in every wagering age, which `wagerDataProblems` checks and
`test/sim/wagers.test.ts` pins.

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
reading for the local seat each turn — is **not built in G2**: the Abacus's
standings band shows every seat's figure against each of the three dealt bars
every turn, which is the same reading a statistics sheet would have printed and
is on a surface the player already has. A dev-flagged sheet over the *whole*
vocabulary (every reading, dealt or not) is worth building beside batch C1's
census, which ranks any reading across the board — flagged there rather than
here. *"Yields also include authority and happiness"* is **deferred and
annotated**: the total-yields readings (`tradeYields`, `buildingYields`,
`deckYields`, `religionYields`, `peopleYields`, `wonderYields`,
`capitalTileYields`) sum the Ledger's six voices for one class, and the Ledger
has no authority or happiness column to add — the two meters are read by
`happiness`/`authority` and `happinessSurplus` as readings of their own.

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

### 3a. The scaling — the bars, and the bench they were cut on

**How the built figures were cut — measured 2026-09-09** (the bench the brief
named: the bot driver, seeds **1** and **20260903**, `standard`, two balanced
seats — Crimson and Teal — barbarians on, the stepper, 240 turns each, four
readings a seat an age). Every reading in the vocabulary was sampled **at each
age's close, in that age's own window** — a flow as `now − the deal's stamp`, a
standing as the board — and the bar is `1.5 × the mean`, floored to a friendly
figure. Both seeds reached Æra IV and neither closed it inside 240 turns, so the
Æra IV column is an **extrapolation** and says so.

Ages on these boards: Æra I closed about turn 60 and Æra II about turn 100 on
both seeds, Æra III between 190 and 210, and Æra IV was still running at 240.

| Reading | mean Æra I | mean Æra II | mean Æra III | bar II · III · IV |
|---|---|---|---|---|
| `capitalTileYields` (The Worked Land) | 1 601 | 3 075 | 6 068 | 4 500 · 9 000 · 11 000 |
| `tradeYields` (The Caravanserai) | 0 | 2.5 | 1 710 | 50 · 2 500 · 3 000 |
| `connectionGold` (The King's Roads) | 0 | 0 | 581 | 40 · 900 · 1 100 |
| `gold` (The Solvent Realm) | 292 | 1 071 | 5 782 | 1 600 · 8 500 · 10 000 |
| `science` (The Academies) | 666 | 2 721 | 10 726 | 4 000 · 16 000 · 20 000 |
| `sciencePerCitizen` (The Observatory) | 1.2 | 1.9 | 2.6 | 3 · 4 · 5 |
| `religionYields` (The Tithe) | 131 | 626 | 4 274 | — · 6 400 · 8 000 |
| `wonderYields` (The Marvels' Pay) | 118 | 624 | 3 141 | 900 · 4 500 · 5 500 |
| `peopleYields` (The Patronage) | 92 | 427 | 1 961 | 650 · 2 900 · 3 500 |
| `renown` (The Renowned) | 248 | 685 | 3 390 | 1 000 · 5 000 · 6 000 |
| `culture` (The Chronicle) | 642 | 2 483 | 9 731 | 3 700 · 14 500 · 18 000 |
| `deckYields` (The Deck) | 496 | 1 857 | 7 318 | 2 800 · 11 000 · 13 000 |
| `buildingYields` (The Builders, a turn) | 24.5 | 78 | 159 | 120 · 240 · 300 |
| `allVoices` (The Six Voices) | 5 589 | 16 521 | 56 695 | 25 000 · 85 000 · 100 000 |
| `happinessSurplus` (The Contented Realm) | 203 | 449 | 440 | 650 · 700 · 900 |
| clauses held: The Capital of the World | 3.0 | 2.8 | 1.5 | *(unchanged — the user's figures)* |
| clauses held: Bread and Iron | 2.0 | 2.0 | 1.5 | food raised to 60 · 150 · 265 |
| clauses held: The War Chest | 2.0 | 1.8 | 0.8 | *(unchanged — see below)* |
| clauses held: The Marcher Lords | 2.8 | 2.5 | 2.0 | *(unchanged — 1.5× the §3a means)* |
| `wondersOfThisAge` (The Wonder of the Age) | 0 | 0 | 0 | 3 · 3 · 3 *(the user's: "must be difficult")* |
| `capturedThisAge` (The Taken Town) | 0 | 0 | 0 | 1 · 3 · 5 *(the user's)* |
| `killsMinusLosses` (The Field of Glory) | −5.0 | −5.5 | −17.8 | 3 · 6 · 10 *(the user's)* |

**Æra IV**, in every row above, is an extrapolation and not a measurement: the
per-turn rates roughly double from Æra III to Æra IV (the 2026-09-08 table below)
while the window roughly halves (`rules.wager.lastAgeTurns` is 40 against Æra
III's ninety), so an Æra IV *total* is close to an Æra III total and the column
is cut a fifth above it rather than three times it. It wants a bench that runs to
the Opus before it is trusted.

**Five readings are a floor rather than a derivation**, and each says why:

- **The Caravanserai** and **The King's Roads** in Æra II — the bots barely trade
  and connect nothing, exactly as the 2026-09-08 note says, so 1.5× their mean is
  a bar a realm clears by accident. A human yardstick is owed.
- **The Wonder of the Age**, **The Taken Town** and **The Field of Glory** — the
  bots raise no wonder of the current age, take no town, and lose more pieces to
  the wild than they kill of rivals (a barbarian's fall raises nobody's kill
  count, by design). All three keep the user's own figures.
- **The War Chest**'s treasury clause is left at the worksheet's 300 · 1 000 ·
  2 500 even though both bot seats held both clauses at the Æra II close: the
  treasury *standing* was not sampled, and guessing a bar is worse than keeping a
  figure the user wrote. It is the one row this pass knowingly leaves easy.

Two readings could not be sampled at all and are **deferred** rather than barred
(§3b): The Harvest and The Arsenal.

**The 2026-09-08 measurement** — two bot duels (seeds 4242 and 20260903, two
balanced seats, barbarians on) sampled every ten turns for 220 turns, 88 samples
— stands beside the table above as the *per-turn* picture the clause rows and the
Æra IV extrapolation are cut off:

| Æra | samples | cities | citizens | largest city | buildings in one city | luxuries | army | wonders | routes | food/t | prod/t | gold/t | sci/t | culture/t | faith/t |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I | 21 | 1.9 | 6 | 4.3 | 0.7 | 0.3 | 42 | 0.1 | 0 | 16 | 11 | 2.6 | 4.5 | 3.1 | 1.1 |
| II | 15 | 3.3 | 15 | 7.1 | 3.5 | 1.0 | 101 | 1.5 | 0 | 41 | 28 | 6.8 | 10.3 | 6.7 | 2.7 |
| III | 44 | 6.2 | 34 | 11.1 | 7.4 | 2.9 | 320 | 3.5 | 2.0 | 100 | 93 | 47 | 28 | 36 | 8.5 |
| IV | 8 | 11.8 | 69 | 17.5 | 10.9 | 4.9 | 679 | 5.6 | 4.0 | 177 | 276 | 106 | 79 | 165 | 39 |

**The turn-100 bench, with the wager in** (`docs/bot-priorities.md`'s own shape:
the eight seeds 1/2/3/42/101/999/31337/20260101, standard, two balanced seats,
wild on, driven to t100, every figure the mean of the sixteen seats, ± one
standard error):

| citizens | food | gold | science | culture | faith | treasury | happiness | cities | beads | wagers kept |
|---|---|---|---|---|---|---|---|---|---|---|
| 42.8 ± 2.9 | 135.3 ± 11.4 | 61.6 ± 12.3 | 96.8 ± 10.0 | 88.1 ± 11.1 | 17.2 ± 3.5 | 452 ± 120 | +1.8 ± 2.9 | 6.6 ± 0.4 | **5.8 ± 1.0** | **0.8 ± 0.2** |

The two columns the batch is answerable for are the last two: **beads are on the
rods at t100** and the average seat has kept **four wagers in five** by then —
Æra II closes around turn 100 on these boards, so a seat has had one table and
has cleared roughly one bar of the three on it. That is the shape the design
asks for: a bar that is difficult, not a bar nobody meets. Nothing else in the
row is a *comparison* against the build before it, and it deliberately is not
claimed as one — schema 102 re-seeds every game (the reckoning draw), so a
seed-for-seed diff against `main` is not a thing this bench can produce; the
gate clone is where that comparison belongs.

**The caveat both tables share**: these are *bots* on two maps. A human plays
wider and taller than a balanced bot and a six-seat standard map's mean will
differ, so every figure in the deck is a first cut for the arena rather than a
ruling. `data/wagers.json` is one table and re-tuning it is one edit.

**A flow counts from the deal**, which settles the open ▢ that stood here: the
deal *is* the age's first turn (§2), so the deal and the age's opening are one
and the same. The stamp is `WagerDeal.opening` — every seat's lifetime figure,
written down once when the cards are dealt — and a standing is `now − that`, so
nothing ticks and nothing resets.

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

- **Reckonings retire** — **BUILT** (batch G2): the wager *is* the age's
  snapshot, taken for everyone rather than paying the leader. All eight rows of
  `data/beads.json` carry `retired: true`, which is a new field on `BeadDefBase`
  beside `dormant` (*not yet* against *no longer*) read by the one predicate
  every seam already asks, `beadIsDormant`. They keep their bodies for saves and
  for the Compendium's record, they leave every pool, and `drawAgeReckonings`
  therefore draws nothing — which is half of why a v101 log does not replay.
- **Feats, quests, endeavours stay as the deeds** — the world firsts and the
  races are a different pleasure from a bar you set yourself, and the user's
  arithmetic counts them.
- **The bead Orders** (the four last-age deed cards) stay.
- The age-opening **deed sheet** is **retired** (batch G2) and the wager's own
  two surfaces replace it. The deed sheet's *tables* were never the thing that
  went: the banner was an index over cards the sheet already drew, so every feat,
  quest, endeavour and measure is still printed by the Beads screen and still
  reachable all game by its three ordinary doors — **the bead chip in the top
  bar, any rod on the Abacus, and `V`**. What went is the automatic raising, and
  what raises itself on the age now is the **deal sheet**.
  - the **deal sheet** (`src/ui/wagerSheet.ts`, the eleventh on `modalShell.ts`):
    three cards, each with its thread and family, what it reads in plain words,
    the bar as one large figure, and a Stake button. No "you stand at" line
    (every seat is at nought on the deal turn, by construction) and no
    age-mechanics line in the masthead — both are the user's marks on the mock.
    It is raised by the End Turn blocker for the local seat and by nothing else.
  - the **Abacus** (`src/ui/abacusScreen.ts`), reworked as the wager screen and
    keeping its measured stage: a band above the bead rods with the age's three
    cards, every real seat's standing against each bar **ranked**, a track scaled
    to the bar, the figure, a mark on the row of any seat that has met it, and
    the local seat's stake marked on **its own card only**. No "claimed by" line
    (§11) and no countdown — the top bar's age card is where a deadline lives.
    It flips on a kept wager the way it takes a bead: `refresh()` repaints the
    register when the screen is up.

## 6. Bots

- A bot chooses the wager whose reading its own appraisal (`ValueContext`)
  values highest relative to its current standing — the want book gains a
  *wager want* with the bar as its stock, so the bot leans into it as a player
  would, and the arena panel walks the knob (`ai.wager.*`). The spectate feed
  prints the choice with its terms. This is batch **W2** after the sim lands.

## 7. Rulings needed before anything flies

0. ~~§2 the first deal~~ — **ruled**: no wager in Æra I.
1. ~~§1 progress~~ — **ruled and built** (batch G1): the mean age of each
   empire's highest technology, floored, over the living real seats.
2. ~~§2 Æra V~~ — **ruled**: Æra V, when added, has no wager; Æra IV keeps
   its own.
3. ~~§2 the choice window and public choices~~ — **ruled**: same turn, secret.
4. ~~§3 scaling~~ — **ruled and built**: fixed per age; difficulty deferred to
   the bot. The three that were open are settled and in code — the deal
   guarantees three different **lines** (which is the family guarantee and more,
   since three lines are at least two families); §3b's keep list is the deck; and
   **every** wager, standing or flow, is claimed the moment its bar is met.
5. §4 the malice's chair (rec: the last chair of its flavour, displacing the
   Order there), its term (rec: until the next wager is judged), stacking (rec:
   two).
6. ~~§5 reckonings retire~~ — **ruled yes and built** (batch G2): all eight rows
   carry `retired: true`.
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
**RULED** (the user, 2026-09-09): *"in my head I was imagining the
notification would be a full modal, and only take place every 15 turns or so
(could be randomized intervals around 15) … I don't know if it would be as
impactful hidden away in a menu."* So: the census is a **full-screen sheet**
on `modalShell.ts`, taken every **15 ± 3 turns** (the interval drawn from
`state.rng` at each census so a seed is a calendar; `rules.census.every`
15, `rules.census.jitter` 3), each census ranking **one** stat from the list
above in rotation (the rotation from the rng too, no stat twice running),
every real seat's figure beside its name, the local seat's row lifted, the
great person's name on the masthead as flavour; the sheet is an End Turn
blocker like a draft (dismissed, never chosen). The last census stays
readable on the Abacus (the world's bead ledger — the closest thing the
game has to a world ledger today; `ledgerScreen.ts` is the local seat's own
yields) so a player who dismissed it can look again. Bots read the true
board already and need nothing from it. **The census pays** (the user,
2026-09-09): the seat that leads the ranked stat takes a **Triumph worth +5
renown** — and for the interface's sake there is **no second sheet**: the
Triumph is shown *inside* the census sheet, on the leader's own row, never
as a separate triumph card on top of it (the user: "let's not show both a
triumph modal for winning the census and the census modal"). The user may
rework how Triumphs work later; this stands for now. **The wager's own
surface**: the Abacus is reworked into the wager screen — the age's
countdown, the three dealt cards, every seat's standing against each bar
ranked and refreshed each turn, the bead rods beneath — and the old Æra
III/IV **conditions draw menu** (the deed sheet's draw of reckonings and
quests) is **retired** when it lands. Batch **C1**, after G2 (it shares the
standings reading). Mock of both:
https://claude.ai/code/artifact/afd3cee0-0ff3-4388-a6c7-3fc3bf9665d0 — the four
sheets (the deal, the Abacus mid-age, the census, the census won) are the
spec of record for G2 and C1 — **marked 2026-09-09** ("looks great"): no
"you stand at" on the deal (every seat is at nought on the deal turn); no
age-progression line in any masthead (the clock's mechanics are not shown
to the player — the countdown lives on the top bar's age card only); no
"flavour" label on the census taker's name.

## 11. Queued to build (the user, 2026-09-09: "let's queue up implementing the wager")

- **No "claimed by" line.** A wager is a bar any number of seats may meet; a
  seat that has met it shows the mark on its own row and nothing names a
  first claimant (the user: "the wager can be won by multiple players").
  The claim-on-met rule still holds per seat — a seat's beads are minted the
  turn its bar is first met.
- **The Horde (§9) is held** — not in this queue.
- **The census (§10) is in**, taken every **13–17 turns**, the exact interval
  drawn uniformly from `state.rng` at each census (`rules.census.min` 13,
  `rules.census.max` 17); the leader's Triumph inside the sheet, +5 renown.
- **The open ▢ of §7 take their (rec) defaults** so the batches can fly:
  progress = the mean age of each empire's highest technology, floored; the
  deal guarantees three different lines; a standing wager is claimed the
  turn it is first met; the malice takes the last chair of its flavour,
  lasts until the next wager is judged, stacks to two, survives adoption;
  reckonings retire. Any of these is one line to change.
- **Batches, in order**: ~~**G1** the world clock and the countdown~~ —
  **landed 2026-09-09, schema 101** (the first-seat rule retired, the top bar's
  age card carries the countdown, `ageClosed` in the occasion union) →
  ~~**G2** the deal, the choice, the judgement~~ — **landed 2026-09-09, schema
  102**: `data/wagers.json` (24 rows, two deferred), `src/sim/wagerData.ts` and
  `src/sim/wagers.ts`, the `wagers` phase, `chooseWager` and its blocker, the
  `wagerClaimed` occasion, the reckonings retired, the deal sheet and the Abacus
  reworked as the wager screen. Every bar the bench could measure was measured
  (§3a) rather than only the seven that were marked, because the worksheet's
  first-cut figures for the accumulated readings were cut against *per-turn*
  means and stood an order of magnitude under the board → **G3** the malice deck
  (`data/malices.json`, the twelve of §4) → **C1** the census → **W2** the
  bots' wager want. G1 flies after R1 lands (both touch the reducer).

## 8. Engine notes (the orchestrator's, not decisions)

**G2 is built (schema 102).** What the batch actually laid down, against the
sketch below:

- `GameState.wagers: WagerDeal[]` — append-only, one row an age, carrying the
  three cards, the turn they were dealt, **every seat's opening figures** and
  every claim. The opening is the half this sketch did not have and the flow
  rule needs: "this age" is `now − the stamp`, never a counter that resets.
- `Player.wager: {age, index}` (the stake, an index into the world's three),
  `Player.wagerTotals` (the lifetime totals a flow subtracts against),
  `Player.pendingMalices` (the judgement's mark, G3's input) and
  `Player.malices` (declared, written by nothing until G3).
- Three readings that had no home and now do: `Player.renownEarned` (the purse
  is spent, the total is not), `Player.unitsKilled`/`unitsLost` (the exchange,
  written at the two seams a piece leaves the board), and `City.capturedOn`
  (*when*, beside `captured`'s *whether*).
- The deal and the judgement are a **phase of their own** (`wagers`, between
  `worldClock` and `beads`) rather than a beat of `renown`: a claim mints beads
  and the deed sweep in the next phase reads the rod they land on.
- `src/sim/ledgerFold.ts` — the Ledger's class fold, **lifted out of
  `src/ui/ledgerScreen.ts`** so a wager may ask what the sheet prints. Half the
  deck reads a Ledger class as a number, and a rule that reads a screen is not a
  rule. Nothing about the arithmetic moved; the sheet re-exports every name.
- The beads a kept wager pays are four **repeatable grant rows** in
  `data/beads.json`, one per rod — so nothing new was needed to pay one.

**Owed, and flagged here rather than done quietly**: `data/wagers.json` is not
yet walked by the **Compendium**. Every other data table in the game has a shelf,
and the deck should have one — the rows carry a plain `note` written for it — but
it is a section of its own on a 2 300-line screen and it did not fit this batch.
`data/malices.json` will want the same shelf, so the two are one small pass, best
taken with G3.

Schema. New state — **G1's half is built**: `worldAge`/`currentWorldAge` are
derived, not stored (`src/sim/worldClock.ts`), and `GameState.ageClose?: {age,
turn}` is the one stamp (`BeadTable.worldAge` retired with it). Still to come:
`GameState.wagers: {age, dealt: WagerId[3], judged: boolean}[]` (append-only,
like triumphs) with each seat's pick on `Player.wager: {age, index}` — the
state carries every pick (a replay must), and *secrecy* is a UI gate exactly as
`localPlayerId` is: a sheet shows a rival's pick only after the judgement;
`Player.malices: {id, untilAge}[]`; a claimed wager is an announced
occasion (`wagerClaimed`) the Abacus flips on. The deal in the `renown` phase of the deal turn; the
judgement hangs off the `ageClosed` occasion the `worldClock` phase announces
(built in G1); `chooseWager` a command with the usual gates. The wager readings reuse `countOf`/the meters; a new
`data/wagers.json` and `data/malices.json`, both walked by the Compendium and
sync-tested against `docs/wager.md`'s tables once the rows are written. The
Abacus and the top bar's age card read the countdown. Batches: **G1** (the
clock and the countdown, retiring the first-seat rule) → **G2** (the deal,
the choice, the judgement, the sheet) → **G3** (the malice deck) → **W2** (the
bots). Each a schema.

## Revisions

*(yours — edit away)*

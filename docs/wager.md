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
- ▢ The **first** age has no countdown to start it; its wagers are dealt on
  turn 5 (rec). The **last** age (Æra IV today) closes only by the Opus — its
  wagers are judged when the Opus is raised, or ▢ (rec) at a fixed turn after
  the age opened (`rules.wager.lastAgeTurns`, 40), whichever is first.

## 2. The deal — three targets, five turns in

- **The deal turn** (the user, 2026-09-08: *"a five turn delay only for age 1
  (so the player has some semblance of a game plan) before committing to a
  wager, or even starting it in age 2 and skipping age 1 altogether"*): ▢ mark
  one —
  - (a) **Æra I deals on turn 5**, every later age on the turn it opens;
  - (b) (rec) **no wager in Æra I**: the first deal is the turn Æra II opens.
    Æra I is the opening — settling, the first drafts, the first war — and a
    bar laid over it competes with learning the board; the deeds still pay
    beads there, so the first age is not empty of the race. Æra II–IV give
    three wagers × 4 = **12** beads, plus the deeds, against the threshold of
    20 — still an Æra IV Opus, a little less certain, and `rules.threshold`
    is the dial.
  Three wagers are drawn from the age's deck and shown to every seat at once —
  the same three for everyone (a wager is a claim on the world, like a bead).
  The deal is from `state.rng`, so a seed is a deal.
- **Each seat chooses one** — a command, `chooseWager {playerId, index}`. ▢ The
  window: (rec) 3 turns; a seat that has not chosen when it closes is dealt
  its **first** card (the reducer's default, so a bot or an absent seat always
  holds a wager). ▢ Choices are **public** the moment they are made (rec — the
  rivals' declared wagers are part of what you are playing against).
- **Judged at the age's close** (§1). For each seat: the chosen wager met pays
  **2 beads**; each of the other two met pays **1 bead**; the chosen wager
  missed takes a **malice** (§4). So an age pays at most 4 beads, and a seat
  that chases nothing risks only its own choice.
- The **threshold arithmetic**: four ages × 4 = 16 from wagers alone, plus the
  deeds (feats, quests, endeavours) — the user's reading, an Æra IV win is very
  possible. ▢ Keep `rules.threshold` at 20 (rec) and re-measure on the arena
  after the first cut; the dial is one number.

## 3. The deck — targets that scale with the age

- **A wager is a bar, not a race**: "bank 300 culture this age", "hold 5
  improved luxuries", "12 citizens in one city", "field 30 strength of army",
  "6 buildings in one city", "3 trade routes running", "2 wonders", "a religion
  followed by 4 cities". Anyone who clears it clears it; the leader is not the
  only winner.
- **Scaling.** ▢ Two readings, mark one:
  - (a) **fixed per age** — each card carries four figures, one per age, tuned
    in `data/wagers.json`;
  - (b) (rec) **scaled off the world at the deal** — each card carries a
    *rate*, and the figure is `rate × the mean of every real player's current
    reading` (culture per turn, army strength, citizens…), floored, with an
    age floor from a small table so a poor world still asks something. This is
    the Balatro ante: the bar is what the world can do, times a stretch. It
    prints as a number the turn it is dealt and never moves after.
- **A first cut of the deck** — every card is a reading the Ledger already
  prints (the rule two bullets down). The *rate* column is (b)'s stretch over
  the world's mean at the deal; the *floor* is the least an age may ask, so a
  poor world still asks something. The figures are filled from the probe in
  §3a and are a first cut for the arena, not a ruling.

  | Wager | Family | Reads | Kind |
  |---|---|---|---|
  | The Granaries | E | food banked this age | flow |
  | The Foundries | E | production banked this age | flow |
  | The Counting House | E | gold banked this age | flow |
  | The Academies | S | science banked this age | flow |
  | The Chroniclers | C | culture banked this age | flow |
  | The Congregation | C | faith banked this age | flow |
  | The Metropolis | E | citizens in your largest city | standing |
  | The Many Hearths | E | cities you hold | standing |
  | The Caravans | E | trade routes running | standing |
  | The Silk Merchants | E | unique luxuries held | standing |
  | The Standing Army | D | army strength fielded | standing |
  | The Conqueror | D | cities captured this age | flow |
  | The Camp-Burners | D | barbarian camps cleared this age | flow |
  | The Marvels | C | wonders you hold | standing |
  | The Great Hall | C | buildings in one city | standing |
  | The Faithful | C | cities in the world following your religion | standing |
  | The Scholars | S | technologies researched this age | flow |
  | The Laureates | S | great people called this age | flow |
  | The Surveyors | S | hexes your borders claimed this age | flow |
  | The Roads | E | cities joined to your capital by road | standing |

  Twenty rows, five a family; a deal of three from three different families
  (below) means every build sees one it can want. A wager that would need a
  new reading is deferred and annotated, never bent.
- **Families.** Every card names one of the four bead families (D · C · S · E,
  `docs/beads.md`); ▢ (rec) the deal is guaranteed one card from three
  different families, so every build has a wager it can want.
- **What a wager may ask**: (rec) only readings the Ledger already prints —
  a meter, a count the `CountKind` vocabulary has, a fold of a voice over the
  age — so a card is a JSON row and the register test pins that every card's
  reading exists. A wager that would need a new reading is deferred and
  annotated, never bent.
- **"This age" counts**: a wager over a *flow* ("bank 300 culture") counts from
  the deal to the close (`Player.wagerBanked`, absolute stamps, nothing
  ticks); a wager over a *standing* ("12 citizens in one city") reads the
  board at the close.

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

**The rule**: a **standing** wager's bar is `ceil(stretch × mean standing)`
with the age's floor; a **flow** wager's bar is `friendly(stretch × mean/turn ×
sizingTurns[age])`. First cut: **stretch 1.5** (the bar asks half again what
the middle of the world does), `sizingTurns` **30 · 60 · 40** for Æra II · III ·
IV (under the measured age lengths, so an on-curve empire that starts the age
level with the mean clears its chosen bar by leaning in, not by being
already ahead). What the table below would have asked *these* worlds:

| Wager | Æra II bar | Æra III bar | Æra IV bar | floor (II · III · IV) |
|---|---|---|---|---|
| The Granaries (food banked) | 1 850 | 9 000 | 10 600 | 600 · 3 000 · 6 000 |
| The Foundries (production banked) | 1 250 | 8 300 | 16 500 | 500 · 3 000 · 8 000 |
| The Counting House (gold banked) | 300 | 4 200 | 6 400 | 150 · 1 000 · 3 000 |
| The Academies (science banked) | 460 | 2 500 | 4 700 | 200 · 1 000 · 2 500 |
| The Chroniclers (culture banked) | 300 | 3 250 | 9 900 | 150 · 1 000 · 4 000 |
| The Congregation (faith banked) | 120 | 770 | 2 300 | 60 · 300 · 1 000 |
| The Metropolis (largest city) | 11 | 17 | 26 | 8 · 12 · 18 |
| The Many Hearths (cities) | 5 | 9 | 18 | 4 · 6 · 10 |
| The Caravans (routes running) | 1 | 3 | 6 | 1 · 2 · 4 |
| The Silk Merchants (unique luxuries) | 2 | 4 | 7 | 2 · 3 · 5 |
| The Standing Army (strength) | 150 | 480 | 1 000 | 100 · 300 · 600 |
| The Marvels (wonders held) | 2 | 5 | 8 | 2 · 3 · 5 |
| The Great Hall (buildings in one city) | 5 | 11 | 16 | 4 · 8 · 12 |
| The Roads (cities joined to the capital) | 2 | 4 | 8 | 2 · 3 · 5 |
| The Scholars (techs this age) | 6 | 9 | 10 | 4 · 6 · 6 |
| The Conqueror (cities captured this age) | 1 | 1 | 2 | 1 · 1 · 1 |
| The Camp-Burners (camps cleared this age) | 2 | 3 | 4 | 2 · 3 · 3 |
| The Faithful (following cities) | 3 | 5 | 8 | 2 · 4 · 6 |
| The Laureates (great people this age) | — | — | — | *needs a measurement* |
| The Surveyors (hexes claimed this age) | — | — | — | *needs a measurement* |

The Conqueror, The Camp-Burners and The Scholars are not read off the mean
(a mean of zero captures asks nothing): they carry fixed figures per age,
which is (a)'s reading for the three rows where (b) has nothing to read. The
two unmeasured rows want a probe before they are dealt.

▢ **The stretch** (rec 1.5) and the **sizing turns** (rec 30 · 60 · 40) are
the two dials; ▢ whether the deal shows the bar as a **number** the turn it is
dealt (rec yes — a bar you cannot read is not a wager). ▢ Whether a wager
counts from the **deal** or from the **age's opening** (rec the deal).

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

0. §2 the first deal — Æra I on turn 5 (a), or no wager in Æra I (b, rec).
1. §1 progress = the mean age of each empire's highest tech (rec) — or of
   beakers banked?
2. §1 the last age's close (rec: the Opus, or 40 turns).
3. §2 the choice window (rec 3 turns) and public choices (rec yes).
4. §3 scaling (rec b, off the world) and the family guarantee (rec yes).
5. §4 the malice's chair (rec: the last chair of its flavour, displacing the
   Order there), its term (rec: until the next wager is judged), stacking (rec:
   two).
6. §5 reckonings retire (rec yes).

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
  the fog, which is where a horde should come from, and a player is never
  ambushed on a hex they were watching.
- **Sized to the mean, never to the leader.** The wild's tier is the median
  seat's (kept). ▢ (rec) the surge's *count* scales with the number of real
  seats (camps per seat, not per world), so a duel and a six-seat game feel
  the same pressure per empire.
- **It pays.** ▢ (rec) a surge camp carries a bigger bounty — `campClearGold`
  × the age (50 · 75 · 100) — and **The Camp-Burners** wager (§3) is dealt
  more often in an age with a surge, so meeting the check is a bead, not a
  chore. A camp the Horde founded and nobody cleared within
  `rules.horde.graceTurns` (rec 15) starts **raiding harder** (its raiders
  gain the age's `combatBonus`) — the check bites those who ignored it, not
  those who answered it.
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

## 8. Engine notes (the orchestrator's, not decisions)

Schema. New state: `GameState.worldAge` (derived, not stored — the mean is a
reading) but `GameState.ageClose?: {age, turn}` (the countdown, absolute) and
`GameState.wagers: {age, dealt: WagerId[3], chosen: Record<seat, index>,
judged: boolean}[]` (append-only, like triumphs); `Player.malices:
{id, untilAge}[]`. The deal in the `renown` phase of the deal turn; the
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

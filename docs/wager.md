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

- **Turn 5 of every age**, three wagers are drawn from the age's deck and shown
  to every seat at once — the same three for everyone (a wager is a claim on
  the world, like a bead). The deal is from `state.rng`, so a seed is a deal.
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

## 4. The malice

The user: *"if they fail to fulfill it, they take a malice."* ▢ What a malice
**is**, mark one:

- (a) (rec) **a card against you for the next age**: drawn from a small Malice
  deck the moment the wager fails, announced to every seat, and standing as an
  effect on the empire until the *next* age closes — "−1 happiness in every
  city", "your Order drafts show one card fewer", "+1 authority cost on every
  city", "your caravans pay half". Read by `liveEffects` as one more source
  (the sixth was legacies; this is the eleventh), so it is the same
  vocabulary as every card and the Compendium prints it. A malice is
  **lifted early** by meeting the next age's chosen wager (rec — the comeback).
- (b) **a bead debt**: the next bead earned is forfeit. Simpler; less
  interesting; nothing to read on the board.
- (c) **a renown fine**: lose the ladder's current rung of renown.

▢ Does a malice stack (two failed wagers, two malices)? (rec) yes, up to two;
a third failure is a second copy of the older one lifted. ▢ Bots take malices
like anyone (rec).

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

1. §1 progress = the mean age of each empire's highest tech (rec) — or of
   beakers banked?
2. §1 the last age's close (rec: the Opus, or 40 turns).
3. §2 the choice window (rec 3 turns) and public choices (rec yes).
4. §3 scaling (rec b, off the world) and the family guarantee (rec yes).
5. §4 what a malice is (rec a, a card against you, lifted by the next wager).
6. §5 reckonings retire (rec yes).

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

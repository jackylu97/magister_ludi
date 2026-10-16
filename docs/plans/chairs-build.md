# Typed chairs, card faces and the new Dominion cards: the build

**Status:** started 2026-10-16. The rulings are in `docs/plans/doctrines-governments-chairs.md` (governments, chairs, Doctrines) and `docs/decks/dominion.md` (the cards and their types). This file is the build order and the shared spec the agents' briefs point at.

**The user, 2026-10-16:** *"lets start implementing the government changes and card type changes. For decks outside of dominion, we can just assign everything as a wildcard slot until we get to them. We probably should start with the UX change, then the government slot and card type changes. Once those are done, please start implementing the new cards, defer any that require a determination around UX or user interaction"*

## What the build rests on

- **Card types.** Every card is Military, Economic, Civic or Wildcard. A Dominion card's type is the Type column of `docs/decks/dominion.md`. That includes the shared cards in its "Shared with another deck" table, whose rows live in `data/decks/common.json`.
- **Unsorted cards.** Every other card is unsorted until its deck is sorted (*"assign everything as a wildcard slot until we get to them"*). An unsorted card is drawn in the Wildcard ink and fits any chair, so the other five decks play as they do today. Confirmed by the user on 2026-10-16. If unsorted cards fitted only Wildcard chairs, a seat without Dominion could seat one card under War Chief.
- **Which chair a card fits:**
  - a Military, Economic or Civic card fits a chair of its own type or a Wildcard chair;
  - a Wildcard card fits only a Wildcard chair (the user, 2026-10-16);
  - an unsorted card fits any chair.
- **Chairs.** Each government's mix of Military, Economic, Civic and Wildcard chairs is the table in the plan doc, section 4. The Chiefdom has one Military, one Economic and one Wildcard chair. Every chair beyond a government's mix (a leader's, a card's, Magisterial's, A Victor's Peace's) is a Wildcard chair.
- **The tier-38 governments** (The Empire, The Commonwealth and The Magisterium) are retired: their rows stay for saves, and nobody is offered them. The ladder's rung at draft 38 still opens Tier IV cards.
- **Faces** follow the A3 board, `docs/plans/mockups/card-faces/SuitsRevised.dc.html` (the user chose A2 and asked for the changes A3 makes; see the plan doc, "On round two"):
  - **the suit shows the deck:** Dominion Swords, Expansionist Wands, Commerce Coins, Devotion Cups, Scientific Spheres, Magisterial Crowns. One large suit in the centre, in the type's ink, with no corner indexes;
  - **the ink shows the type:** Military vermilion `#a8361b` (ground `#f2ddd2`), Economic ochre `#b5791b` (`#f3e5c8`), Civic lapis `#4f78be` (`#dfe6f3`), Wildcard purple `#4a2a72` (`#e6dfee`);
  - **the rank shows rarity,** with no colour of its own: common a faint rule, uncommon a pewter double rule, rare a black frame with corner stars and a cartouche;
  - **sizes on the board:** the hand at 200 × 310, a seated card at 120 × 186, a collection row at 36 px with an ink stripe, the suit, the name and "deck · tier". A fanned card shows its type by the ink on its edge;
  - **not on the board** and chosen by the build, to show the user: a card of two decks, and a card of no deck.

## Batches

Each batch is one Opus agent, then the orchestrator's batch gate (typecheck, core tests, build) and a commit by explicit path.

### C1: card types in the data, and the A3 faces

**Built, 2026-10-16** (`0bc50049`). The accessor is `orderType(id)`, which answers `'unsorted'` for a row with no `type`. Nothing in the simulation reads it yet.

- A type field on card rows, read through one accessor. Dominion's rows and the shared rows that name Dominion take the sheet's types; every other row is unsorted.
- The Dominion sheet test reads the Type column and checks it against the data, for every row that has a data row (shared rows included).
- The A3 face wherever an Order card is drawn: the hand, the council, the collection, the Compendium and any other surface that shows a card.
- The suits, inks and rarity ornaments join the flair gallery (`flair.html`, `src/flairGallery/`) in the same pass (CLAUDE.md).
- Not in C1: which chair a card fits, and governments' chairs. Seating behaves as today.

### C2: typed chairs

- Governments' mixes as above, replacing the all-Wildcard layout (`slotLayout`, `slotSpread`) and the old `slots` field. The chair counts still match the ladder: 3, 5, 5, 8 and 11 at tiers 0, 4, 10, 18 and 29.
- The fit rule above, wherever a card is seated: the reducer's validation, the council screen, adoption's re-seating and the bots.
- The council shows each chair's type, as on the A3 board's council: an empty chair keeps its ink, and the Wildcard chair is purple.
- The tier-18 signatures count by type: Imperium's Military Orders, the Merchant League's Economic Orders, and Divine Mandate's **Civic** Orders (the user, 2026-10-16). Divine Mandate's text changes to match. Until the other decks are sorted, **an unsorted card counts as the type of the chair it sits in**, and as no type in a Wildcard chair, so a Commerce card in an Economic chair still counts for the Merchant League. This is the orchestrator's interim rule, in the spirit of "assign everything as a wildcard slot".
- **Adopting a government re-seats the cards already seated** (the user, 2026-10-12: adopting a government keeps the seated cards). It keeps as many as fit, in a fixed order:
  - Wildcard cards go to Wildcard chairs first, because nothing else takes them;
  - then each typed card goes to a chair of its own type;
  - then the remaining typed cards go to the Wildcard chairs left;
  - then the unsorted cards go to whatever chairs are left, typed chairs before Wildcard ones.
  - Within each step, cards keep their old seat order. A card that fits no chair goes back to the collection, unseated, keeping its progress.
- The tier-38 governments retired.
- The three cut Dominion rows (Defensive Lines, Arsenals, Naval Supremacy) are retired in batch D0 instead, which edits the deck data and the sheet, so that C2a and D0 can run side by side.
- The save-format change this needs, in the codebase's own way.
- `docs/orders-and-doctrines.md`'s governments table follows the data (its sync test reads the live rows' printed words).
- **Split in two:** C2a is the rules (data, the fit rule, re-seating, the reducer, the signatures, the retirements, the bots and their tests). C2b is the council screen and every other surface that seats a card or shows a chair, built on C2a's functions.

### C3: Doctrines come with a government, and the reward hands go

- Adopting a government offers Doctrines of its tier from both of the seat's decks. The tiers pair one to one: tier 4 offers Tier I, tier 10 Tier II, tier 18 Tier III and tier 29 Tier IV. The user confirmed this pairing on 2026-10-16.
- The reward hands are removed: `REWARD_DRAFTS`, `PlayerStatecraft.rewardHands`, `openRewardHandAt`, the reward commands and `src/ui/rewardSheet.ts`. This is a save-format change.
- No Doctrine is in the data yet, so until the Doctrines are built the offer is empty and is skipped.
- The offer's mix of the two decks is an open question. Until it is ruled, use the reward hands' old rule: one Doctrine from each deck, then a third from either.

### D: the new Dominion cards and Doctrines

- The sheet's `add` and `modify` rows, and its Doctrines, in batches grouped by the shapes they need. A card whose text needs a new shape gets the shape, unless the shape needs a determination about UX or player interaction.
- **Deferred under the user's rule** (*"defer any that require a determination around UX or user interaction"*): any card that needs a new player action, a choice made when it fires, a new button or menu, or a new screen. Such a card keeps its sheet row, gains a data row with a stated deferral where the sheet test needs one, and is listed in this file with the determination it waits on.
- **The triage** is `docs/plans/dominion-build-triage.md`: 125 cards (the sheet's 100 `add` and `modify` rows, 9 shared rows and 16 Doctrines). 33 need only data, 87 need a new shape, and 5 are deferred. It proposes three data batches (D0a to D0c) and seven shape batches (D1 to D7), each landed before the next starts, because they all edit `statecraftData.ts`, `statecraft/evaluator.ts`, `statecraft/describers.ts` and `data/decks/dominion.json`. Its "Rule ambiguities" section holds the readings the build will use unless the user changes them.
- **Deferred, each waiting on a determination.** The user will rework these later (*"Defer all 5 UX cards, i'll probably rework them later"*):
  - **The Longships:** how a player points a ship at the shore hex it pillages (the pillage command names no target today).
  - **The Relay Stations:** what the new order looks like (a button on a unit in a connected city, or a pick on the map).
  - **Rally to the Standard:** how a player chooses where a gained unit appears.
  - **Circumvallation:** how rival towns raising one are shown.
  - **Mercenary Contracts:** how hiring is offered on the purchase rail, and how a hired unit shows the turns until it leaves.

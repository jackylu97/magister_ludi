# The faith screen, F1: all three tabs

Date: 2026-10-12. The user chose F1 (three tabs: Rites, Bonuses, Religion) and asked, verbatim: *"the rites screen feels a bit confusing, i think something like the middle column in F2 would work better. The second tab looks more like a spreadsheet, i like the information but it needs to feel more visually engaging. Maybe instead of a table it should have a similar animation as the orders screen, and have more visually appealing elements. Please do a mockup of the last tab so i can see how it looks."*

The drawings are in `ux-faith-f1.html` beside this file. Figures are the same bot game (seed 4242, turn 131, seat 0, *the Children of Sky and Wild*). "Would pay" figures are illustrative until `explainRitePreview` exists; every other figure is the game's own reading. Nothing in the repo was changed.

## Tab 1: Rites

**What changed:** the rows are your towns, not the rites (F2's middle column).

- **Header strip:** faith banked and a turn, the rite price and duration.
- **Rites you know**, a strip at the top: one chip per rite with its effect in one line. Rites taught by cards you do not hold are greyed in the same strip and name the card: Rite of Fasting (The Fast, a Devotion charter), Votive Offering (while The Votive Gifts is seated), Restoring of the Host (while The Host Restored is seated). This strip is the reference. The flavour lines move to the Compendium only.
- **Your towns**, one row each:
  - A town keeping a rite: the rite, a turns bar, turns left, what it pays now (the town's own lines that carry the rite's id), and "free again on turn N". Aldermarch, Hollowmere and Larkspur keep Omen Reading for 7, 8 and 9 turns, paying +20, +13 and +9 science.
  - A free town: "Start a rite". Its menu is the choice: every rite you know, what it would pay in that town, and the price; a rite you lack is greyed with the reason ("needs The Votive Gifts seated"). The menu's foot says what is left and when the next rite becomes affordable ("After this: 65 faith left. The next rite is affordable next turn (152).").
  - Each town's follow state is on the row ("follows", "follows nothing").
- **Faith line** at the foot: "137: enough for 1 rite now. With +87 a turn, the second is affordable next turn and the third in two." Beside it, what rites kept pay in total.
- **Start in several…**: the same rows with a tick on each free town and the reducer's sentence where a busy town's tick would be, one rite picker at the top, and a foot with the total and the shortfall ("2 towns · 144 faith. You have 137: short 7. Start Northwatch now; Vaelport is affordable next turn.").
- **Over the whole realm:** the prophet's rite, what it costs, and which running rites it replaces; here "You have no prophet (300 faith; you have 137)".
- **Links:** a town's name opens its city screen; the city screen's Faith card opens this tab with that town's menu open.

## Tab 2: Bonuses

**What changed:** no table. Every source is a card on a shelf, drawn like an Order, and the tab opens with the Orders screen's deal and stamp animation.

- **Headline, two panels:**
  - Faith a turn, **+87**, counting up, with a bar whose slices grow left to right: The Camp Chaplains 49, First Rites 10, worked land 10, Herd Gods 5, founder share 3, buildings 5, wonders 5. This is `explainLedger`'s faith row with its Religion and Cards slices split by source; it sums to the top bar.
  - What your religion pays a turn: **+17 production, +13 gold, +50 science, +4 culture, +8 faith**, counting up, marked "= the Ledger's Religion slice, voice by voice".
- **Shelves of cards**, each with a total at the right:
  - Your gods: Star Readers +8 science (Larkspur, Northwatch); Herd Gods +5 production +5 faith; Lord of the Sea +12 production +12 gold.
  - Follower beliefs: Choirs +4 culture; Temple Spires and Minarets wear the flourish and say "pays once a Wat / Mosque stands"; the enhancer place is a dashed ghost ("0 of 2, a prophet's charge once you have Theology").
  - Holy city and rites running: a wide gilt-ruled plaque for Aldermarch with the founder share (+3 faith, +1 gold, from Junipers Rest, Kestrel and Stonebridge following by majority) and the holy site's pressure; a wide rite card for Omen Reading with its three towns as chips with turns bars, +42 science.
  - Seated cards that pay faith: First Rites (Devotion) +10 faith; The Camp Chaplains (Dominion) +49 faith, marked as needing a ruling.
- **Each card:** accent frame and inner rule, an emblem chip and mono eyebrow ("a god · sky", "Devotion · an order"), the name, the clause, where it pays (town chips), and the figure in the game's yield marks.
- **The opening, as drawn:**
  1. The faith bar's slices grow, 90 ms apart; the headline counts up and lands.
  2. Each card is dealt face down and turns over in 420 ms, 110 ms after the one before (the Orders draft's deal).
  3. As a card lands, its figure holds 220 ms, counts up over 750 ms, then lands with the overshoot and glow (the Order stamp's four beats).
  4. With reduced motion on, nothing moves: cards face up, figures there at once.
- **Hover:** a card lifts with the Orders hand's shadow, and its slice of the faith bar lights while the others dim; hovering a slice lifts its card. The card's hover card lists the Ledger lines behind its figure, town by town.

## Tab 3: Religion

**What changed:** drawn in full. Today's content is kept; four things are added.

- **Left column:** the pantheon wheel (22 houses in axis runs, Star Readers, Herd Gods and Lord of the Sea lit), "The pantheon is full", and the three god cards with their figures.
- **Right pane:**
  - The editable name, and facts as pills: founded by you, holy city Aldermarch, 3 of 3 religions in the world, followed in 10 towns (3 yours, 7 foreign).
  - Follower beliefs, three across; enhancer places as two dashed ghosts.
  - **Who follows, as two lists** (added): your towns (Aldermarch 9 of 9 +30, Larkspur 6 of 8 +20, Northwatch 3 of 3 +26, then Hollowmere, Vaelport, Crimson 1 and Crimson 2 at 0 with "no faith; no holy site or road reaches it"), and foreign towns with their owner's ink (7 towns, three by majority).
  - **Rival faiths pressing your towns** (added): none in this game, so the empty state is shown ("The Children of Elder and Anvil (Teal) and the Children of Blood and Wolf (Gilt) reach none of your towns") with an example row marked as an example.
  - **Clergy as three cards with the refusal on the card** (added; today a tooltip): Prophet 300 "You have 137"; Apostle 90 "Needs Theology"; Inquisitor 200 "Needs The Holy Office". The city they are called in is a select at the right.
- "Augurs & Pantheon" and the augur hint leave the header (`index.html` 1148, 1151).

## What reuses existing code

| Part | Reuses | New |
|---|---|---|
| Sheet, header, tabs | `modalShell.ts`; tab pills as the city screen's add-list tabs | a remembered tab per seat; the retitle |
| Rites rows | `cityRite`, `cityRiteTurnsLeft`, `riteCostFor`, `riteError`, `availableRites`; "pays now" from the town's lines in `readEmpire` | row and menu DOM (~250 lines); `riteTurnsFor`; `explainRitePreview` |
| Starting rites | `performRite` via `controls.performRite`; `empireRite` | a loop that checks the running total and stops at the first refusal |
| Bonus card faces | `.sc-card` frame and inner rule, `.sc-card-head`, the emblem chip, `--line-ink` accents (`cardLine.ts`, `[data-axis]`, deck inks); `describeCard`; `drawBeliefFace` | a plaque face (the Doctrine's gilt double rule, in faith ink) and a rite face with town chips |
| Bonus figures | `cardStampNode`, `landCardStamp`, `playCardStamp`, `STAMP_TIMING` (`cardStamp.ts`); `yieldMark.ts` | an adapter from Ledger lines to a `StampReading` (~30 lines) |
| The deal | `card-deal` keyframes and the `--deal-delay` stagger (`offerCard.ts`, `DEAL_STAGGER_MS` 110; `style.css` 10930) | lift `.offer-option.is-dealing` to a shared class |
| Headline | the Statecraft aggregate band (`drawAggregate`, `.sc-aggregate`); `explainLedger`; `ledgerInk.ts` | `explainReligionLedger`; the founder share's own source |
| Religion tab | `drawPantheon`, `drawPantheonWheel`, `drawReligion`, `drawTide`, `drawClergy` | the split list, "no faith reaches" rows, rival rows (`explainPressure` for other religions), refusals on clergy cards |

## Simulation pieces and size

| Piece | Size |
|---|---|
| `riteTurnsFor(state, seat, rite)`, lifted out of `stampRite` | ¼ day |
| `explainRitePreview(state, seat, cityId, rite)`, a ghost reading | 1 day |
| `explainReligionLedger(state, seat)`, generalising `deckLinesOfCity` | ½ day |
| The founder share's own source (`evaluator.ts` 931) | ½ day |
| `MeterContribution` carries its card | ½ day |
| Fixes: withdrawn rites, card-rite teachers, header, duration words | ½ day |
| Interface: Rites ~1.5 days, Bonuses with animation ~1.5, Religion additions ~½, styles and tests ~½ | 4 days |
| **Total** | **about 7 days** |

Two days more than the first F1 estimate, for the card shelves and animation and the Religion tab's additions. No new command.

## Rulings needed

1. **When the Bonuses tab animates.** The Religion sheet's rule today is "the stamp lands here, it never plays", and the Orders screen counts only on Confirm. Proposed: the deal plays every time the tab opens; a figure counts up only if it changed since you last looked, otherwise it lands.
2. **Which figure god and belief cards wear**, on both tabs: the Ledger's attribution (proposed; sums to the Ledger; Star Readers +8) or today's ghost stamp (what removing it would cost; Star Readers +10).
3. **Which seated cards appear:** Devotion cards and any other card paying faith (proposed; The Camp Chaplains is +49 of +87), or Devotion only.
4. **Several towns at once:** one command per town in order (proposed) or one all-or-nothing command.
5. **The prophet's rite on the Rites tab** (proposed) or only on the prophet's sheet.
6. **Rival pressure rows:** towns you can see now only, or remembered towns too under the faith lens's fog rule.

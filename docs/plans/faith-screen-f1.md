# The faith screen, F1: all three tabs

Date: 2026-10-12. The user chose F1 (three tabs: Rites, Bonuses, Religion) and asked, verbatim: *"the rites screen feels a bit confusing, i think something like the middle column in F2 would work better. The second tab looks more like a spreadsheet, i like the information but it needs to feel more visually engaging. Maybe instead of a table it should have a similar animation as the orders screen, and have more visually appealing elements. Please do a mockup of the last tab so i can see how it looks."*

Second revision, the same day. The user, verbatim: *"lets axe the bonuses and list of beliefs on the religion/followers screen (tab 3), this is redundant now that we have the bonuses tab. let's slightly rework the rites screen - let's have each column be slightly narrower so more cities fit on screen. Cities with no rite active should appear at the top. Clicking a rite should re-order cities below based on yields gained, and it should be one click to activate a rite once a rite is selected. If no rite is selected, you can still start a rite as pictured in the existing mockup."* The user then confirmed the three proposals for rite mode (recorded below as settled).

The drawings are in `mockups/faith-f1.html`. The Rites tab there is a working prototype: clicking a rite, a Start button or a town's menu, or pressing Escape, behaves as described here. Figures are the same bot game (seed 4242, turn 131, seat 0, *the Children of Sky and Wild*). "Would add" figures are illustrative until `explainRitePreview` exists. The Rites and Religion & followers tabs add seven illustrative towns (Ashford, Brightwater, Coldspring, Dunmere, Elmstead, Fallowmere, Greyfen), marked "ill.", so the list is a realistic length; the other seven towns and every other figure are the game's own reading. Nothing in the repo was changed.

## Tab 1: Rites

**Rows are your towns, narrower than before** (about 30 px each), so fourteen fit on one screen with the strip and the faith line.

- **Order:** free towns first, in founding order; then towns keeping a rite, soonest free first.
- **Rites you know**, a one-line strip at the top: one chip per rite with its yield mark and "kept in N". Rites taught by cards you do not hold are greyed in the strip and name the card (Rite of Fasting · The Fast; Votive Offering · The Votive Gifts; Restoring of the Host · The Host Restored). They cannot be selected. The line under the strip says what the selected rite does.
- **No rite selected:** each free town has its "Start a rite" menu, as in the first F1 drawing: every rite you know with what it would add in that town and the price, a rite you lack greyed with its reason, and at the foot what is left after this one and when the next is affordable.
- **A rite selected (rite mode):**
  - The chip turns teal and a banner says what the rite does and how the towns are ranked ("Free towns ranked by the food it would add, best first").
  - The free towns re-order by what the rite would add in each, best first, numbered, and slide into place (instant with reduced motion). Ties keep founding order. Blessing of Arms adds the same +10 defence everywhere, so the banner says the rows keep founding order.
  - Each free row has a one-click **"Start · 72"** button.
  - Towns keeping a rite stay below, each with its rite, turns bar, what it pays and "free on turn N"; the group heading says "cannot take Rite of the Harvest until then".
- **After a start**, for example Rite of the Harvest in Vaelport: the bank reads 65; Vaelport moves to the head of the kept group marked "started now"; every remaining Start button greys out with "short 7"; the faith line reads "65, was 137; Rite of the Harvest started in Vaelport. Short 7 for another rite. Next turn you will have 152, enough for 2."
- **Faith line** at the foot, recomputed after each start.
- **Over the whole realm:** the prophet's rite and which kept rites it would replace; here "You have no prophet (300 faith)".
- **"Start in several…" is gone.** Select a rite and click down the list. Each click is one `performRite`, so no batch command is needed and that ruling is closed.
- **Links:** a town's name opens its city screen; the city screen's Faith card opens this tab with that town's menu open.

### Settled by the user (2026-10-12)
1. **One click starts a rite, and the button carries the price** ("Start · 72"), because a command cannot be undone. There is no confirm dialog. Once the bank cannot pay for another, every remaining button greys out with "short N".
2. **A rite that pays two kinds of thing ranks by its main yield**, with the second shown beside it (Consecration of the Bounds: "+3 culture · borders +30%").
3. **Selecting the same rite again, or Escape, leaves rite mode.**

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

## Tab 3: Religion & followers

**The god cards, the follower belief cards, the enhancer places and every bonus figure are removed**; the Bonuses tab owns them. Nothing is chosen on this tab.

- **Left column:**
  - The religion's name (rename in place) and facts as pills: founded by you, holy city Aldermarch, 3 of 3 religions in the world.
  - The pantheon wheel, larger (240 px): 22 houses in axis runs, the three gods held lit, "3/3" in the hub, and the rung sentence under it ("The pantheon is full…", or the progress to the next place).
  - A panel of four counts: 13 towns follow, 6 of your 14, 7 foreign, the holy site presses +6 a turn.
  - A link where the beliefs used to be: "What your gods and beliefs pay: Bonuses ›".
- **Right pane:**
  - **Who follows, as two lists.** Your towns: those that follow, with citizens following and pressure a turn, then those no faith reaches, with the reason ("no holy site or road reaches it"). Foreign towns, in their owner's colour, three by majority.
  - **Rival faiths pressing your towns**, under the foreign list: none in this game, so the empty state is shown with an example row marked as an example.
  - **Clergy** as three cards with the refusal on the card: Prophet 300 "You have 137"; Apostle 90 "Needs Theology"; Inquisitor 200 "Needs The Holy Office"; the town they are called in as a select.
- "Augurs & Pantheon" and the augur hint leave the header (`index.html` 1148, 1151).

## What reuses existing code

| Part | Reuses | New |
|---|---|---|
| Sheet, header, tabs | `modalShell.ts`; tab pills as the city screen's add-list tabs | a remembered tab per seat; the retitle |
| Rites rows | `cityRite`, `cityRiteTurnsLeft`, `riteCostFor`, `riteError`, `availableRites`; "pays now" from the town's lines in `readEmpire` | row, menu and rite-mode DOM (~320 lines): the ranking by `explainRitePreview`, the slide when rows re-order; `riteTurnsFor` |
| Starting rites | `performRite` via `controls.performRite`, one command per click; `empireRite` | nothing: the buttons re-read the bank after each start |
| Bonus card faces | `.sc-card` frame and inner rule, `.sc-card-head`, the emblem chip, `--line-ink` accents (`cardLine.ts`, `[data-axis]`, deck inks); `describeCard`; `drawBeliefFace` | a plaque face (the Doctrine's gilt double rule, in faith ink) and a rite face with town chips |
| Bonus figures | `cardStampNode`, `landCardStamp`, `playCardStamp`, `STAMP_TIMING` (`cardStamp.ts`); `yieldMark.ts` | an adapter from Ledger lines to a `StampReading` (~30 lines) |
| The deal | `card-deal` keyframes and the `--deal-delay` stagger (`offerCard.ts`, `DEAL_STAGGER_MS` 110; `style.css` 10930) | lift `.offer-option.is-dealing` to a shared class |
| Headline | the Statecraft aggregate band (`drawAggregate`, `.sc-aggregate`); `explainLedger`; `ledgerInk.ts` | `explainReligionLedger`; the founder share's own source |
| Religion & followers tab | `drawPantheonWheel` and the rung sentence from `drawPantheon`; the name field from `drawReligion`; `drawTide`; `drawClergy` | the split list, "no faith reaches" rows, rival rows (`explainPressure` for other religions), the counts panel, refusals on clergy cards; the god and belief faces are dropped from this tab |

## Simulation pieces and size

| Piece | Size |
|---|---|
| `riteTurnsFor(state, seat, rite)`, lifted out of `stampRite` | ¼ day |
| `explainRitePreview(state, seat, cityId, rite)`, a ghost reading | 1 day |
| `explainReligionLedger(state, seat)`, generalising `deckLinesOfCity` | ½ day |
| The founder share's own source (`evaluator.ts` 931) | ½ day |
| `MeterContribution` carries its card | ½ day |
| Fixes: withdrawn rites, card-rite teachers, header, duration words | ½ day |
| Interface: Rites with rite mode ~1.75 days, Bonuses with animation ~1.5, Religion & followers ~¼, styles and tests ~½ | 4 days |
| **Total** | **about 7 days** |

Unchanged by this revision: rite mode adds about a quarter day, and dropping the cards from the Religion & followers tab saves about the same. No new command, and none for starting in several towns either.

## Rulings still open

1. **When the Bonuses tab animates.** The Religion sheet's rule today is "the stamp lands here, it never plays", and the Orders screen counts only on Confirm. Proposed: the deal plays every time the tab opens; a figure counts up only if it changed since you last looked, otherwise it lands.
2. **Which figure the god and belief cards wear on the Bonuses tab:** the Ledger's attribution (proposed; sums to the Ledger; Star Readers +8) or today's ghost stamp (what removing it would cost; Star Readers +10).
3. **Which seated cards appear on the Bonuses tab:** Devotion cards and any other card paying faith (proposed; The Camp Chaplains is +49 of +87), or Devotion only.
4. **The prophet's rite on the Rites tab** (proposed) or only on the prophet's sheet.
5. **Rival pressure rows:** towns you can see now only, or remembered towns too under the faith lens's fog rule.
6. **The order of towns keeping a rite:** soonest free first (drawn) or founding order.
7. **From the first round:** whether the drawer's Religion dot also lights when a town is free and a rite is affordable; whether the sheet is called "Faith" or "Religion".

Closed since the last revision: starting in several towns (rite mode makes it one command per click), and the three rite-mode proposals (settled above).

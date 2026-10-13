# City screen: three iterations of Arrangement A

Date: 2026-10-12. Follows `audit.md`. The user, verbatim: *"A is the right direction. treasury should show somewhere on screen. two problems: the spend modal seems awkward, needs to be formatted better. The terrain hover panel should show on the bottom left, ideally. The illustrative yields should ideally only show on hover, and appear over the right column instead of displaying inline in the column. The 'buy' button below the queue implies that it would get cheaper if the city completes part of it (rushing the item instead of buying it) which isn't it's behavior. Let's figure out a different way to incorporate the buy function. The way it was done previously wasn't the worst but I do feel like there might be better layouts. Please do a few iterations."*

## Settled, and kept in all three

- **Arrangement A**: the name band on top, the town rail on the left, the work rail on the right, the board live between them, Leave the town at the bottom centre. Kept from A: refusals stated once per reason, the "Not yet" fold, each yield chip with its own complete list, the short-of chips, ‹ › town stepping, and the Supply counts heading the build list. The HUD fit is A's: the top bar, the empire panel and the commission chips stand down in a town, and End Turn keeps its corner and its waiting badge.
- **The treasury is on screen.** In all three the band carries `Treasury 437 (+21) · Faith 51 (+2)` just left of the six chips, in the top bar's voice (bank, then the rate in brackets), so the figure has the same place in every town. Each iteration also shows the bank once more where money is spent.
- **The terrain hover card is at the bottom-left.** The town rail stops short of it: its height becomes the column minus the card's room (about 180 px), and the rail scrolls inside what is left. The card no longer competes with Leave the town or the board caption. (Today's rule, `style.css:4686-4700`, moved it right because it sat over the worked hexes next to a full rail; under the rail, in the rail's own column, it covers no board.)
- **Hover-only detail, over the right column.** I applied the ruling to both kinds of "what it would add" figure:
  - a build row's preview (today the `+2 food` line printed inside each building row, `city-buildable-preview`) moves into the row's hover card;
  - a yield chip's breakdown is a hover card (it already is; the A drawing showed it pinned open, which read as inline).
  Both cards open **over the work rail**, covering its upper half, never over the board. The rows become one line each: name, hammers, turns.

## The buying problem, stated precisely

From `src/sim/purchase.ts` (module docblock and `purchaseItemAt`, 1226):
- A purchase costs the item's **full** production cost at `goldPerHammer` (4 gold a hammer), or its faith price, plus any card riders. The price is `explainPurchaseCost`'s fold, a labelled list (rule 5).
- **It never falls as the town builds.** "Buying does not consume the banked basket and is not discounted by it."
- If the item is in the queue, buying it **strikes the queued copy off** and the hammers already banked carry on into whatever is next (`reaimProduction(city, before, false)`). Nothing is lost.
- A unit needs the town's hex free and is limited to one per class per turn (`purchaseError`).

The other verb, **contribute** (`explainContribution`, 1468), is the real rush: a card lets you pour gold or faith into the front item's bar, so many hammers per coin, and it stops at what is left. It belongs on the "Building now" card because it does change the bar.

So the rule for every design below: **a Buy price never sits next to a progress bar**, it always reads "outright" or "full price", and contribute keeps the bar and says "→ +N hammers" so the two verbs look different.

## A1 — A price on every row, made legible

The old way, fixed. Buying stays where you choose what to build.

**Buy control**
- Every add-list row has a price cell in a fixed right-hand column: `356 gold`. The column has a heading, `Buy outright · full price`, with the treasury beside it (`you have 437`).
- Three looks, never colour alone:
  - **can buy now**: solid ink border, gold figure, the press of a button;
  - **short of gold**: plain figure, no border, and `need 31` under it in small mono;
  - **cannot be bought here**: no figure, a dash, and the reason said once at the head of the shelf ("Units: none can be bought here this turn. A Swordsman stands in Aldermarch; move it to buy one.").
- **Queued buildings stay in the add list**, marked `in queue · 1st` or `2nd`, with the same price. Today they leave the list (`cityPanel.ts:2702`), which is why the current build had no tag. So the Smithy at 60/89 shows `356 gold` exactly as a fresh Smithy would; the price does not live near its bar.
- The queue and "Building now" carry no prices at all.
- What a player reads: *"the number on the right of a row is what the whole thing costs to buy today, wherever it is in the queue."*

**Spend presentation: each verb beside the bank it draws on.** No Spend card.
- **Citizens:** the levy sits on the town's population line: `Size 11 · Levy a citizen ▾` in the Growth card, because it spends a citizen. Its menu opens below, with the figure column right-aligned.
- **Faith:** a Faith card in the town rail (replacing the Faith and Rites disclosures): the town's belief headline, then the rites as rows, `Rite of the Harvest · 72 faith`, the shared refusal once (`Rites cost 72 faith; you have 51`).
- **Faith purchases** ("Call a prophet") join the add list as a **Faith** shelf, priced in the same column in the faith ink.

**Treasury:** the band, and the price column's heading.

**Borrows:** Humankind (the buyout under each item's name).

**Cost:** about 4 days with the rest of A. `cityPanel.ts`: price column and its three looks (~90), shelf refusal lines grouped by `purchaseError`'s sentence (~90), queued buildings kept in the list (~20), Faith shelf (~40), levy on the Growth line (~15), Faith card (~50), hover-only previews (~30); `style.css` (~140).

**Risks:**
- The rail stays 300 px with a price column; a row with both a gold and a faith price needs the 300 px it has today.
- The list is still the longest thing on screen; prices make each row a little wider, not taller.
- Spending is spread over three places, which is consistent ("next to its bank") but not one place.

## A2 — Build and Buy as two views of the work rail

Civilization VII's split, with its known complaint fixed.

**Buy control**
- Under the Supply strip, a two-part switch: **Build** (hammers, over turns) · **Buy** (gold, faith or citizens, now).
- **Build** shows the add list with hammers and turns only. No prices anywhere near the queue.
- **Buy** shows one list, headed by the banks (`Treasury 437 · Faith 51 · Citizens 11`), in three labelled sections:
  - **Gold**: "Can buy now" first (`Settler · 280`, `Worker · 160`, `War Hall · 356`), then `Smithy (building now) · 356` with its note "buying it outright moves its 60 hammers to the next item", then "Short of gold" with `need N`, then "Not here now" with one line per reason.
  - **Faith**: faith purchases and the rites, the same columns.
  - **Citizens**: Levy a citizen and its options.
- The chosen view is remembered across towns and across a purchase (module state, as `addTab` is). Civ VII players complain that buying sends them back to production (Steam thread); this does not.
- Each Buy row says `Buy outright` in its button, and the price is in its own column. The bar is not on this view.
- What a player reads: *"Build is what this town makes with hammers over turns; Buy is what the bank pays today, in full."*

**Spend presentation:** the Buy view *is* the spend presentation: one list sectioned by bank, every cost in one right-aligned column. The levy and the rites leave the town rail.

**Treasury:** the band, and the Buy view's header with the faith bank and the citizens.

**Borrows:** Civilization VII (separate production and purchase views); Endless Legend 2 (one place that lists everything you can do, with the reason for what you cannot).

**Cost:** about 4.5 days with the rest of A. `cityPanel.ts`: the switch (~40, remembered like `addTab`, and joining `panelRenderKey`), the Buy view and its sections (~220), moving rites and the levy (~40 net), hover-only previews (~30); `style.css` (~150); `cityPanelRefresh.test.ts` (the render key gains the view).

**Risks:**
- Comparing "build it in 4 turns" with "buy it for 356" takes a switch. The hover card can carry both lines to soften this.
- A purchase is two clicks the first time in a sitting (switch, then buy).
- The town rail loses its spending, which is right for A's split, but the Faith card shrinks to the belief headline.

## A3 — Buy from the row's hover card; one Actions list

Buying lives in the detail card that the user asked to see on hover anyway.

**Buy control**
- Rows are one line: name, hammers, turns, and a small mark at the right edge: a filled coin (can buy now), an open coin (could buy, short of gold), nothing (cannot buy here).
- Hovering or focusing a row opens its detail card **over the right column**: what it does, the preview of what it would add, its hammer cost, and a footer:
  `Buy outright · 356 gold · 89 hammers × 4 · you have 437` and a **Buy** button.
  When it cannot be bought the footer says why, in full.
- The same card opens from the **Building now** name and from **queued rows**, with the same full price and the line "Buying it outright moves its 60 hammers to the next item".
- Click on a row still adds it to the queue. Buying is the card's button, reached by Tab from the focused row (`B` is taken: it founds a city, `controls.ts`).
- On touch: the first tap opens the card, the second adds; the card's Buy button buys. That changes adding on touch from one tap to two.
- What a player reads: *"the card tells me everything about this thing, including what it costs to buy outright today."*

**Spend presentation: one Town actions list** in the town rail, under Focus. Every verb that spends something in this town, one per row, cost in one right-aligned column with its bank:
- `Buy a tile · from 83 gold` (arms Buy tiles), `Levy a citizen ▸ · 1 citizen`, `Rite of the Harvest · 72 faith`, `Omen Reading · 72 faith`, `Call a prophet · 120 faith`.
- Rows that cannot be used now are greyed with one reason line per bank ("Faith: you have 51").
- The header carries the banks: `437 gold · 51 faith · 11 citizens`.

**Treasury:** the band, the Town actions header, and every buy footer (`you have 437`).

**Borrows:** Endless Legend 2 (nested hover cards so you click less); Humankind (the price sits with the item).

**Cost:** about 4.5 days with the rest of A. `cityPanel.ts`: card footers with `explainPurchaseCost`'s lines (~100), coin marks (~30), the card made interactive (today's `createInfoCard` is a note, not a control: `infoCard.ts` needs a pinned, focusable mode; ~120), Town actions list (~120, mostly moves); `style.css` (~130).

**Risks:**
- **Buying is hidden behind a hover.** A player who never hovers a row sees only a coin mark.
- Touch adds a tap to every add.
- The info card becomes a control, which the codebase deliberately avoided (`infoCard.ts`, "a note and not a control"); its focus and dismiss rules need care.

## Compared

| | A (as drawn) | A1 · price on every row | A2 · Build / Buy views | A3 · buy from the hover card |
|---|---|---|---|---|
| Where buying happens | button on "Building now" (reads as a rush) | a price column in the add list | its own view | the row's hover card |
| Price next to a progress bar | yes | never | never | never (card shows no bar) |
| What the price means, in words | unclear | "buy outright · full price" column head | "Buy outright" on each button | "Buy outright · 89 hammers × 4" footer |
| Buy something not queued | 1 | **1** | 2 (1 once the view is remembered) | hover + 1 |
| Buy the current build | 1 | **1** (its row stays in the list) | 2 | hover + 1 |
| See everything affordable at once | no | scan the column | **one section** | scan coin marks |
| Spend presentation | one "Spend" card | beside each bank (Growth line, Faith card, Faith shelf) | **one list sectioned by bank** | one Town actions list |
| Treasury, second place | — | price column head | Buy view header | actions header + card footer |
| Touch | taps | taps | taps | two taps to add |
| Size, with the rest of A | ~4 days | ~4 days | ~4.5 days | ~4.5 days |
| Main risk | reads as rushing | the list stays long and wide | a switch between build and buy | buying hidden behind hover |

## Recommendation

**A2, Build and Buy as two views**, with one piece of A3: the row's hover card also prints the purchase line (`Buy outright: 356 gold, in Buy`) so the price can be checked while choosing what to build.

Why:
- It is the only one where the user's objection cannot arise at all: the Buy view has no bars, and every price is labelled as buying outright.
- It answers the Spend card with the same stroke: spending gold, faith and citizens becomes one list sectioned by bank, with costs in one column.
- "What can I buy right now?" becomes one glance at the top section, which no other iteration gives.
- It keeps the add list short and price-free, which helps the turn-90 length problem.
- Civ VII's complaint about tabs is avoided by remembering the view, as `addTab` already does.

If the user prefers buying in one click from the list they choose from, **A1** is the safe second: the old pattern with every fault of it fixed, and spending placed next to each bank.

## Sources

- Firaxis, *Developing Settlements* (Civilization VII): https://civilization.2k.com/civ-vii/game-guide/gameplay/developing-settlements/
- Steam discussion (Civilization VII): purchases "set back to the production tab instead of the purchase tab": https://steamcommunity.com/app/1295660/discussions/0/591762563949178511
- DiamondLobby (Humankind): "Under its name, you will find its cost in gold and a BUYOUT option": https://diamondlobby.com/humankind/how-to-make-military-in-humankind/
- Amplitude, EL2 *State of the Game – November 2025* ("There is no place to see all the available districts"): https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/1015-%E2%80%8Bstate-of-the-game-%E2%80%93-november-2025
- Power Up Gaming (EL2 nested tooltips, "less clicking is better"): https://powerupgaming.co.uk/2026/09/16/endless-legend-2-full-release-brings-overhaul-to-cut-tedious-clicking/

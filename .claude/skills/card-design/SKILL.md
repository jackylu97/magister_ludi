---
name: card-design
description: Use when proposing, revising or reviewing Order cards for the six decks (Dominion, Expansionist, Commerce, Devotion, Scientific, Magisterial) in Magister Ludi. Covers the user's card principles, how synergy is built, finished builds (an early and a late version of each), themes and throughlines (the deck map), floor and ceiling roles, composition and variety, leaders, tedium against investment, what each age's player is trying to do, and how strong a card dealt at each band must be.
---

# Designing deck cards

This skill is how we write and judge Order cards. It gathers the user's rulings, the bot measurements, and the research on other deckbuilders into one method. Read it whole before proposing a card. The reference files hold the numbers:

- `references/power-bar.md`: what the economy, units and seated cards look like in each age, and the size a new card must reach.
- `references/age-goals.md`: what a player is trying to do in each age, generally and per deck.
- `references/synergy-patterns.md`: the shared stats and moments cards can read, the patterns from other games, and the traps.
- `references/deck-maps.md`: each deck's themes and throughlines, and where its cards sit. Build or update the deck's map before proposing cards for it.

**The current priority is shape, not numbers** (the user, 2026-10-13): the goal is the right *shape* of cards for a closed beta test, and numbers can always be tweaked. Size numbers against the power bar as a sensible first guess, but spend the effort on what a card does, what it connects to, and how it feels to play.

**The goal for a deck** (the user, 2026-10-13): every game should feel slightly different, and a player cannot force a specific build. Cards have synergy and clear throughlines across the game, so playing into a style is rewarded, and each card is also worth taking on its own.

**Design from finished builds** (the user, 2026-10-14: *"we need an idea of a few 'finished builds' (i.e. what a complete set of chairs should look like in the endgame). I think we have too many cards that are individually useful"*). Each deck is designed toward three or four finished builds; see "Finished builds" below. A card's own floor is real but modest, and most of its value is the build it joins. Each build has two versions (the user, 2026-10-15): an early build of Tier 0 to II cards, and a late build of Tier III and IV cards plus one or two early cards that scale. New cards are welcome.

## Specs of record (read before proposing)

- `docs/decks/deck-design.md`: the goals, the rules (three essentials, one mechanic per deck, a real gap, each deck's currency), each deck's section, the pair grid, and the dated rulings: "Card design principles", the note that levies, tended works, commissions and charters stay, "Dominion is the tempo deck", "Only the current band is dealt", and what was declined (tags, a smaller pool per game).
- `docs/decks/<deck>.md`: the deck's current cards, tier tables 0 to IV. On a reorganised sheet (Dominion, 2026-10-13) each row says whether it is live, changing (the user's revision, not built yet), deferred or new, and the user's new card ideas have their own section. The user's revisions and ideas outrank everything else. Ideas still under discussion live in `docs/plans/<deck>-ideas.md` (Dominion's exists).
- `docs/plans/card-measurements-2026-10-13.md`: what cards actually paid in bot games.
- `docs/plans/card-synergy-research.md`: what Balatro, Slay the Spire, TFT, Battlegrounds, Monster Train, Hades and Against the Storm do.
- `docs/plans/deck-midgame-changes.md`: the current list of changes and its rulings.
- `docs/playtest_notes.md`: what the user felt while playing. A card the user called weak or great is evidence.

The user's own words in these files outrank this skill. If they disagree, follow the files and say so.

## The principles (the user's, adopted from LocalThunk's Balatro joker guidelines)

1. **Theme.** The card's name, art idea and effect fit together and fit the deck.
2. **One effect,** plus at most one condition. Two effects on one card are two cards.
3. **Powerful effects are conditional** or carry a drawback.
4. **Fits in.** Most cards should be useful to most builds of their deck, not only to one narrow plan.
5. **Not always the right pick.** No card should be an automatic take in every hand.
6. **Short text.** About one line; a player reads it in a glance.
7. **Simple text.** Plain words, the game's own terms, no new jargon.
8. **Synergy through general stats and keywords, never through specific cards.** A card reads "units trained" or "towns with a garrison", never "while The King's Levy is seated". No Exodia.
9. **No mechanic creep.** Use the mechanics the game has. A new shape is a design decision for the user, marked as such.

## How synergy is built here (pay the most attention to this)

Synergy is what makes a draft feel like building something. Here it comes from **shared quantities and shared moments**, which many cards raise and many cards read, so cards combine without being written for each other. That is Balatro's model, and the user's.

**1. Every card raises or reads a general quantity or moment.**
- A **quantity** is a number the game already tracks: towns, citizens, garrisons, units, military buildings, hexes owned, improvements, tended tiles, cleared camps, captured towns, generals, culture banked, and so on. A **moment** is an announced event: a unit trained, a kill, a camp cleared, a city captured, a building finished, a government adopted, a war declared. See `references/synergy-patterns.md` for the lists and where they live in code.
- A **set-up** card raises a quantity or makes a moment happen more often (The King's Levy musters units; +30% toward early units means more units trained). A **pay-off** card reads it (Muster Rites pays on every unit trained).
- Write the synergy line for every card you propose: **Raises:** … **Reads:** … and name the other live cards (in the seat's pool: its two decks, the shared cards naming either, and the generic cards) that raise what it reads and read what it raises.

**2. A pay-off needs set-ups the player can actually get.**
- Before proposing a pay-off, count the cards that raise its quantity in a two-deck seat's pool **at or before its band**. Three or more is the floor. A pay-off with nothing feeding it is a dead card (The Tithe paid nothing because nobody built temples).
- A set-up with no pay-offs is fine if it is useful on its own. Slay the Spire's rule: set-ups stand alone, pay-offs reward commitment, and without pay-offs nobody commits.
- Check the condition is reachable in the band the card is dealt. Established Routes asked for a route kept 30 turns, which almost never happened.

**3. Saturating quantities do not build.** One garrison per town and one of each military building per town means "per garrison" and "per Barracks" scale with towns, not with effort. That is a useful steady base (and it does not reward a huge army), but it is not a build-around. A build-around reads something the player can push: units trained, kills, camps, captures, citizens spent, hexes, improvements.

**4. Use the layers.** Yields fold flats first, then town percentages, then empire percentages (`docs/yields.md`, Entry XVII). So a percentage card is worth more in a seat full of flat cards. That is a free, general synergy between a deck's flat cards and its percentage cards, and it should be designed for on purpose.

**5. Growers and "this game" counters bridge the bands.** Only the current band is dealt, so earlier bands' cards leave the draw. Two shapes make earlier play keep mattering:
- A **grower** gains a little each time a moment happens while it is seated ("gains +1 science each time you train a unit"). It pays for what you do, not what you hold, so a lost war does not shrink it. It gives a seated card something to feed.
- A **"this game" counter** reads everything done so far ("+5 culture per camp cleared this game, at most +40"). The user's edit to The Pacified Marches is the model. A band 1 or 2 card that pays off band 0 play.

**6. Bridges and pairs.** A card that serves two plans inside its deck (garrisons and training, say) makes pivots possible. Across decks, synergy comes through currencies: one deck's currency feeding the other deck's way of spending it (`docs/decks/deck-design.md`, the currency table and the pair grid). Never write a card that names the partner deck's card.

**7. Doublers are the rarest pay-off.** "Your kills grant their rewards twice" multiplies a whole category. Few, rare, late, and only where the category has many cards.

**8. Avoid:**
- Two narrow facts in one condition ("garrisoned towns with a Monument beside a river").
- Conflicting plans that make cards dead (war-only cards in a peaceful hand). War cards must earn a chair at peace by being strong enough that the player holds them for the coming war (see the power bar).
- Tags or labels written only to make cards combine (declined by the user).
- Pay that grows with army size held at peace for Dominion: it punishes losses in war and compounds a conqueror's lead (the tempo ruling).

## Finished builds: an early and a late version

A **finished build** is what a seat's chairs look like once a plan has come together. Each deck has three or four, written in `references/deck-maps.md` (Dominion's draft is `docs/plans/dominion-builds.md`). They are the target the deck is designed toward: every card belongs to at least one of them, or is deliberately glue.

**Two versions of each build.** The user, 2026-10-15: *"lets do two versions, an early game build composed of tier 0/1/2 cards and a late game build composed of tier 3/4 cards (with possibly 1-2 earlier cards that scale throughout the game). You're not limited to cards that already exist or are proposed, focus on creating a satisfying playstyle and synergistic bonuses, with a mix of utility that fits with the build theme"*.
- **The early build** is made of Tier 0, I and II cards.
  - It has eight chairs at the end of Tier II, but five for most of the early game (Tier I), so name its **five-chair core**.
  - Tier 0 is dealt only until age 2 opens Tier I, which is about six drafts. So the build holds two Tier 0 cards, three at most.
  - It switches the loop on: openers that start the build's quantity, the first pay-offs, at least one card that changes what the player does (a new action or a broken rule), and a grower or "this game" counter that will keep scaling.
- **The late build** has eleven chairs: Tier III and IV cards, plus the one or two early cards still seated because they grew.
  - It runs the loop at full size: percentages on top of the flats (the yield layers), a capstone that breaks a rule or doubles a category, and a card that makes a visible moment.
- **Reachability.** Tier IV opens at draft 45, which few games reach (7 of 30 bot seats in the measurements of 2026-10-13, at a median turn of 189). Put each build's capstone in Tier III and treat Tier IV as the long-game layer, unless the ladder changes.

**Why.** A deck designed card by card, each with a full floor, ends up as a pile of individually useful cards. A seat then fills its chairs with whichever card pays most on its own. The endgame chairs look alike from game to game, and no draft feels like a plan coming together. The 2026-10-13 audit points the same way:
- raisers outnumber readers: about twelve cards make more units and two read them; about twenty create citizens and four read them in the midgame;
- most readers sit on saturating quantities (garrisons, military buildings), which pay the same with or without a plan.

The first Dominion draft (2026-10-14) fell flat for three reasons worth avoiding:
- it was assembled from cards already on the sheet, mostly flats that barely touched each other;
- it showed one endgame mixing Tier 0 and Tier IV cards, though only the current band is dealt, so it never showed the build coming together;
- it had few moments and no capstone.

**What to write for each finished build:**
- **The fantasy,** in a sentence or two, and **the loop in one line** (X → Y → more X), built on a quantity or moment the playstyle produces by itself.
- **The early build:**
  - a table of its chairs: card, tier, rarity, text, role, what it raises or reads, the essential it pays, and status and shape;
  - the five-chair core;
  - how a few turns feel.
- **The late build:**
  - the same table;
  - which early scalers carried over, and how big they grew;
  - the capstone and the moment;
  - how a few turns feel.
- **The utility mix, what the build gives up, its partner decks and its leader.**
- **Alternatives for each version,** so several routes reach the build and none can be forced.

**New cards are welcome.** Do not limit a build to cards that exist or are proposed. Mark each new card, and mark each effect the vocabulary cannot express as a **new shape**, saying what is missing. Prefer a few new shapes that several cards share, reading mechanics the game already has, over many one-offs.

**Checks:**
- **One loop.** Every chair raises the build's quantity, reads it, or pays an essential or a fitting utility from it.
- **Better together.** An engine card is clearly stronger in its build than in a seat without one.
- **The build beats a pile.** A finished build should clearly out-earn the same number of the deck's strongest individual cards seated together: eight for the early build, eleven for the late one. If it does not, drafting for a plan is not worth it.
- **Several routes.** Any two of a build's core cards turn it on; no build depends on one card.
- **A scaler carries over.** At least one early card is still worth its chair in the late build, because of what the build did.
- **The essentials along the way.** Science, culture and production in both versions, from the build's own quantity where possible.
- **Every card has a home.** Each card belongs to at least one finished build or is deliberately glue. A card that serves two of a deck's builds is a bridge, and bridges make pivots possible.
- **Individual usefulness falls with the band.**
  - Tier 0 is mostly glue and openers that point toward builds.
  - Tiers I and II mix openers and engine cards.
  - Tiers III and IV are mostly pay-offs and capstones that cash in what the seat assembled.
  - A late card that does little outside its build is acceptable; an early one is not.
- **Glue is a minority.** Starting target (the orchestrator's proposal, 2026-10-14; the user may change it): about a quarter of a deck is glue, half engine cards, and a quarter pay-offs and capstones.

**How this fits the principles.** Principle 4 ("fits in") and "each card is also worth taking on its own" still hold, read this way: a card fits two or three of its deck's finished builds rather than every seat, and its floor is enough to take it when the draft goes elsewhere, never so much that the build is pointless.

**Measuring it.** `explainCardImpact` (`src/sim/cardImpact.ts`) gives a seated card's ghost diff. Run it in two kinds of seat: one holding the card's build partners and one holding none. The gap is the card's synergy margin, and most engine cards should show a clear one.

## Themes and throughlines: the deck map

Two different axes. Keep them apart.

- **Themes are the deck's materials:** the pieces, quantities and moments its games are made of. For Dominion: great generals and citadels, garrisons, units trained, military buildings, barbarian camps, mounted, siege and naval units, captured towns, pillage, war and peace, logistics, upkeep, reparations, strategic resources and pastures. Cards are written on themes.
- **Throughlines are directions a player can lean into.** For Dominion: the garrison state, raising the host, raiders, and conquest. They are not buckets cards belong to. They are a check: if a player leans this way, is there a rewarded path through all four ages, with access to science, culture and production along it?
- **A strong theme serves several throughlines.** It offers a version that rewards each style and a version that is simply good. The user's example, generals and citadels: a unit standing on a citadel makes science (the garrison state); great generals give strength to adjacent units attacking cities (conquest); citadels gain food and production (good for anyone).
- **The best anchors are themes the playstyle produces by itself.** A Dominion player fights, so earns general renown; generals make citadels; an army brings garrisons; barbarians bring camps. Cards that read these have a high floor, because the quantity shows up whether or not the player drafted for it, and set-up cards lift the ceiling. That is Balatro's played hands feeding the jokers. A quantity that only cards produce is a weaker anchor.
- In the design docs (never in the game), note for each card its themes, the throughlines it serves, its role, the essential it pays, its band and its shape. `references/deck-maps.md` holds the map.

## Floor and ceiling: the three roles

Every card has a **floor** (what it does in a seat that is not building around it) and a **ceiling** (what it does in a seat that is). Every card needs a real floor, but an engine card's floor is modest: most of its value is the finished build it joins (see "Finished builds").

| Role | Floor | Ceiling | Usually |
|---|---|---|---|
| **Glue / opener** | high | low | common: fits most builds, starts a quantity |
| **Pay-off** | medium | high | uncommon: grows with commitment |
| **Build-defining** | carries a condition or drawback | very high | rare: changes how the player plays |

A pay-off with no floor is a dead card. An opener whose ceiling matches a pay-off makes commitment pointless. The rarity column is a tendency, not a rule.

## Composition: checks across a band and across the deck

- **Theme check:** each major theme has cards serving at least two throughlines, plus one that is good to anyone, spread over several bands.
- **Throughline check:** each throughline has a path through all four ages, with science, culture and production reachable along it. This is where "the deck needs science and culture" is answered for each style of play, not only for the deck as a whole.
- **Peace and war:** most of bands 0 and 1 is useful at peace. War cards are strong enough to be held through peace.
- **Shapes:** a band mixes flats, percentages, payouts on moments, growers, rules, combat lines, commissions, charters and levies. No shape dominates.
- **Rarities:** each band has glue, pay-offs and a few build-defining rares.
- **Builds:** every card belongs to a finished build or is deliberately glue; glue is a minority, and individual usefulness falls from band 0 to band 4 (see "Finished builds").
- **One job per card.** A card's job is what it reads, what it pays and where. Two cards with the same job are merged, or one changes what it reads.
- **Theme and history:** each card names a real institution or practice, does what that institution did, and sits in the band of its era (no Knights Templar in band 0). The Soldier-Farmers paying food at peace (the Chinese *tuntian*) is the model.

## Variety: every game slightly different, no forced build

- **No linchpin.** No throughline depends on one specific card; each has several routes.
- **Density per band.** Each hand holds one or two cards of each deck, and long bands run a dozen drafts against about 13 deck cards, so a seat sees most of a long band. Variety then comes from band 0 (four drafts show four of about eleven cards), from the rares, from which cards the player seats, and from the partner deck. Band 0's openers do much of the work of making games differ: give them several directions.
- **Themes that cross throughlines** let a player pivot when the draft goes elsewhere: a card bought for one style still counts toward another.
- **Leaders colour, they do not narrow** (see below).

## Leaders

- Each leader's ability points at a theme of its decks (Modu Chanyu: mounted units and pillage; Taizong: melee and garrisons; Joan: kills and faith; Mithridates: camps and plantations, and fighting wider empires).
- That theme has at least three cards in the leader's two decks, across several bands and more than one throughline, so the leader has something to draft toward without being locked into one build.
- Nothing names a leader or a leader's unique unit or building.
- Leaders will be tuned later; when a card proposal makes a leader's theme thin or rich, say so.

## Tedium: attention against impact

The user's distinction: investment is not tedium, though they overlap. **Investment is attention spent on choices whose results the player can see. Tedium is attention spent on actions or tracking that do not change what the player chooses.** "+1 production on pastures" is satisfying: the player was already choosing pastures, and now they pay more. Training units is borderline: the decision is fine, but every unit is something to order every turn, and units the player does not need become chores. The worst case is a card that takes a lot of mental bandwidth and is not impactful or fun.

Ask of every card:
1. **Does it reward something the player already does, or assign a chore?** Rewarding an existing choice is best; adding one interesting new choice is good; adding repeated actions is bad.
2. **What does it leave on the map?** Units are the most expensive thing a card can create, because each one needs orders every turn. Prefer fewer, better pieces (the best unit the player can build, arriving where it is needed) or a payout instead of a piece.
3. **What must the player track?** A counter, timer or condition across turns must be tracked and shown by the game (a grower's current value, a commission's progress). Hidden state the player must compute is tedium.
4. **Is the best play to repeat something dull?** Training to disband, declaring and making peace, farming a respawning camp. That is tedium and an exploit at once; caps and once-per-turn limits fix both. Not every loop is unwanted: the user wants to support feeding units to die as a way to play (2026-10-13), so cards paying on a lost unit pay on any loss. Ask before "fixing" a loop that is a playstyle.
5. **Does it ask for positioning outside a fight?** Adjacency bonuses are good in battle, where the player is arranging units anyway, and tedious as an economy card at peace.

| | Low impact | High impact |
|---|---|---|
| **Low attention** | Filler: fine as cheap glue | The best cards |
| **High attention** | **Cut** | Build-defining: fine for rares, if the attention is the fun part |

Attention turns into investment when the player is making choices with it and sees the result grow: a commission or grower whose progress is shown and whose payoff arrives as a moment.

## Power: what a card dealt now must be worth

Read `references/power-bar.md` for the tables. The rule behind them:

- A new card earns a chair by displacing a card already seated. The card to beat is the **median seated card** at that point (the weakest seated card pays zero per turn, because combat and rule cards are always among them). An exciting card approaches the **best seated card**.
- The economy grows about three to four times per band. Write each band's numbers in its own age's terms. A band 0 flat that is a headline in age 1 is gone by age 3, and that turnover is healthy: it is what makes new drafts feel like upgrades.
- **Culture is scarce early** (about 3 a turn in age 1, 14 in age 2) and culture is the draft currency. Price early culture as worth roughly three times its face value.
- **War cards are measured in wars,** not yield. A captured town of five or six citizens is worth 40 to 80 yield a turn in age 3. A card that takes a city ten turns sooner is worth more than any economy card, but only to a player going to war.
- **One-off lumps must be big enough to notice:** about 10 to 15 turns of the band's regular card. One-off grants paid almost nothing in the measurements (0.39 yield per seat per turn).
- Bots measured one-effect cards paying more than two-effect cards (3.8% of seat yield against 2.9%).

## What each age wants

Read `references/age-goals.md`. Each band's cards should serve the goals of the age in which that band is dealt (band 0 ≈ age 1, band 1 ≈ age 2 into early age 3, band 2 ≈ late age 3, band 3 ≈ age 4). Band 1 is the longest stretch (about turns 55 to 114 and a dozen drafts), so it needs cards for both the opening of the age and its end.

Each band needs three kinds of card:
1. **Cards for that age's goals, sized to that age's bar.** These displace the previous band's cards.
2. **A few cards that pay off earlier play** (growers, "this game" counters).
3. **War cards strong enough to hold a chair through peace** (about 10 to 15% of that age's unit strength, or a siege 30 to 50% faster).

## The effect vocabulary

- Prefer shapes that exist. The effect union is `CardEffect` in `src/sim/statecraftData.ts`; the one reader is `src/sim/statecraft/evaluator.ts` (use `grep -a`; BSD grep treats it as binary). Moments: `WindfallOccasion`, `TallyOccasion` (both in `statecraftData.ts`) and `Occasion` in `src/sim/occasions.ts`. Counts: `CountKind`. Conditions: `EmpireCondition`. Read the existing card rows in `data/decks/*.json` to see how a shape is written.
- A card that needs a new shape is marked **New shape**, with exactly what is missing. Keep these few, and prefer one new shape that several cards share.
- A card whose text needs a one-off is deferred and annotated, never bent into a near fit (CLAUDE.md).

## Writing a proposal

For each card:

| Field | What to give |
|---|---|
| Name | Short, period-flavoured noun phrase in the style of the deck's cards |
| Band, rarity | Band 0 to 4; common, uncommon or rare |
| Text | The player-facing line, with numbers, in plain words |
| Age goal | Which goal of that age it serves (from `age-goals.md`) |
| Themes and throughlines | The themes it is written on, the throughlines it serves, and which deck-map gap it fills |
| Role | Glue, pay-off or build-defining, with its floor (alone) and ceiling (built around) |
| Builds | The finished builds it belongs to, in which version (early or late), and its role there (opener, engine, pay-off, scaler, capstone, utility), or "glue" |
| Attention | What the player does differently with it seated, what it leaves on the map, what must be tracked; where it sits on the attention-against-impact table |
| Power | The arithmetic against the bar: what it pays at the start and end of its band in a typical seat, compared with the median and best seated card |
| Synergy | Raises: … Reads: … with the live cards in a seat's pool that feed it and that it feeds, and how many raisers exist at or before its band |
| Displaces | What kind of seated card it pushes out, and why a player would make that swap |
| Condition or drawback | If it is powerful, what holds it back |
| Shape | The existing effect kind and fields, or **New shape** and what is missing |

Then a short note on the combinations the batch opens, each stated through a general quantity or moment.

## Before you hand it over

- The deck map was read (or built) and each card says which gap it fills.
- Each card names the finished builds it belongs to, the version (early or late) and its role there, or says it is glue; the batch does not add to the glue share without saying so.
- Every card has a real floor, and the batch mixes roles, shapes and rarities without two cards doing the same job.
- Each card's theme and era fit its band and its historical model.
- No card is high attention and low impact; cards that create units or ask for tracking justify it.
- No card is a linchpin that one throughline depends on.
- Each card has one effect and at most one condition, and its text fits on one line.
- No card names another card.
- Every pay-off has three or more set-ups available at or before its band in a two-deck pool.
- Every number is checked against the power bar for its band, with the arithmetic shown.
- Culture paid in bands 0 and 1 is priced as scarce.
- War cards say what they do to a war, in that age's unit strengths and costs.
- The user's own edits in the deck sheet were read and are not contradicted silently.
- Plain English throughout (CLAUDE.md "Writing").

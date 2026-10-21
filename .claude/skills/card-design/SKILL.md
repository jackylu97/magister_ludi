---
name: card-design
description: Use when proposing, revising or reviewing Order cards or Doctrines for the six decks (Dominion, Expansionist, Commerce, Devotion, Scientific, Magisterial) in Magister Ludi, or when running a deck pass (map, themes, the deck sheet and the user's passes on it, rulings, Doctrines, card types and chairs, triage for the build). Covers the user's card principles, how synergy is built, each deck as a way to play built from a few themes (supply, widen, multiply and act cards, with example councils early and late), materials and the deck map, floor and ceiling roles, composition and variety, leaders, tedium against investment, what each age's player is trying to do, and how strong a card dealt at each band must be.
---

# Designing deck cards

This skill is how we write and judge Order cards. It gathers the user's rulings, the bot measurements, and the research on other deckbuilders into one method. Read it whole before proposing a card. The reference files hold the numbers:

- `references/power-bar.md`: what the economy, units and seated cards look like in each age, and the size a new card must reach.
- `references/age-goals.md`: what a player is trying to do in each age, generally and per deck.
- `references/synergy-patterns.md`: the shared stats and moments cards can read, the patterns from other games, and the traps.
- `references/deck-maps.md`: each deck's materials, themes and throughlines, and where its cards sit. Build or update the deck's map before proposing cards for it.

**The current priority is shape, not numbers** (the user, 2026-10-13): the goal is the right *shape* of cards for a closed beta test, and numbers can always be tweaked. Size numbers against the power bar as a sensible first guess, but spend the effort on what a card does, what it connects to, and how it feels to play.

**Be bold** (the user, 2026-10-20): *"you can be a great card designer, don't be afraid to opinionated, bold, bias towards things that are interesting and fun rather than focusing on numbers. try to focus on not adding new sources of user inputs and operate on what mechanics we have. if there's an interesting compelling feature that would affect multiple decks, and could enable some design ideas, let me know."* So:
- prefer the card that changes how a game plays over the card that adds a number;
- take a position and say why, and offer the user choices only where the decision is really theirs;
- add no new player input (no new button, menu, choice or target to pick); build on what the game has;
- when one feature would open good cards in several decks, propose it to the user as a feature, with the cards it enables, and do not build cards on it before the user agrees.

**The goal for a deck** (the user, 2026-10-13): every game should feel slightly different, and a player cannot force a specific build. Cards have synergy and clear throughlines across the game, so playing into a style is rewarded, and each card is also worth taking on its own.

**A deck is a way to play, built from a few themes** (the user, 2026-10-20). Each deck has an engine and three or four themes from different parts of the game, and the bonuses inside each theme vary. See "A way to play, built from a few themes" below. This replaces the method of 2026-10-14 to 2026-10-17, which designed each deck as four or five finished builds of one loop each, and made every deck one note. Finished builds stay as **example councils**: a check that the themes come together into a satisfying set of chairs, early and late. New cards are welcome.

## The deck pass: the order we work in

Dominion went through this in October 2026, and every deck is worked the same way (the user, 2026-10-16: *"could you edit the card-design skill to fold in this process that we're using?"*). Each stage ends with the user's review, and their words are recorded, verbatim and dated, before the next stage starts.

1. **Map the deck:** its way to play (from `docs/decks/deck-design.md`, "Direction, 2026-10-20"), its engine, its materials, its three or four themes and the areas of the game they reach, how it reaches science, culture and production through the four ages, its pairs with the other five decks, its leaders, and where its sheet is thin. See "Materials, themes and the deck map". It is written at the top of `docs/plans/<deck>-themes.md`, and goes into `references/deck-maps.md` once the user approves it.
2. **Design the themes:** cards in the four roles for each theme, tier by tier, and two or three example councils, early and late. See "A way to play, built from a few themes". Scientific's pass (2026-10-20) is the first on this method.
3. **Put every card on the deck sheet,** the spec of record. See "The deck sheet". The builds' new cards go on it as `add` rows.
4. **The user's passes on the sheet.** The user edits the sheet by hand, and each pass is folded in. See "Folding in the user's pass".
5. **Questions and rulings.** See "Questions and rulings".
6. **Doctrines:** three to five per tier, Tiers I to IV. See "Doctrines".
7. **Card types:** every card is Military, Economic, Civic or Wildcard. See "Card types and chairs".
8. **Triage, then build:** every `add` and `modify` row and every Doctrine sorted by what it needs, then built in batches. See "From the sheet to the game".

## Specs of record (read before proposing)

- `docs/decks/deck-design.md`: the goals, the rules (three essentials, one mechanic per deck, a real gap, each deck's currency), each deck's section, the pair grid, and the dated rulings: "Card design principles", the note that levies, tended works, commissions and charters stay, "Dominion is the tempo deck", "Only the current band is dealt", and what was declined (tags, a smaller pool per game). **Its section "Direction, 2026-10-20" wins where the file disagrees with itself:** the user's picture of each deck, verbatim; the table of what each deck is paid for, when it is strongest and what it gives up; and the splits where two decks claim the same thing.
- `docs/decks/<deck>.md`: the deck's current cards, tier tables 0 to IV, with each row's status and type (see "The deck sheet"). The user's revisions and ideas outrank everything else. Ideas still under discussion live in `docs/plans/<deck>-ideas.md` (Dominion's exists).
- `docs/plans/<deck>-builds.md`: the deck's map and its finished builds, with the user's rulings at the end. Dominion's and Expansionist's are built. The four of 2026-10-17 (Commerce, Devotion, Scientific, Magisterial) are superseded in method, but their maps of materials still hold. A pass on the new method writes `docs/plans/<deck>-themes.md`.
- `docs/plans/doctrines-governments-chairs.md`: Doctrines, the governments' chair mixes and the card type rules, with the rulings in date order at the top.
- `docs/plans/<deck>-build-triage.md` and `docs/plans/chairs-build.md`: what each card needs before it can be built, and the build order.
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

## A way to play, built from a few themes

**The direction** (the user, 2026-10-20, after reading the six builds passes; `docs/decks/deck-design.md`, "Direction, 2026-10-20"): *"each deck feels a bit one note, and needs diverse bonuses that aren't so squarely on theme with their central purpose/yield. Each deck should instead feel like a different way to play the game, and shouldn't be entirely focused on the corresponding yield."* On how the cards still hold together: *"i think we can centralize around a few themes, even if the bonuses and yields are varied. i.e. giving food and production from academies, and then a multiplier on the academy yields, and then a bonus towards generating great scholars, are all separate bonuses that play in a similar direction."*

**Why the earlier method was one note.** From 2026-10-14 to 2026-10-17 each deck was designed as four or five finished builds. Each build was one loop on one quantity, and every chair had to raise that quantity, read it or pay from it. The builds were tidy, but:
- each deck's themes stayed inside its own subject (Scientific's were technologies, schools and scholars);
- each build fed one number, so its cards read alike;
- most rewards were the deck's own yield or the three essentials.

**A deck owns what it asks the player to do. What it gives back can be anything:** any yield, happiness, authority, units or a rule change. Two decks can pay the same reward and still feel different, because the player did different things to earn it. Dominion pays production for a captured town, and Devotion for a town that follows its religion. What a deck asks for is a way to play, wider than one yield: Scientific asks the player to research, grow great cities, call scholars and field elite units.

**The parts of a deck:**
- **The engine:** the currency the deck makes in bulk and the way it spends it (the currency table in `deck-design.md`). Scientific's engine is technologies and charters.
- **Three or four themes** from different parts of the game. A theme is a material the deck centres on (Academies, empire buildings, elite units). It is a direction that many cards push, not a closed loop: a card only has to push its theme, not feed the next card in a cycle.
- **Engine glue:** cards that raise or spend the engine itself, and so serve every theme.
- **The cost:** what the deck gives up, from the table in "Direction, 2026-10-20". The cards must show the cost, or the deck has none.

**The five areas of the game:** the army, the land, the economy, civic life (happiness, authority and government), and great people and wonders. A deck reaches at least four of them. Where two decks claim the same thing, "Direction, 2026-10-20" splits it. Follow the split; if it gets in the way of a good card, say so.

**Four roles inside a theme.** Each theme has cards in all four roles, spread over the tiers. The user's Academy example fills three of them:
- **Supply:** more of the thing (a bonus toward great scholars, who found Academies).
- **Widen:** the thing pays something it did not pay before (Academies give food and production).
- **Multiply:** the thing's output grows (Academy yields +X%). The Bourse (`buildingYieldPercent`) and Hypatia's The Commentaries (a great person's work pays half again) are the models in the data.
- **Act:** a choice or a moment around the thing (a scholar founds an Academy or writes a treatise). Without an act card, a theme is set up once and then pays with no more decisions.

**Rules for the roles:**
- **Widen cards pay what the theme does not already make.** That is where the variety comes from.
- **Supply and widen cards come early, multiply cards later.** A percentage is worth more once the flats exist (the yield layers, "How synergy is built here", item 4).
- **About three cards per theme in each tier.** A seat can then find a theme in the long tiers (Tier II runs about nine drafts) but cannot count on it in Tier I (about five).
- **No more than about a third of a deck's cards pay its own yield.**
- **A scaler carries over.** Each theme has a grower or a "this game" counter in Tier I or II that is still worth its chair late.
- **Rule-breakers are wanted.** The user, 2026-10-15, on Dominion's late capstones: *"these are great, if anything, we need more cards like this."* Each theme has a capstone in Tier III that breaks a rule or doubles a category, so the theme works without Tier IV.

**Example councils.** Finished builds stay as a check, not as the unit of design. The user, 2026-10-14: *"we need an idea of a few 'finished builds' (i.e. what a complete set of chairs should look like in the endgame). I think we have too many cards that are individually useful"*. Each pass shows two or three example councils that mix themes, and some that mix in the partner deck:
- **Early:** five chairs through Tiers I and II, because the tier-4 and tier-10 governments both seat five. Show the council at the end of Tier I and at the end of Tier II. Tier 0 is dealt only for the first three drafts, so a council holds two Tier 0 cards, three at most.
- **Late:** eight chairs at Tier III (the tier-18 governments) and eleven at Tier IV (the tier-26 governments): Tier III and IV cards, plus the early scalers still seated.
- **For each council:** its chairs (card, tier, theme, role), the government that seats it, and how a few turns feel.
- **Reachability.** An Order tier opens at its draft rung alone: Tier I at 4 drafts, Tier II at 10, Tier III at 18 and Tier IV at 26 (`docs/flags.md` (eeeeeee)). Modelled from the bot games' culture (`docs/plans/draft-pacing-2026-10-17.md`), the first hand of each tier comes at about turn 32, 72, 133 and 161, and a draft comes every 7 or 8 turns all game. In the model, 15 of 30 bot seats reach Tier IV in 200 turns. Keep each theme's capstone in Tier III, and use Tier IV for the long game.

**Checks:**
- **Themes beat a pile.** A theme's cards are clearly stronger seated together than apart. A council of one theme's cards out-earns the same number of the deck's strongest single cards; if it does not, drafting for a theme is not worth it.
- **Several routes.** Any two of a theme's cards start it; no theme depends on one card.
- **Every card has a home:** a theme, or engine glue. A card that serves two themes is a bridge, and bridges make pivots possible.
- **The essentials along the way.** A seat that leans on any one theme still reaches science, culture and production.
- **Individual usefulness falls with the band.** Tier 0 is mostly glue and openers that point toward themes. Tiers I and II mix openers and engine cards. Tiers III and IV are mostly pay-offs and capstones. A late card that does little outside its theme is acceptable; an early one is not.
- **Glue is a minority.** Starting target (2026-10-14; the user may change it): about a quarter glue, half engine cards, and a quarter pay-offs and capstones.

**How this fits the principles.** Principle 4 ("fits in") and "each card is also worth taking on its own" still hold, read this way: a card fits its theme and often a second one, and its floor is enough to take it when the draft goes elsewhere, never so much that the theme is pointless.

**New cards are welcome.** Mark each new card, and mark each effect the vocabulary cannot express as a **new shape**, saying what is missing. Prefer a few new shapes that several cards share, reading mechanics the game already has, over many one-offs.

**Measuring it.** `explainCardImpact` (`src/sim/cardImpact.ts`) gives a seated card's ghost diff. Run it in a seat that holds the card's theme partners and in one that holds none. The gap is the card's synergy margin.

**Where the earlier passes stand.** Dominion's builds (2026-10-15) and Expansionist's (2026-10-16) are built and live, and are revised with this method later. The passes of 2026-10-17 for Commerce, Devotion, Scientific and Magisterial are superseded in method, but their maps of materials still hold.

## Materials, themes and the deck map

- **Materials** are everything a deck's games are made of: the pieces, quantities and moments its cards could read. For Dominion: great generals and citadels, garrisons, units trained, military buildings, barbarian camps, mounted, siege and naval units, captured towns, pillage, war and peace, logistics, upkeep, reparations, strategic resources and pastures. The map lists them, with where each lives in the sim.
- **Themes** are the three or four materials the deck centres on, chosen from different areas of the game (see "A way to play, built from a few themes").
- **A strong theme rewards several styles, with varied bonuses.** The user's example, generals and citadels: a unit standing on a citadel makes science; great generals give strength to adjacent units attacking cities; citadels gain food and production, which is good for anyone. It is the same idea as the Academy example of 2026-10-20.
- **The best anchors are materials the playstyle produces by itself.** A Dominion player fights, so earns general renown; generals make citadels; an army brings garrisons; barbarians bring camps. Cards that read these have a high floor, because the quantity shows up whether or not the player drafted for it, and supply cards lift the ceiling. That is Balatro's played hands feeding the jokers. A quantity that only cards produce is a weaker anchor.
- **Throughlines** are the combinations a seat can lean into: two themes together, or a theme with the partner deck. The example councils show them. Each needs a rewarded path through all four ages.
- In the design docs (never in the game), note for each card its theme, its role, what it pays, its band and its shape. `references/deck-maps.md` holds the maps the user has approved.

## Floor and ceiling: the three roles

Every card has a **floor** (what it does in a seat that is not building around it) and a **ceiling** (what it does in a seat that is). Every card needs a real floor, but an engine card's floor is modest: most of its value is the theme it joins (see "A way to play, built from a few themes").

| Role | Floor | Ceiling | Usually |
|---|---|---|---|
| **Glue / opener** | high | low | common: fits most builds, starts a quantity |
| **Pay-off** | medium | high | uncommon: grows with commitment |
| **Build-defining** | carries a condition or drawback | very high | rare: changes how the player plays |

A pay-off with no floor is a dead card. An opener whose ceiling matches a pay-off makes commitment pointless. The rarity column is a tendency, not a rule.

## Composition: checks across a band and across the deck

- **Theme check:** each theme has supply, widen, multiply and act cards spread over the bands, and its widen cards pay several different things.
- **Area check:** the deck reaches at least four of the five areas of the game, and no more than about a third of its cards pay its own yield.
- **Path check:** a seat that leans on any one theme has a path through all four ages, with science, culture and production reachable along it.
- **Peace and war:** most of bands 0 and 1 is useful at peace. War cards are strong enough to be held through peace.
- **Shapes:** a band mixes flats, percentages, payouts on moments, growers, rules, combat lines, commissions, charters and levies. No shape dominates.
- **Rarities:** each band has glue, pay-offs and a few build-defining rares.
- **Homes:** every card belongs to a theme or is engine glue; glue is a minority, and individual usefulness falls from band 0 to band 4 (see "A way to play, built from a few themes").
- **One job per card.** A card's job is what it reads, what it pays and where. Two cards with the same job are merged, or one changes what it reads.
- **Theme and history:** each card names a real institution or practice, does what that institution did, and sits in the band of its era (no Knights Templar in band 0). The Soldier-Farmers paying food at peace (the Chinese *tuntian*) is the model.

## Variety: every game slightly different, no forced build

- **No linchpin.** No theme depends on one specific card; each has several routes.
- **Density per band.** Each hand holds one or two cards of each deck, and long bands run a dozen drafts against about 13 deck cards, so a seat sees most of a long band. Variety then comes from band 0 (four drafts show four of about eleven cards), from the rares, from which cards the player seats, and from the partner deck. Band 0's openers do much of the work of making games differ: give them several directions.
- **Bridge cards** that serve two themes let a player pivot when the draft goes elsewhere: a card bought for one theme still counts toward another.
- **Leaders colour, they do not narrow** (see below).

## Leaders

- Each leader's ability points at a theme of its decks (Modu Chanyu: mounted units and pillage; Taizong: melee and garrisons; Joan: kills and faith; Mithridates: camps and plantations, and fighting wider empires).
- That theme has at least three cards in the leader's two decks, across several bands and more than one throughline, so the leader has something to draft toward without being locked into one theme.
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

Read `references/age-goals.md`. Each band's cards should serve the goals of the age in which that band is dealt. Since the age gate went (2026-10-17), the bands open by the draft count alone, and each one starts before the age it used to wait for. Modelled from the bot games: band 0 ≈ early age 1, band 1 ≈ late age 1 and most of age 2, band 2 ≈ late age 2 and most of age 3, band 3 ≈ late age 3 into age 4, and band 4 ≈ age 4 (`docs/plans/draft-pacing-2026-10-17.md`). Band 2 is the longest stretch (about turns 72 to 133 and eight drafts), so it needs cards for both the opening of the age and its end.

Each band needs three kinds of card:
1. **Cards for that age's goals, sized to that age's bar.** These displace the previous band's cards.
2. **A few cards that pay off earlier play** (growers, "this game" counters).
3. **War cards strong enough to hold a chair through peace** (about 10 to 15% of that age's unit strength, or a siege 30 to 50% faster).

## The deck sheet: `docs/decks/<deck>.md`

The sheet is the spec of record for a deck's cards. Dominion's is the model.
- **Layout:**
  - a header that explains the columns and statuses;
  - two counts tables, by status and by type;
  - one section per tier, `## Tier 0` to `## Tier IV`. Each section has a Doctrine table (Doctrine | Build | Text, Tiers I to IV only) and an Orders table (Card | Rarity | Status | Ability | Type);
  - the shared table: cards shared with another deck, whose rows live in `data/decks/common.json`;
  - "Open for your pass".
- **Statuses:**
  - `implemented`: in the data, dealt, and plays as written;
  - `modify: <why>`: in the data but needs work. `revised` is the user's revision. The others are `replaced`, `reworked`, `wording`, `deferred` (not dealt, because it needs a new shape), `merged` (it becomes a shared card), `as built` (the game does something slightly different), and `cut` (the user removed it; it sits in a Cut table until the build retires its data row);
  - `add`: not in the data yet. `add: reworked` and `add: rule-breaker` say where it came from;
  - "(was …)" names the data row a renamed card takes over.
- **The sync test** (`test/sim/decks/<deck>.test.ts`) reads the tier tables:
  - an `implemented` row's rarity, tier and text equal the data row's exactly;
  - a `modify` row's data row exists, and an `add` row's does not;
  - every live data row is listed once;
  - the Type column matches the data wherever the row has a data row.
  - Doctrine tables have three cells, and the test skips them.
  - So a sheet edit that would break the test is a status change, not only a text change: an `implemented` card the user rewrites becomes `modify: revised`.
- **The counts tables** are recomputed from the rows after every edit. Cut rows are not counted.
- **"Open for your pass,"** at the foot, has three lists:
  - still open, each with a recommendation;
  - answered in the user's pass, with their words;
  - ruled in chat, with their words.

## Folding in the user's pass

The user marks up the sheet by hand: rewritten abilities, changed rarities and types, deleted rows, answers written into the open section, new cards as loose lines ("common: … civic"), and placeholder names ("rename"). Their edits outrank everything else.
- **Wait until the file is quiet.** Check `git diff` and the file's modification time. While the user is still editing, work on other files and say so. Start once the file has not changed for about three minutes.
- **One scripted read-modify-write.** Every replacement asserts that it matches exactly once. Dry-run it on a copy first and diff the result. Never lose or quietly change a user edit.
- **Tidy without changing the meaning:**
  - use the sheet's own words: "chair", not "slot"; "gain" a unit; "+" on a bonus; full sentences;
  - keep every number as the user wrote it.
- **Name the placeholders.** Pick a period-flavoured name for a real institution, as with The Bakufu, The Regimental Schools and The Board of Ordnance. Check it for collisions in `data/` and `docs/`, and avoid crowded words (there are many Granaries). Say in the open section what the name refers to.
- **Turn loose lines into rows,** with a name, the status `add`, and the rarity and type the user gave.
- **Keep the sync test green:**
  - an `implemented` card whose text changed becomes `modify: revised`;
  - a cut card with a data row moves to the Cut table as `modify: cut` until the build retires it;
  - a cut `add` row simply goes.
- **Flag, don't override.** If the user's type or rule contradicts the sort rules or another card, keep their version and ask in one line. Two examples: a production card typed Civic, and a card another card makes redundant.
- **Record the pass** in the open section: what was cut, revised, named and retyped, and any reading you took. Then recompute the counts and run the sheet tests.
- **If the user is still editing when you must commit,** commit only your own hunks:
  - write HEAD's file plus your changes to a copy;
  - stage that copy (`git hash-object -w`, then `git update-index --cacheinfo`);
  - leave their edits in the working tree.

## Questions and rulings

- End a reply that needs decisions with **numbered questions,** each with your recommendation first. Ask only what changes the next step. A design decision is the user's to make; a question that the files, the code or a sensible default can answer is not asked.
- When the user answers ("#1 the smaller reading…"), record the answer verbatim, with the date, where the work lives: the plan doc, `docs/flags.md`, and the sheet's "Ruled in chat" list. Rulings land in files before any agent acts (CLAUDE.md).
- When an answer can be read two ways, apply the reading that answers the question asked, mark it "to confirm" in the docs, and say so in one line.
  - The example is the fifth government tier, 2026-10-16. The user said *"tier 5 was meant for an age 5 that hasn't been implemented"*.
  - That was read as pairing the four Doctrine tiers with the four government tiers left, and the user confirmed it.

## Doctrines

- **What a Doctrine is.** It is a permanent rule, strong and game-warping, held for the whole game, and it takes no chair. The user, 2026-10-15: *"We should have permanent, strong bonuses in the game… They should be somewhat game-warping like before."*
- **How many:** three to five per deck at each of Tiers I to IV, and none at Tier 0. Each is written for one of the deck's themes (the sheet's Build column), so each theme gains a Doctrine at most tiers.
- **When they are offered:** with a government, one Doctrine tier per government tier. Tier 4 offers Tier I, tier 10 Tier II, tier 18 Tier III and tier 26 Tier IV (ruled 2026-10-16; the user moved Tier IV from 29 to 26 on 2026-10-17).
  - The offer draws from both of the seat's decks.
  - It is all a new government brings: the reward hands are gone.
  - The tier-38 governments are left for a fifth age.
- **Drawbacks.** Most Doctrines carry one. The Marian Reforms makes units free of upkeep, but towns build them at half speed. Two Doctrines whose drawbacks cancel each other are intended, as the reward for committing to a build (the user, 2026-10-16: *"#3 is intentional"*).
- **Where to look:** the Dominion sheet's Doctrine tables are the model, and `docs/plans/doctrines-governments-chairs.md` holds the rulings.

## Card types and chairs

Every card has a type, which its face shows by its ink (the A3 face): **Military**, **Economic**, **Civic** or **Wildcard**. Each government seats a mix of the four kinds of chair; the table is in `docs/plans/doctrines-governments-chairs.md`, section 4.
- **Which chair a card fits:**
  - a Military, Economic or Civic card fits a chair of its own type, or a Wildcard chair;
  - a Wildcard card fits only a Wildcard chair;
  - a card of a deck not sorted yet ("unsorted") fits any chair, and counts as the type of the chair it sits in.
- **The sorting rules.** A card is typed by what it pays or does, not by what it reads. Songs of the Fallen reads kills but pays science and culture, so it is Civic.
  - **Military:** combat strength, movement and unit rules, ranks and experience, units gained (levies, free units, production toward units), and unit upkeep.
  - **Economic:** food, production, gold, land and growth.
  - **Civic:** science, culture, faith, happiness, authority, unrest and pacification, war weariness, renown and great people.
  - **Wildcard:** commissions, and cards that act on other cards (Double Time, Vae Victis, The New Code).
  - A mixed card takes the type of the half that pays more. When the halves are even and one is Civic, the card is Civic.
  - A shared card has the same type on both decks' sheets.
- **Design with the types in view.** Each tier of a deck should give every kind of government something to seat, so count each tier's types after a pass.
  - Before the user's pass of 2026-10-16, Dominion's Tier III held 21 Military cards of 29, which left a seat under an economic government leaning on its partner deck.
  - The user fixed it by cutting and rewriting cards toward Civic and Economic.

## From the sheet to the game: triage and build

- **Triage first.** Before any build batch, sort every `add` and `modify` row and every Doctrine into three groups, in a doc of its own. `docs/plans/dominion-build-triage.md` is the model.
  1. **Data only:** the text fits shapes that exist. Name the effect kind and its fields.
  2. **New shape, no UX decision:** the behaviour is automatic, or uses UI that already exists (the levy menu, the commission rail). Name exactly what is missing.
  3. **Deferred:** the card needs a decision about UX or player interaction, such as a new action, a choice made when it fires, or a new button, menu or screen. The user's rule, 2026-10-16: *"defer any that require a determination around UX or user interaction"*. Name the question it waits on. The user may rework the card instead.
- **Rule ambiguities.** List every text that can be read two ways as a rule, each with a recommended reading. The build uses those readings unless the user marks them, so put them where the user will see them.
- **Batches:**
  - the data-only cards go in one or a few batches;
  - the new-shape cards go in batches of ten to fifteen that share shapes;
  - they all edit the same files (`statecraftData.ts`, `statecraft/evaluator.ts`, `statecraft/describers.ts`, `data/decks/<deck>.json`, the sheet and its test), so each batch lands before the next starts;
  - a row becomes `implemented` only when its data text equals the sheet's Ability cell.
- **How agents land a batch** (fences, the gate, the save schema) is in CLAUDE.md and `docs/plans/chairs-build.md`. This skill covers what to build.

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
| Theme and role | The theme it pushes and its role there (supply, widen, multiply, act), or "engine glue"; and which gap in the map it fills |
| Role | Glue, pay-off or build-defining, with its floor (alone) and ceiling (built around) |
| Councils | The example councils it sits in, early or late, and what it does there (opener, engine, pay-off, scaler, capstone, utility) |
| Attention | What the player does differently with it seated, what it leaves on the map, what must be tracked; where it sits on the attention-against-impact table |
| Power | The arithmetic against the bar: what it pays at the start and end of its band in a typical seat, compared with the median and best seated card |
| Synergy | Raises: … Reads: … with the live cards in a seat's pool that feed it and that it feeds, and how many raisers exist at or before its band |
| Displaces | What kind of seated card it pushes out, and why a player would make that swap |
| Condition or drawback | If it is powerful, what holds it back |
| Shape | The existing effect kind and fields, or **New shape** and what is missing |
| Type | Military, Economic, Civic or Wildcard, by the rules in "Card types and chairs" |

Then a short note on the combinations the batch opens, each stated through a general quantity or moment.

## Before you hand it over

- The deck map was read (or built) and each card says which gap it fills.
- Each card names its theme and role, or says it is engine glue; the batch does not add to the glue share without saying so.
- Each theme has supply, widen, multiply and act cards, and its widen cards pay what the theme does not already make.
- The deck reaches at least four of the five areas, no more than about a third of its cards pay its own yield, and its cost shows in its cards.
- Where two decks claim the same thing, the split in `deck-design.md` ("Direction, 2026-10-20") is followed, or the conflict is named.
- No card adds a new player input (a button, menu, choice or target to pick). A feature that would open cards in several decks is proposed to the user, not assumed.
- Every card has a real floor, and the batch mixes roles, shapes and rarities without two cards doing the same job.
- Each card's theme and era fit its band and its historical model.
- No card is high attention and low impact; cards that create units or ask for tracking justify it.
- No card is a linchpin that one theme depends on.
- Each card has one effect and at most one condition, and its text fits on one line.
- No card names another card.
- Every pay-off has three or more set-ups available at or before its band in a two-deck pool.
- Every number is checked against the power bar for its band, with the arithmetic shown.
- Culture paid in bands 0 and 1 is priced as scarce.
- War cards say what they do to a war, in that age's unit strengths and costs.
- The user's own edits in the deck sheet were read and are not contradicted silently.
- Each card has a type, and each tier still gives every kind of government something to seat.
- Each new name was checked for collisions in `data/` and `docs/`.
- Plain English throughout (CLAUDE.md "Writing").

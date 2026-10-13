# Card synergy: what other games do, and what it means for the decks

Research for the user's question after the first deck playtest (2026-10-13): *"the midgame feels not very impactful, and the cards dont feel like they have enough synergy … how we can create interesting, flexible synergies between cards."* Games looked at: Balatro, Slay the Spire, Teamfight Tactics, Hearthstone Battlegrounds, Monster Train, Hades, Against the Storm, Vampire Survivors. This is a brainstorm, not a ruling; nothing here changes the game until the user rules on it.

**User response (2026-10-13):** layers 2 (tags) and 4 (a smaller pool per game) are declined. Tags are forced synergy: cards should combine through general keywords and stats, not through labels written to make them combine. The per-game pool is unneeded because a seat's two decks already work like Battlegrounds tribes. The user adopted LocalThunk's joker design guidelines as their own card philosophy; they are recorded in `docs/decks/deck-design.md` under "Card design principles". Layers 1 and 3 stay open, read through those principles.

## The short version

Synergy in these games comes from four structures, and our decks use only a weak form of the first:

1. **Shared numbers.** Every card touches the same few quantities, so cards combine without being designed for each other (Balatro).
2. **Set-up and pay-off around a growing resource.** Some cards build a quantity, others spend or scale on it (Slay the Spire).
3. **Tags that count toward thresholds, with cards carrying more than one tag.** One card advances two plans at once, which is what makes pivots possible (TFT, Battlegrounds, Monster Train).
4. **Pay-offs that only appear once you can use them, at moments that feel like events.** Duo boons need both gods; augments arrive at fixed stages; cornerstones arrive each year (Hades, TFT, Against the Storm).

Our decks are mostly **narrow conditions**: "towns with a Barracks", "farms beside a river", "garrisoned towns with a Monument". Each card checks its own condition and pays a small amount. Cards that share a condition line up, but none of them makes another stronger, and a condition that only two or three cards create is rarely assembled from a 146-card bag.

## Game by game

### Balatro: a few shared numbers, three layers of scaling
- **Every joker touches the same numbers**: chips, mult, ×mult, money, hand types, suits, card ranks. The developer's rule of thumb is to build effects on existing keywords and numbers rather than add new mechanics, so that jokers combine even when nobody designed them together. Most jokers have one effect with an optional condition; powerful effects are conditional.
- **Three layers**: flat additions (+chips, +mult), multipliers (×mult) that are worth more the bigger the flat base, and scaling jokers that grow as you do something (play a hand type, discard, buy). Flat jokers are strong early and fall off; ×mult carries the late game; order matters (multipliers go last).
- **Copy effects** (Blueprint, Brainstorm) copy the joker beside them, so the strongest single card becomes a plan.
- **For us:** we already have Balatro's structure in the yield pipeline. Flats are folded first, then the town percentage stage, then the empire percentage stage (Entry XVII). A deck with "+flat per X" cards and "+% in towns that have X" cards already multiplies itself. The decks just don't lean on it: their flats are small and local, and few cards scale with time. Scaling cards that grow while seated ("+1 culture for every camp cleared while this is seated") are the Balatro scaling joker, and they give the midgame something to feed.

### Slay the Spire: set-up and pay-off
- Each character has about three archetypes, each built around a resource that grows during a fight: Strength, Poison, Exhaust, Block, Discard, Orbs.
- **Set-up cards** build the resource and are useful on their own; **pay-off cards** reward having it. Without pay-offs, players have no reason to commit to a direction. A good mix is many medium pay-offs that are easy to reach, plus a few huge ones that are hard to reach.
- **Bridge cards** serve two archetypes at once. Archetypes that directly conflict (a common criticism of the Ironclad) produce dead cards.
- **Relics** change rules for the whole run and often decide the build.
- **Card removal** keeps a deck focused; a bloated deck dilutes its synergies.
- **For us:** each deck's "arcs" (the garrison state, military buildings, raid and conquer) are themes without a growing resource. "Garrisoned towns" is a condition, not a quantity that set-up cards add to and pay-off cards scale with. The fix is to name a few **counters** per deck that most of its cards either raise or read.

### Teamfight Tactics: traits, thresholds, and flexible units
- Every champion carries two or three traits. A trait pays at thresholds (2 / 4 / 6), so the fourth unit of a trait is a step change, not a fifth of a bonus.
- Because each unit counts toward several traits, one purchase advances two plans. This is what makes **pivoting** possible: a board built for one composition is half of another.
- **Augments** are picked from three at fixed stages of the game. They are the moments that decide a build, and Riot's notes say the best ones transformed how a unit plays or rewarded specific items.
- Riot's warnings: anything that gives cheap access to a high threshold breaks balance, and mechanics that lock a player into one composition reduce variety. Its stated goal is never to reduce the number of possible team-building outcomes. Flexible units that fit many boards were a success, as long as they weren't automatic picks for every board.
- **For us:** tags on cards, counted toward thresholds, give the flexible synergy the user is asking about. The old pool's military, economic and wildcard counting cards were a three-tag version of this, and they were retired when chairs became universal.

### Hearthstone Battlegrounds: tribes, doublers, and a smaller pool per game
- **Tribes** (Murloc, Mech, Demon …) are the main synergy, and some minions belong to two tribes, or to all of them.
- **Each lobby uses only some of the tribes.** This makes a tribe findable: the pool is smaller, so the cards you want turn up.
- **Doublers** are the most memorable pay-offs: Brann Bronzebeard makes Battlecries trigger twice, Baron Rivendare makes Deathrattles trigger twice. They multiply a whole category, not one card.
- **Quests, Trinkets and Anomalies** add a goal or a game-wide rule on top of the board, at set points or for the whole lobby.
- **For us:** two ideas carry over directly. First, **doublers**: "kills grant their rewards twice", "garrisons count twice for your cards", "your cards' one-off grants pay half again". The evaluator already has `effectAmplifier` and `cardYieldAmplifier` for this. Second, **a smaller pool per game**: if each game dealt only some of each deck's arcs, the cards of an arc would show up often enough to assemble, and two games with the same decks would play differently.

### Monster Train: a primary clan plus an allied clan
- Each run picks two clans out of several, which is exactly our two decks per seat.
- Cross-clan synergy mostly comes from **generic keywords** that every clan can use or create (Rage, Armor, Damage Shield, Multistrike, Valor), not from cards designed for one specific pair.
- **For us:** bespoke pair cards don't scale: 15 pairs with a handful of cards each, and each card is rarely drawn. Shared keywords (tags) give every pair some synergy for free, and bespoke pair cards become a seasoning on top.

### Hades: duo boons need both gods
- A duo boon is offered only once you hold at least one boon from each of its two gods. Legendary boons need specific earlier boons.
- The pay-off appears when the set-up already exists, so the reward is never a dead card, and seeing one feels like progress.
- **For us:** our shared cards are dealt to any seat that holds either deck, and about 18% of a Dominion + Expansionist bag is cards half-written for a deck that seat doesn't have. Gating a pay-off on its set-up ("dealt once you have seated two cards that make garrisons") would put pay-offs in hands at the moment they work. `needsTendedWork` is already this rule for one case; it can be general.

### Against the Storm: cornerstones in a city builder
- The closest genre match: a city builder where, each in-game year, you choose one **cornerstone** from a small offer. Cornerstones define the settlement's plan, and the yearly pick is an event.
- Many cornerstones reward the same kind of event (citizens leaving, goods produced, a building type), so they combine with each other and with blueprints.
- **For us:** a band opening (or a new government) could bring a **keystone hand**: three larger, build-defining cards, one taken. This restores the "new chapter" moment that the old government pools gave, without rotating anything away.

### Vampire Survivors and Risk of Rain: recipes
- A weapon plus a specific passive item evolves into a stronger weapon. The recipe is a goal the player drafts toward.
- **For us:** an evolution sits close to the levelling that was ruled out (2026-09-04, "every card is what it prints"). A softer form fits: a card that pays more while a named partner card is also seated. Treat it as optional.

## How this translates: a model for synergy in the decks

Four layers, from cheapest to most ambitious. They are independent; any subset helps.

### 1. Counters: every card raises or reads one
- Each deck names three or four **counters**, quantities that already exist in the game: units in the field, garrisons, captured towns and generals for Dominion; tended tiles, improved tiles, towns and citizens for Expansionist.
- Every card in the deck either **raises** a counter (set-up) or **pays by** one (pay-off). A pay-off card should read a counter that at least three other cards in the deck raise.
- Pay-offs scale with the counter empire-wide rather than in one town, so the midgame card that reads garrisons grows as the army grows.
- **Scaling cards** that grow while seated (The Pacified Marches' pattern) give the player something to do with the card after seating it.

### 2. Tags: cards count toward more than one plan
- Every card carries one or two **tags** from a small shared list (about 10 to 12 across all six decks). Each deck owns two or three tags and shares at least one with each neighbouring deck.
- **Tag pay-offs**: "+2 culture for each seated Frontier card", or a threshold card ("with three Frontier cards seated, …; with five, …").
- Cards with two tags let a seat change direction without throwing away its chairs, which is the flexibility the user asked for.
- Pair synergy comes from shared tags rather than one-off pair cards. Dominion and Expansionist might share **Frontier** (cleared camps, claimed land, towns near borders) and **Muster** (levies, units trained, garrisons).
- This also answers the open question about Magisterial. Counting tags is thematic and belongs to every deck; **Magisterial** can keep the cards that count *any* card or read the draft itself (rerolls, passes, held-but-unseated cards, the chair a card sits in).
- Watch TFT's warning: anything that gives cheap access to a high threshold breaks the curve. Keep thresholds modest and few.

### 3. Pay-offs dealt when they work, at moments that feel like events
- **Gate pay-offs on their set-up** (Hades): a pay-off card is dealt only once the seat has seated enough cards that raise its counter or carry its tag. A generalisation of `needsTendedWork`.
- **Keystone hands** (augments, cornerstones): when a band opens, the first hand comes only from that band's rare build-defining cards. After that, the current band counts double in the draw.
- **Doublers** (Brann, Baron) as the rarest pay-offs: they double a whole category of card effect.

### 4. A smaller, different pool each game (optional)
- Battlegrounds-style: each game, each deck deals two or three of its arcs, not all of them. A Dominion + Expansionist seat might get the garrison state and the managed wild in one game, and raiding and the wide empire in the next.
- The bag shrinks from about 146 cards to perhaps 90, so set-ups and pay-offs meet more often. Two games with the same leader play differently, which was one of the original deck goals: "each deck leaves room for varied combos game to game", "hard to force an approach".
- This is set at game start and does not rotate during play, so it is compatible with "nothing rotates away".

## Mapping to the playtest feedback

| Feedback | Layers that address it |
|---|---|
| The midgame isn't impactful | Keystone hands at band openings; scaling cards; empire-wide pay-offs instead of per-hex flats; doublers |
| Cards lack synergy | Counters (every card raises or reads one); tags; gated pay-offs |
| Synergy should be flexible | Cards with two tags; tags shared between decks; a smaller pool per game |
| Dominion needs peacetime value | Counters that peace raises too (units, garrisons, generals), and pay-offs that read them at peace |

## Lessons the other games learned the hard way

- **Set-ups without pay-offs mean nobody commits** (Slay the Spire). Our arcs need their pay-offs in the midgame bands, not only in Tier IV.
- **Flat bonuses fall off; growth carries the late game** (Balatro). Our midgame is mostly flats.
- **Cheap access to deep thresholds breaks balance** (TFT +1 trait augments).
- **Mechanics that lock you into one plan reduce variety** (TFT Hero Augments, which needed four rerolls to stay fun). Our reroll and pass rules matter here.
- **A big pool makes synergy rare** (Battlegrounds limits tribes per lobby). Ours is about 146 cards for a two-deck seat.
- **Conflicting archetypes inside one class produce dead cards** (the Ironclad critique). Dominion's war-only cards are dead at peace.

## Sources
- LocalThunk's joker design guidelines, r/balatro, May 2024 (reached through a search summary; the post itself did not load).
- Félix Moll, "Archetypes in deckbuilding games", Game Developer: https://www.gamedeveloper.com/design/archetypes-in-deckbuilding-games
- "Road to the IGF: Mega Crit Games' Slay the Spire", Game Developer: https://www.gamedeveloper.com/disciplines/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-
- Riot, "Teamfight Tactics: Monsters Attack! learnings": https://teamfighttactics.leagueoflegends.com/en-au/news/dev/dev-teamfight-tactics-monsters-attack-learnings/
- Riot, "Gizmos & Gadgets learnings": https://teamfighttactics.leagueoflegends.com/en-us/news/dev/dev-teamfight-tactics-gizmos-gadgets-learnings/
- "The making of Hearthstone Battlegrounds", Intel Gaming Access: https://game.info.intel.com/gaming-access/the-making-of-hearthstone-battlegrounds-we-wanted-a-mode-that-didnt-feel-as-polarizing
- Battlegrounds Anomalies, Blizzard Watch: https://blizzardwatch.com/2023/09/12/anomalies-hearthstone-battlegrounds-season-5/
- Hades 2 duo boons, Rogueranker: https://rogueranker.com/hades-2-duo-boons/
- "How Against the Storm managed to mix city-building and roguelite play", Game Developer: https://www.gamedeveloper.com/road-to-igf-2023/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play
- Monster Train and Vampire Survivors: from general knowledge of the games, not a cited source.

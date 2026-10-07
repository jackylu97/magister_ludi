# Deck review: player experience

Lens: whether each deck is rewarding to play. Method: the player-psychologist agent's (motivation as goal, action and reward; flow and friction; which kinds of player a deck serves; where frustration is healthy and where it is the game's fault). Read-only review of `deck-design.md`, the six deck sheets and `common.md`, with the draw rules read from `src/sim/statecraft/draft.ts` and `data/statecraft.json`.

## 1. Summary

- **Dominion and Magisterial show who they are in the first hand; Scientific and Devotion take 40 to 90 turns.** Scientific's charter loop (draft, research, then draw the cards it opens) often completes only around turn 80 to 100, and Devotion's spending verbs all sit at Tier I.
- **The worst feel-bad moments come from rules, not cards:** government adoption wipes "while seated" progress (commissions, The Critics' Circle's tally), several commissions can be made impossible, and tended-land and charter payoffs can be dealt to a seat that cannot use them.
- **Pairs are rarely felt through shared cards.** The cross position comes once every four hands and draws from every shared card touching either deck, so a seat sees its own pair's shared cards about once a game. Magisterial's pairs have no shared card before Tier II at all.
- **Dominion and Devotion carry three twin cards each other's sheet already has** (Oriflamme / Relic Bearers, Military Orders / Holy Army, Convert It or Tax It / The Jizya), which the reconciliation missed.
- **Decision density is high in Dominion, Commerce, Magisterial and (from Tier I) Devotion; lowest in Scientific**, whose maturity cards pay players for waiting.

### What this review assumes about the draft

These facts come from the code and data, and the analysis below rests on them.
- The first three hands arrive at about turns 8, 15 and 25, and a seat makes about 26 drafts by turn 160 (`docs/flags.md` (aaaaaa)). "The first ten turns" is therefore one hand.
- Tier I opens after four drafts **and** an age-two technology, so Tier 0 is the whole opening, roughly turns 8 to 40 or later. Earlier tiers stay in the bag.
- A hand deals one exclusive card from each deck, plus a third card by a fixed cadence: the common pool on drafts 1, 3, 5 and so on; a shared card on drafts 2, 6, 10 and so on; one more deck card on drafts 4, 8 and so on. Half of all third cards come from the common pool.
- The cross position draws from **every** shared card that names either of the seat's decks, not only the pair's own.
- Rarity is rolled first at 60 / 30 / 10 (not 4 / 2 / 1), renormalised over the rarities the bag holds, then a card is picked evenly inside that rarity. A rarity with one card gives that card the whole share: Dominion's lone Tier 0 uncommon, Drill Manuals, is its most-dealt opening card at 30%.
- Adopting a government returns every seated card to the collection, and a seated card's counters (for example `SlottedOrder.rerollsSeen`) live on the chair, so they are lost.

## 2. Per deck

### Dominion

**First ten turns and Tier 0.** The best opening of the six. About 60% of the time the first Dominion card is live on turn 8 and visible on the map: Martial Law asks whether the warrior stays home, Blooded Spears and Commission: Clear the Frontier point at the barbarian camps that start spawning on turn 6. Clear the Frontier is the model early commission: a clear goal reached with the deck's own action in about fifteen turns, a large reward (60 production and a free unit), and the chair comes back. The one weak spot is rarity: Drill Manuals, the only Tier 0 uncommon, is dealt 30% of the time and needs a Barracks the player does not have yet, while the three exciting rares (Blood Brothers, The King's Levy, The Standing Army) are about 3% each.

**Decisions.** Dense and on the map every turn: garrison or field (Martial Law, Standing Garrisons), war or peace (Reserve Officers, The Soldier-Farmers), whether to trade units (Songs of the Fallen pays for losses too), when to make peace (War Reparations).

**Payoff moments.** Frequent and loud: camp clears early, kills, captures (Triumphs, Carried-Off Scholars), The King's Levy every fifteen turns, commissions at every tier.

**Who it serves.** Players who like conflict and tactics, and achievers through the commissions. The garrison-state arc gives a peaceful player a real way in.

**Readability.** Short, mostly one idea per card. Naval Supremacy carries three unrelated clauses (sight, range, coastal gold).

**Invisible or feel-bad.**
- Commission: A Victor's Peace fails if the player succeeds too well: destroying the empire means there is no peace to sign, and a bot may refuse peace.
- Commission: Take the City grants a free Barracks to a captured city that may already have one.
- Three cards duplicate Devotion cards (see Across decks).

### Expansionist

**First ten turns and Tier 0.** Good once a worker exists. Granary Levies (production on every growth) and Sweet Water are live at once; The Forest Gardens and The Fish Traps give the first worker a new verb around turns 12 to 20. Two problems. The Naturalists pays nothing on a start without mountains in the borders, and it is dealt 15% of the time. And tending, the deck's signature mechanic, depends on drawing one of four unlock cards: the two Tier 0 unlocks are about 12% each, so roughly a third of Expansionist seats reach Tier I without having been offered one. The spec accepts that the draft picks "the field or the managed wild", which is fine, but the payoff cards then become dead draws.

**Decisions.** Rich in design: where to tend and where to improve, when a town burns, whether to spend a citizen on a levy, where to plant an outpost. Most of these are new or deferred; today only 10 of 47 exclusive cards can be dealt, and those are mostly flat field bonuses.

**Payoff moments.** Growth (Granary Levies), founding (The Seed Grain), burning seasons every thirty turns, commissions. The deck's best idea, land that grows richer over time (Dark Earth, The Long Tending), pays out silently: a tile's yield ticks up on turn 20 or 50 with no announcement.

**Who it serves.** Builders and map readers, and planners who enjoy watching an investment mature. The terrain dependence is good variety: a mountain start and a lowland start play differently.

**Readability.** The Burning Season carries four numbers; The Heartland's goal ("each yield at least 5 food, production and gold together") needs reading twice. Outposts is long but clear.

**Invisible or feel-bad.**
- Six Gardens (Tier I commission) is impossible without a tended-work unlock card.
- The Tended Country, The Landscape Garden, The Long Tending and The Garden of the World do nothing without one.
- The Wide Country (Tier III) rewards three free settlers when the map may have no room left.
- The Patient Harvest's kept food is invisible unless the city panel shows it.

### Commerce

**First ten turns and Tier 0.** Strong. Travellers' Letters, The Map Sellers, The Pathfinders' Company and Land Speculation are live on turn 8, and buying tiles at half price is the deck's spending verb from the first hand. Exploration and meeting other empires lead naturally into the trade routes that open at Tier I, so the deck's identity arrives in two clean steps. Travellers' Letters (+2 science and +2 culture in the capital on turn 8) roughly doubles early culture, so Commerce drafts faster in the opening than Magisterial, the deck whose identity is seeing more cards.

**Decisions.** Dense: route destinations, buy or build (Private Patronage, Bought Swords), hoard or spend (The Money Lenders and The Strongroom against every purchase card).

**Payoff moments.** Frequent: each purchase (Civic Receipts), each new route, meeting an empire, The Monopoly. It has no commission before Tier II, so the opening has no goal card.

**Who it serves.** Optimisers and achievers; socialisers through foreign routes and the cards that also pay the host; explorers in the opening.

**Readability.** Good on the card face. Two cards say "established commercial post" where the rest of the sheet says "trading post" (The Factors' Houses, The Foreign Factor). The Factors' Houses also has a known interface gap: the trade screen quotes the full caravan price and charges the lower one, so the discount is invisible.

**Invisible or feel-bad.**
- Corner the Market (four copies of one luxury) depends on the map; on some starts it cannot be reached without trading.
- The Silk Road Monks repeats Devotion's The Alms Roads (see Across decks).

### Devotion

**First ten turns and Tier 0.** The weakest opening. Only First Rites does something on turn 8. The Priest-Astronomers and The Founding Vows need rites (Divination, then 40 faith per rite for ten turns), which most seats do not run for twenty or more turns; The Founding Vows needs three cities keeping rites at once, which is out of reach for most of Tier 0 and blocks one of three chairs while it waits. The Rites Commonwealth is a pure penalty (−1 happiness in every city) until the seat keeps a rite. Pastoral Shrines and Lay Offerings wait on pastures, camps and plantations. About 70% of first Devotion cards are "not yet".

**Decisions.** Very dense from Tier I: The Healing, The Consolation and The Loaves are miracles the player chooses when and where to cast; The Fast is the first rite with a cost; Consecrated Ground, The Monastic Builders and Consecrated Labor make every purchase a choice of bank. All of it lands at once at Tier I, so the deck goes from almost nothing to a lot.

**Payoff moments.** Player-triggered miracles (the best kind for a sense of control), conversions (The Living Hymnal), belief choices.

**Who it serves.** Players who like spending decisions and spreading influence; players who like a ritual rhythm. Holy war gives conflict players a strand.

**Readability.** The Alms Roads ("press your religion at their destination 10 harder") uses a number with no scale the player knows. The Mission ("be the first empire to convert two foreign cities") reads as a race against other religions, which it probably is not meant to be.

**Invisible.** The Octave, The Settled Faith's pressure cut, The Holy Inquisition and The Doctors of the Church are amplifiers or prevention: the player rarely sees them do anything.

### Scientific

**First ten turns and Tier 0.** Flat. Tier 0 is library bonuses (The Almanac, The Scribes' Hall), windfalls (Field Notebooks, The Prospectors' Notes) and The Prize Essay, the one card about being first. Nothing in the opening is the deck's verb, and Field Notebooks decays: by the fourth hand most ruins have been claimed.

**Identity arrives late, and by chance.** Charters open at Tier I. At that point the Scientific bag holds about fifteen dealable cards and the three Tier I charters are uncommon, so each Scientific position shows a charter about 13% of the time; about half of Scientific seats see no charter in their first five Tier I hands. A drafted charter's technology then costs more research than usual, and the cards it opens join a large bag: Glassmakers' opens The Temple Observatory (one uncommon among many) and The Spectacle Makers (a rare). A player can pay a pick and fifteen turns of research and then not see the reward for many more hands. This is the deck's biggest experience problem: a long gap between a decision and its reward, and the reward is not guaranteed.

**Decisions.** Few but heavy, and in menus rather than on the map: take a charter or a seated card, research the charter or the ordinary tree. The maturity cards (The Long Study, The Old Academy, Enduring Institutions, The Long Inheritance) ask nothing of the player once seated.

**Payoff moments.** Firsts (The Prize Essay), ruins and seams early, a charter technology completing. The unlock moment, new cards entering the shelf, is the best moment the deck has, and the game should make it loud. Maturity thresholds pass silently.

**Who it serves.** Long-horizon planners and racers. Charters are the deck's game-to-game variety: Metallurgists' makes a military game, Printers' a trading one, Schoolmen's a religious one.

**Readability.** Charter text runs to four sentences; the "Needs Optics" prefix on gated cards is clear and good. The Spectacle Makers is abstract ("count as 10 turns older").

**Feel-bad.**
- The Great Instrument (Tier IV): "be the first empire to complete Alchemy". If any rival gets there first, or the seat already knows Alchemy when Tier IV opens, the card is dead in a chair.
- The Old Academy at Tier I needs an Academy, which few seats have between turns 40 and 60.

### Magisterial

**First ten turns and Tier 0.** Its identity shows in the first hand, in the draft itself: half of its Tier 0 cards are draft actions or boons (The Second Reading, The Critics' Circle, The Patient Eye, Gifts at Court), all common, so each is dealt one hand in eight. Gifts at Court (40 production on draft, about a free Monument) is one of the best first-hand moments in the game. Two problems:
- **Combinations cost chairs the opening does not have.** Second Reading plus Critics' Circle fills two of three chairs to earn +1 science and +1 culture per hand, while one Commerce card earns more. The spec accepts a slow start, but the deck built for the draft is the one whose draft play pays least at first.
- **Rerolls cost 35 faith or more.** Without The Second Reading or faith from The Temple of the Muses, The Critics' Circle does nothing in the opening.

On the map, Tier 0 is Monuments (The Repertory, Master Masons, Civic Granaries, The Temple of the Muses).

**Decisions.** Several at every hand: reroll, pass, take a boon or a seated card, seat or hold. Little to do on the map between hands until works and wonders arrive at Tier I to III.

**Payoff moments.** Every draft once Tier I opens (The Accessions Register, boons, reward hands); wonders (The Unveiling, The Golden Age).

**Who it serves.** System explorers and card-game players who enjoy finding combinations. The reroll, pass and seat families leave a lot of room for different games.

**Readability.** Good when the card face shows its running count; The Critics' Circle and The Encyclopedia need that. Commission: The Paradise Garden ("a great-person work beside fresh water with other works or tended tiles on three of its other sides") needs a placement preview to be readable at all.

**Feel-bad and degenerate loops.**
- **The Swearing-In** (15 culture per seat or unseat, once a turn) rewards shuffling a card every turn. With The Rotating Chairs halving seals, the best play is a chore.
- **The Antechamber** ("gain one extra wildcard chair") takes a chair to give a chair, so it adds nothing while it must be seated.
- **Commission: The Wonder of the Age** grants a chair "for the rest of this government", which the next adoption takes away. Wonders can also be lost to rivals while it waits.
- **The Critics' Circle's tally resets at every government adoption**, because the count lives on the chair.
- **Pass and draft stop being different:** with The Archive, The Patient Eye and The Unwritten Chapter together, passing keeps a card, refunds culture, pays science and raises the rare odds. The best play becomes "always pass", which ends the decision the deck is built on.

## 3. Across decks

### How quickly each deck shows who it is

| Deck | When the identity first shows | What carries it | Main delay |
|---|---|---|---|
| Dominion | Hand 1, about turn 8, on the map | Garrisons, camps, Clear the Frontier | None worth fixing |
| Magisterial | Hand 1, in the draft | Draft actions and boons | On the map, not until works and wonders (Tier I to III) |
| Commerce | Hand 1 for buying and exploring; Tier I for routes | Land Speculation, exploration, then routes | No goal card before Tier II |
| Expansionist | First worker (turns 12 to 20), if a tended-work card was dealt | Tending, growth | Depends on drawing an unlock card; maturity pays silently |
| Devotion | Tier I, about turn 40 or later | Miracles and faith purchases | Tier 0 is mostly "not yet" |
| Scientific | First researched charter, often turns 60 to 100 | Charters and the cards they open | Charters rare at Tier I; gated cards not guaranteed |

### Early verbs against flat bonuses

Counting Tier 0 and Tier I together, cards that add an action, a goal or a real choice:

| Deck | Verbs or goals | Mostly flat |
|---|---|---|
| Magisterial | about 13 | about 7 |
| Expansionist | about 11 | about 12 |
| Dominion | about 10 | about 11 |
| Commerce | about 10 | about 10 |
| Devotion | about 13, but only 3 at Tier 0 | about 6 |
| Scientific | about 7 | about 10 |

### Twins across sheets (Dominion and Devotion)

The reconciliation merged several twins but missed three, all from the Dominion · Devotion history lines, plus one Commerce · Devotion overlap:
- **The Oriflamme** (Dominion, Tier I: military units beside a religious unit +4 strength) and **The Relic Bearers** (Devotion, Tier III: military units beside an apostle +4 strength).
- **The Military Orders** (Dominion, Tier III: a citadel beside a holy site +3 faith +3 production) and **The Holy Army** (Devotion, Tier III: holy sites and citadels beside each other +2 faith +2 culture).
- **Convert It or Tax It** (Dominion, Tier II) and **The Jizya** (Devotion, Tier III): both make captured cities of another faith pay gold and faith.
- **The Silk Road Monks** (Commerce, Tier II) and **The Alms Roads** (Devotion, Tier I) both carry religious pressure on routes (merchant missionaries).

For experience this matters twice. A Dominion · Devotion seat can hold both twins, which reads as the game repeating itself. And in every other pairing these exclusive cards are dead draws: a Dominion · Commerce seat dealt The Oriflamme has no religious units to stand beside. Each should become one shared card, so it is dealt only where it works.

### Pairs are rarely felt

Goal 2 asks each pair to open options. Through the deal:
- The cross position comes once in four hands, about seven times by turn 160.
- Its bag is every shared card touching either deck (roughly 23 to 30 cards), of which the pair's own are 1 to 5. A seat therefore sees its own pair's shared cards about once a game.
- The common pool takes half of all third positions. It has about 13 dealable cards, most of them flat ("+1 sight", "+1 faith per card slotted"), so a seat sees nearly the whole pool every game. `common.md` also appears to have lost its table formatting.
- Magisterial's pairs with Dominion and Commerce have no shared card before Tier II. Pending one-sided cuts (Garden Cities, Illuminated Treatises, Hydraulic Schools) would leave Expansionist · Magisterial and Scientific · Magisterial with nothing before Tier III and Expansionist · Scientific with nothing at all.

### Progress that the game takes away

- **Government adoption** returns every seated card to the collection, and progress kept on the chair goes with it: every "while this is seated" commission and The Critics' Circle's reroll count. An adoption is meant to feel like progress, and here it costs the player something they never chose to give up.
- **Commissions that can become impossible:** The Great Instrument (a race), A Victor's Peace (eliminating the enemy), The Wonder of the Age (wonders sniped), Six Gardens (no unlock card), The Founding Vows (out of reach at its tier), Corner the Market (map-limited), The Mission (worded as a race).

### Payoffs that pass unnoticed

Nine cards across four decks pay when a tile or building reaches an age: Dark Earth, The Long Tending, The Old Holy Places, The Long Study, The Old Academy, Enduring Institutions, The Long Inheritance, Established Routes, The Collegium. Their reward is a number that quietly changes. Making the threshold an announced moment would turn "institutions that mature", one of Scientific's main themes, from invisible into anticipated.

### Tier IV looks the same in every deck

Five of six decks end in "+N% production toward the Magnum Opus per count of your mechanic". Each reads its own mechanic, which is right, but the moment is the same in every deck: a percentage on a build bar. Devotion's The Last Offering (pay faith into the Opus) is the only verb. This is a note for the later wager pass, not a change here.

## 4. Recommended changes

| # | Deck | Card | Change | Kind | Why | Confidence |
|---|---|---|---|---|---|---|
| 1 | All | Commissions and seated counters | Progress on a card (a commission's count, The Critics' Circle's tally) belongs to the card, not the chair. It survives unseating and government adoption; only events while seated still count. | rule | Adoption, a moment of progress, currently wipes commissions and counters. | high |
| 2 | All | Commissions | Design test for every commission: the goal must stay reachable by the seat's own actions for the rest of the game. A race may pay more for winning, but losing it shrinks the reward instead of killing the card. | rule | Several commissions can sit dead in a chair (see rows 16 and 19 to 23). | high |
| 3 | All | Cross position | The cross position deals from the seat's own pair's shared cards when any are eligible, and falls back to any shared card naming either deck. | rule | A seat sees its own pair's shared cards about once a game, which undercuts goal 2. | medium |
| 4 | All | Third-position cadence | Change the cadence from common, cross, common, single to cross, common, cross, single. | rule | Half of third cards come from a small, flat common pool. Argues against the decks rework's hand rules, so labelled as such. | low |
| 5 | All | Shared cards before Tier II | Every pair keeps at least one shared card at Tier I or earlier. Do not make the pending one-sided cuts of Garden Cities, Illuminated Treatises or Hydraulic Schools unless a Tier 0 or I card replaces each. Dominion · Magisterial and Commerce · Magisterial need one now. | rule | Magisterial's pairs are invisible until Tier II or III. | medium |
| 6 | All | Maturity cards and counters | When a tile or building crosses a card's age threshold, the game announces it. Every card that counts something shows its current count on its face. | rule | Nine maturity cards and the counting cards pay silently. | medium |
| 7 | Scientific | Charter technologies | When a charter technology is researched, the next Scientific position is dealt from the cards that technology opens. | rule | The player pays a pick and extra research, then may not see the reward for many hands. | high |
| 8 | Scientific | Tier I charters | The first Tier I hand's Scientific position deals from the charters. | rule | About half of Scientific seats see no charter in their first five Tier I hands. | medium |
| 9 | Scientific | The Surveyors' Charter | Move to Tier 0, with Surveying placed in the first age. | retier | Gives the opening hands the deck's own verb; it is the mildest charter. | low |
| 10 | Expansionist | The Tended Country, The Landscape Garden, The Long Tending, The Garden of the World | Mark each "Needs tended land": dealt only to a seat holding a tended-work card, using the same draft gate as Scientific's "Needs (technology)". | rule | They are dead draws for a seat that leans to the field. | high |
| 11 | Expansionist | Six Gardens | Rename The First Gardens; move to Tier 0. "Commission. While this is seated, workers may tend forest or jungle into forest gardens. Goal: have three tended tiles. Reward: your capital gains 40 food and a free worker. Then it leaves its chair." | revise | Cannot become impossible, gives tending a second way in, and gives the opening a goal. | medium |
| 12 | Expansionist | The Naturalists | "Each city gains +1 science for every two hills or mountains in its borders, at most +3." | revise | Pays nothing on most lowland starts while being dealt 15% of the time. | medium |
| 13 | Expansionist | The Wide Country | Reward: "your three smallest towns each gain two citizens, and every town gains +2 happiness for 30 turns." | revise | Free settlers at Tier III often have nowhere to go. | medium |
| 14 | Expansionist | The Heartland | Goal: "one of your towns works twelve improved or tended tiles that each yield 5 or more in total." | revise | Same goal, readable in one pass. | low |
| 15 | Devotion | Consecrated Labor | Move to Tier 0, common: "Cities with a Shrine may buy workers with faith." | revise | Gives Devotion a faith-spending verb in the first twenty turns; today every spending card waits for Tier I. | medium |
| 16 | Devotion | The Founding Vows | "Commission. Start a rite in two different cities while this is seated. Reward: 100 faith, and each of those cities gains one citizen." Stays Tier 0. | revise | Three simultaneous rites is out of reach for most of Tier 0, and the card blocks one of three chairs. | high |
| 17 | Devotion | The Priest-Astronomers | Move to Tier I. | retier | Pays nothing until the seat keeps rites. | medium |
| 18 | Devotion | The Rites Commonwealth | Move to Tier I. | retier | At Tier 0 it is a pure −1 happiness penalty until rites exist. | medium |
| 19 | Devotion | The Mission | "Commission. Convert two foreign cities to your religion while this is seated." | revise | "Be the first empire to convert" reads as a race. | medium |
| 20 | Scientific | The Great Instrument | "Commission. Complete Alchemy while this is seated. Reward: production toward the Magnum Opus equal to a tenth of its cost, or a quarter if no other empire knew Alchemy." Not dealt to a seat that knows Alchemy. | revise | Dead if a rival wins the race or the seat already knows Alchemy. | high |
| 21 | Dominion | Commission: A Victor's Peace | "Make peace with an empire, or destroy it, after taking at least two of its cities in that war." | revise | Succeeding too well, or a bot refusing peace, fails the card. | high |
| 22 | Magisterial | Commission: The Wonder of the Age | The reward chair lasts for the rest of the game. | revise | The next adoption takes away a chair the player earned. | medium |
| 23 | Commerce | Corner the Market | Goal: "control four copies of one luxury, counting copies you receive in deals." | revise | Map-limited; trading gives a way through. | low |
| 24 | Dominion | Commission: Take the City | Reward: "a free Barracks in that city, or 60 production there if it already has one." | revise | Avoids a reward that does nothing. | low |
| 25 | Devotion | The Relic Bearers | Cut. The Oriflamme becomes one shared Dominion · Devotion card at Tier I. | cut | Twin of The Oriflamme; dead outside that pair. | high |
| 26 | Dominion | The Military Orders | Cut. The Holy Army becomes one shared Dominion · Devotion card with The Military Orders' wording (+3 faith, +3 production on a citadel beside a holy site). | cut | Twin of The Holy Army. | high |
| 27 | Devotion | The Jizya | Cut. Convert It or Tax It becomes one shared Dominion · Devotion card. | cut | Twin of Convert It or Tax It. | high |
| 28 | Devotion | The Alms Roads | "Your trade routes from Temple cities gain +3 faith." The pressure clause goes; The Silk Road Monks (Commerce) carries religion on routes. | revise | Removes the overlap and the unreadable "10 harder". | medium |
| 29 | Magisterial | The Swearing-In | "Each time you seat a card, gain 15 culture. A card pays this once per government." | revise | Removes the every-turn shuffling chore, and makes adoption (when every card is reseated) a moment that pays. | high |
| 30 | Magisterial | The Antechamber | "While you hold this card, seated or not, you have one extra wildcard chair." | revise | Seated, it takes a chair to give a chair and adds nothing. | high |
| 31 | Magisterial | The Second Reading | Works while held, seated or not. | revise | The deck's opening combination costs two of three chairs; enablers working from the collection fits "cards outside the government count". | low |
| 32 | Magisterial | The Archive | Add: "The kept card cannot be seated until you adopt a new government." | revise | With The Patient Eye and The Unwritten Chapter, passing becomes strictly better than drafting and the choice disappears. | low |
| 33 | Magisterial | The Repertory | Add: "Your capital gains +2 culture." | revise | Magisterial should draft fastest early; today Commerce's Travellers' Letters out-drafts it. | low |
| 34 | Dominion | Drill Manuals | Common. | rerarity | As the lone Tier 0 uncommon it is dealt 30% of the time, and it needs a Barracks the player does not have yet. | medium |
| 35 | Commerce | The Factors' Houses, The Foreign Factor | "established commercial post" becomes "trading post". | revise | One word for one thing. | high |
| 36 | Commerce | New: Commission: Open the Road | Tier I, uncommon. "Commission. Have three trade routes running at once while this is seated. Reward: 150 gold and a free caravan. Then it leaves its chair." | new | Commerce has no goal card before Tier II; domestic routes keep it always reachable. | low |
| 37 | Devotion | The Old Gods Remain | Add: "If your pantheon is already chosen, a belief offer opens at once." | revise | Drafted after the pantheon, the extra slot otherwise does nothing visible. | low |

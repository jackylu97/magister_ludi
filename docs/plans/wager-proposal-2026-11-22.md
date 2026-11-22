# The wager: a goal, a lead and a stake (proposal, 2026-11-22)

One proposal for the user to rule on. Nothing here is built, and no data changed. It follows the user's comments at the foot of `docs/plans/wagers-and-first-age-options-2026-11-22.md`.

## 1 · The format: A goal, a lead and a stake

The user's rule: "each wager has a fixed goal. If you cross the goal, you gain a bead. If you lead the world at age end, you gain an additional bead. you must wager on one of the stakes."

| Rule | What the player reads |
|---|---|
| The deal | When Æra II, III and IV open, the world is dealt three wagers. Every seat gets the same three. They come from three different groups. |
| The card | Each wager is one number. The card shows your number now, the goal as a mark on a bar, and the leading seat with its number and its gap to you. |
| The goal | On the turn your number first crosses the goal, you gain 1 bead. Any number of seats can do this. A later fall does not take the bead back. |
| The stake | On the deal turn you must stake one of the three. Stakes are open: every seat sees them when the turn resolves. If you cross the goal of your staked wager, you gain 2 beads, not 1. |
| The lead | When the age closes, the seat with the highest number on each wager gains 1 more bead. It must have crossed the goal. |
| A tie for the lead | The seat that crossed the goal on the earlier turn takes the bead. If that turn is the same, both seats take one. |
| The close | A sheet shows each wager, who crossed the goal, who led, and the beads paid. Then the next three are dealt. |
| The most one seat can take | 4 beads from goals and 3 from leads in one age. |

### What changes and what stays

|   | Today (checked in the code and data) | Proposal |
|---|---|---|
| Deal | Three wagers, three different lines, the same for all seats (`rules.dealt` 3) | The same |
| Goal | A bar for each age in `data/wagers.json`; paid on the turn it is first met (`runWagers`) | The same, with one number for each wager |
| Pay for a goal | Staked 2 beads, the others 1 (`stakeBeads`, `otherBeads`) | The same |
| Stake | Required on the deal turn, and private | Required, and open |
| Lead | Seats are ranked on the wager sheet, but rank pays nothing | 1 bead at the close |
| A failed stake | A malice in a chair until the next judgement (`judgeWagers`) | No malice. See section 2 |
| Wagers | 24 rows; 14 are sums over an age; 3 have several clauses | 12 rows, each one number that is on a screen |
| Æra I | No deal. Nothing is counted before the first deal | Open. See below |

### Æra I

My view: deal two wagers in Æra I, with a goal only. No stake and no lead bead. Use the two simplest counts, total population and improved hexes. The first age then has a goal that a new player can read, and the early seats are too unequal for a ranking to be fair. The cost is up to 2 more beads for each seat, which the door must allow for.

## 2 · The cost: A failed stake, and the winner's burden

The user's two ideas: a malice that "penalizes certain areas, but also unlocks a powerful catch up mechanic at the same time", or "if you win a ranking, you actually take a penalty in the next age for doing so well".

### Form A: No cost

- **Rule.** A failed stake pays nothing. The cost is the second bead that you did not win.
- **Worked case.** You stake trade routes and end 4 short of the goal. You gain no bead from it. Nothing else happens.

### Form B: A two-sided malice

- **Rule.** A seat that fails its stake takes one malice, drawn from the three below. It sits in a chair until the next close, as a malice does today. Each one hurts one area and opens one strong lever.
- **Worked case.** See the three malices below.

### Form C · recommended, with A: The leader's burden

- **Rule.** Each lead bead that you take raises all your goals in the next age by 10%. Your card shows both figures: "Goal 46 · 40 for the others". The seat with the fewest beads at a deal has its goals 15% lower.
- **Worked case.** You lead two wagers in Æra II. In Æra III the population goal is 40 for the world and 48 for you. Cleopatra is last on the rod, and her goal is 34.

### Form D: A mix with a choice

- **Rule.** Forms A and C apply. A seat that fails its stake is also offered the three malices and may take one or none.
- **Worked case.** You miss your stake. The close sheet offers The Closed Schools. You are four technologies behind, so you take it: cheap technologies are worth more to you than the lost science.

### Three two-sided malices (for forms B and D)

| Malice | It hurts | It opens | Worked case |
|---|---|---|---|
| The Closed Schools | −10% science in every town (the malice of today) | Technologies that a rival already knows cost you 40% less | You are 4 technologies behind Cyrus. Each of those costs 40% less, so you close the gap in about half the turns. |
| The Mercenary Year | Every unit you pay for costs +1 gold a turn (the malice The Deserters of today) | Units cost half as much to buy with gold | You have 300 gold and a rival at the border. You buy four soldiers for the price of two, and pay their upkeep until the next close. |
| The Short Draft | Your Order drafts deal one card fewer (the malice of today) | Your drafts cost 30% less culture | You see two cards and not three in each draft, but you draft about three times for the price of two. |

The first half of each row is an effect that the malice deck has today. The second half is new and may need a new card shape.

### Other forms of the burden

| Burden | Rule | Why I rank it lower |
|---|---|---|
| The plain stake | A seat that took two or more lead beads gains 1 bead, not 2, for its staked goal in the next age | It removes the reason to stake well, which is the fun part |
| The watched seat | Stakes are secret, except for the seat with the most lead beads | It needs secret stakes, and open stakes make more competition |

### Why C with A

- The user dislikes plain penalties. Form C has none for a seat that is behind.
- It slows the seat that needs slowing, and it is printed on that seat's own card.
- It uses the rule that difficulty tier 13 needs ("Wager milestones are 40% higher for you"). One mechanism serves both.
- A malice takes a chair from a seat that is already behind. The two-sided malice softens that, and it costs three new effects and their bot values.

## 3 · The wagers: Twelve numbers that a player can watch

The rule for a wager: it reads a number that is on a screen. A standing total is visible today or needs one line. A sum over the age needs a counter that the card shows from the first turn of the age.

| Id | Wager | Group | The line a player reads | What it counts, and where you see it | Standing or summed | Play it rewards | How a rival competes | Exploit and guard |
|---|---|---|---|---|---|---|---|---|
| `sixVoices` | The Six Voices | Engine | All six of your yields in one turn, added up. | Food, production, gold, science, culture and faith a turn. The top bar shows the six parts. No screen shows the sum today. | Standing. (Today this wager is a sum over the age.) | Every card and building you add. This is the number the In play screen grows. | Any growth. A rival cannot lower yours without war. | A rite or a citizen swap gives a one-turn peak. Leave it: a peak that you built is the moment the user wants. |
| `learningAndLetters` | Learning and Letters | Engine | Science and culture you gained this age. | The two per-turn figures on the top bar, added up from the deal. Both running totals exist in the code. | Summed. Counter: "1,240 gained" on the card from turn 1 of the age. | Research and drafting. | A higher rate. Lumps from discoveries and great people count. | None found. Lumps count, and that rewards action. |
| `tithesAndTolls` | Tithes and Tolls | Engine | Faith and gold you gained this age. | Gross income of the two banks. The top bar shows the rate. The total needs two new counters (today's gold total is net of costs, and faith has none). | Summed. Counter on the card. | Trade, plunder, camps cleared, religion. | A higher rate. Plunder of your traders lowers your rate. | Two seats pass gold back and forth. Guard: gifts and tribute from a seat do not count. |
| `thePeople` | The People | Land | Citizens in all your towns. | The citizen figure on each town's banner. The sum exists in the code (`totalCitizens`). | Standing. | Growth, new towns and captured towns. | Settle, grow or take towns. | None found. Starving later does not return the bead, but it loses the lead. |
| `theWorkedLand` | The Worked Land | Land | Hexes with an improvement inside your borders. | The map. No screen counts them today. | Standing. | Workers, and cultivating the map. | More land and more workers. Pillage lowers a rival's count. | Build and pillage your own. Guard: it counts what stands, not what was built. Roads do not count. |
| `theFullTable` | The Full Table | Land | Different luxuries you hold. | The luxury row of the empire drawer. | Standing. | Exploring and settling toward new luxuries. | Settle the luxury first, or pillage its improvement. | A small number, so ties are common. The tie rule handles it: the first to the goal. |
| `theGreatForge` | The Great Forge | Works | The production of your best town in one turn. | The production figure on the city screen. | Standing. | One strong town: mines, a smithy, production cards. | Build a stronger town. | All citizens on mines for one turn. Leave it for the goal. The lead reads the turn of the close only. |
| `theBuilders` | The Builders | Works | Buildings you finished this age, built or bought. | The city screen lists them. No screen counts them today. | Summed. Counter on the card. A new counter for each seat, so a captured building does not count. | Building in every town. | More towns, more production, more gold. | Cheap buildings in many towns count the same as dear ones. Accept: wide play should win one wager. A wonder counts as one. |
| `theOpenPurse` | The Open Purse | Works | Gold and faith you spent this age. | The two counters exist in the code (`goldSpent`, `faithSpent`). No screen shows them today. | Summed. Counter on the card. | Buying units, buildings, hexes and great people. | Spend more. It rewards a seat that uses its banks. | Paying a rival and getting it back. Guard: only purchases count. Upkeep, gifts and peace terms do not. |
| `theStandingArmy` | The Standing Army | Reach | The combat strength of all your units, ranks counted. | Each unit's card shows its strength. No screen shows the sum. Today's reading (`armyStrength`) leaves out ranks. | Standing. | An army, kept alive and promoted. | Build more, or kill yours. | Train cheap units and disband them after the goal. Leave it: upkeep is the cost, and the lead reads the close. |
| `theCaravanserai` | The Caravanserai | Reach | All the yields of your trade routes in one turn. | The trade class of the Ledger. | Standing. (Today this wager is a sum over the age.) | Routes, markets and Commerce cards. | More routes. Plunder ends a rival's route. | None found. |
| `thePatronage` | The Patronage | Reach | All the yields from your great people in one turn: their hexes and legacies. | The people class of the Ledger. | Standing. (Today this wager is a sum over the age.) | Calling great people and placing their works. | Take the person first. Pillage a work. | None found. |

- **Cut:** The Field of Glory, by the user's ruling.
- **Left out: the largest single payout.** Few cards add to the same moment, so the number would not grow by play. It also adds different yields into one figure.
- **The deal:** four groups of three: Engine, Land, Works, Reach. A deal takes one wager from three different groups, so an age's three wagers reward different play. The rule of different lines exists today.
- **Repeats:** no wager is dealt twice in one game. Three ages deal 9 of the 12.
- **Names** are kept from today where the idea is the same. The others are placeholders.

## 4 · The beads: The arithmetic and the door

Estimates. They assume that each goal is set so that about half the seats cross it, that a seat stakes its best wager, and that the leader's burden is in force. Each seat also has 1 to 3 beads from grants (Chart the Stars, The Turning Heavens, The Codex).

| Seat | Goals an age | Leads an age | Beads an age | After Æra III | With Æra IV goals |
|---|---|---|---|---|---|
| Leader, four seats | 3 crossed with the stake: 4 | 1.5 | 5.5 | 11 | 15 |
| Middle, four seats | 2 crossed with the stake: 3 | 0.6 | 3.6 | 7 | 10 |
| Trailing, four seats | 1 crossed, the stake half the time: 1.25 | 0.3 | 1.5 | 3 | 4.5 |
| Leader, six seats | 4 | 1.2 | 5.2 | 10 | 14 |
| Middle, six seats | 3 | 0.4 | 3.4 | 7 | 10 |
| Trailing, six seats | 1.25 | 0.15 | 1.4 | 3 | 4 |

- **The count of seats changes little.** A goal is each seat's own, so only the three lead beads are shared.
- **The lead beads of Æra IV come too late.** Today the last age is judged when the Opus is raised, or 40 turns after the age opened. So the last column counts goals only.
- **The door should be 9.** A leader holds 9 late in Æra III, but the Opus also needs Alchemy, the last technology of Æra IV, so that seat still waits. A middle seat reaches 9 in the middle of Æra IV with one grant.
- **A trailing seat does not reach 9 on these numbers.** With goals 15% lower (the second half of form C) it crosses about two goals an age: 6 or 7 beads, and 9 with two grants late in Æra IV.
- **If the leader is too far ahead in the bot games, pay less in one place:** a seat can take one lead bead an age, and a second lead passes to the next seat.
- **The Abacus draws 13 beads a rod**, so a door of 9 fits it.

### What the bots must measure

- For each wager and each age: the number of every seat at the close, across seeds. For a summed wager, the total at the close.
- The turn on which each seat crosses a trial goal, and how many of the three goals each seat crosses.
- The beads of each seat by rank at each close, and the turn each seat reaches the door.

**The rule that sets a goal:** the goal of a wager in an age is the median seat's number at that age's close, in bot games on the standard setting, rounded to a clean figure. About half the seats then cross it. The door is the bead count that the median seat holds in the middle of Æra IV.

## 5 · The screen: What the player sees

The page has a mock of the panel: three cards, each with the number now, a bar with the goal mark and the leader's mark, the leader's name and figure, the stake's mark and the beads on offer.

- The panel opens from the age wager row of the empire drawer, where the wager sheet opens today.
- A summed wager shows its total and its rate, so the player can see if the goal is in reach.
- Under the leader's burden the goal line reads "goal 506 · 460 for the others".

## 6 · The build: What it costs

| Part | Size | Note |
|---|---|---|
| The twelve rows and four groups | Small | `data/wagers.json` and `docs/wager.md`, with the sync test. The clause shape goes idle |
| New readings | Medium | Five new counts (population, best town's production, improved hexes, kinds of luxury, buildings finished). Ranks added to army strength. Gross faith and gold gained. One-turn readings of the six yields, trade and great people (today those three are sums) |
| The lead bead and the tie rule | Small | One step in the judgement at the close. The claim already stores its turn |
| The open stake | Small | The stake exists. The sheet shows every seat's |
| Goals by percentage for one seat | Small | Shared with difficulty tier 13 |
| The malice step | Small | Removed from the judgement. The malice deck stays in the data |
| The card and the panel | Medium | The wager sheet gains the number now, the leader, the counter and the stake marks |
| The bots | Medium | See below |
| The measuring run and the goals | Medium | After the bots are tuned |

- **How a bot stakes today** (`src/ai/wager.ts`): it projects each number to the close from the seat's own rate, compares it with the goal, and stakes the best expected value. That method stays. The malice term (`wager.malicePenalty`) drops out.
- **What is new for a bot:** the value of a lead bead. It compares its projection with the best rival's number, which is public.
- **The appraisal already has the terms.** A bead has a weight (`weights.bead`), and every one of the twelve numbers is made of things the bot already values: yields, units, routes, buildings.
- **One fact to plan for:** nothing is counted before the first deal. A wager in Æra I needs a deal on turn 1.

## 7 · The questions

### Question 1: Is the stake open, and does it pay 2 beads for its goal?

**Recommended.** Yes to both. Open stakes let rivals answer each other, and 2 beads is the rule of today.

### Question 2: What does a failed stake cost?

**Recommended.** Nothing more than the bead (form A), with the leader's burden (form C). Keep the two-sided malices as an offer to refuse (form D) if you want the malice kept.

### Question 3: Does the seat with the fewest beads get goals 15% lower?

**Recommended.** Yes. It is the only help for a trailing seat in this format, and it uses the same rule as the burden.

### Question 4: Do "all six yields", "trade routes" and "great people" read one turn, or the sum over the age?

**Recommended.** One turn. It is the number the player already watches grow. The two "gained" wagers and the two "this age" wagers are the summed ones.

### Question 5: Does Æra I deal wagers?

**Recommended.** Yes: two, with a goal only (total population and improved hexes), no stake and no lead bead.

### Question 6: Where is the door?

**Recommended.** At 9 for the first bot run. Then set it from the bots: the bead count of the median seat in the middle of Æra IV.

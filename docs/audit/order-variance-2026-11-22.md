# Orders and variation between bot economies, 22 November

## Question and scope

The user asked whether the strong and weak simulated economies chose different
Orders, and whether card balance could explain the large spread.

This audit reuses the parameter search's saved command logs. It does not change
cards, bot preferences, the simulation or the play server. The Standard cohort
has 32 games on five seeds, with six leaders per game. It includes repeated
policy trials on the same map. Those are interacting observations, not 192
independent games. Two games use the older play bot. The remaining games use
the frozen candidate implementation and different policy settings.

Compare the same leader and seed where possible. Check turn 80 as well as the
final turn. A late card acquired after a large economy develops is not evidence
that the card caused the early lead. Keep city losses and unit losses in view.

## Measurement correction

The original audit used `readEmpireRates`, which is the input to rate-based
card effects. It deliberately omits direct empire-level card income so an
effect cannot read its own output. It is not the complete HUD income.

This omitted some income from the reported total, science, culture, gold and
deck yield. The simulation paid that income correctly. The audit now uses
`readEmpire(...).totals`. A regression test uses The Art Dealers, which pays
three gold per seated Order, to expose the difference.

The existing command logs are replayed with the original frozen simulation.
The replay checks the original checkpoint rates, accumulated partial rates,
held Orders, seated Orders, researched technologies, captures and final outcome.
Corrected results are written beside the originals. No original run is replaced.

## Main findings

1. Early recurring culture can change the whole development path. The Twelve
   Tables is the clearest balance candidate in the inspected cases: each held
   Order adds production and culture to the capital, including Orders on the
   shelf. More culture buys more Orders, which raise its income again.
2. A strong opener is not sufficient. Two Sejong runs took the same first two
   Orders at the same turns. Their later economies still separated sharply.
3. Strong councils connect rewards to repeated actions and then multiply them.
   The large outcomes use Orders, Doctrines, governments, buildings and great
   people together. Attribute their interactions, not all their income to one
   Order.
4. Weak councils often have fewer useful chairs and fewer economic effects.
   Some held unlocks remain unused. This can reflect the offers, the bot's
   choices, its production plan or the government's chair layout.
5. A combat card's zero immediate income does not make it worthless. Its
   military effect, protection and possible conquest need separate evaluation.

## Cross-reference across the Standard games

Rank each leader's 32 outcomes by complete turn-80 income, then compare the
strongest eight with the weakest eight. Check cards held by turn 40, not just
those acquired near the final turn.

- Lorenzo: all eight strongest cases held The Twelve Tables by turn 40; none
  of the eight weakest did. The strong group contains five runs of seed 314
  and three of seed 28411. The weak group contains five runs of seed 314, two
  of seed 117031 and one of seed 60137. One weak case had lost a city by turn 80.
- On seed 314 alone, eleven Lorenzo runs held The Twelve Tables by turn 40.
  Their median turn-80 income was about 1,090. The other seven had a median of
  about 476. Their median turn-40 culture was 28 versus 12. One of the seven
  without it lost a city; none of the eleven with it did.
- The Workshop at Olympia appeared by turn 40 in six of Lorenzo's strongest
  eight and none of his weakest eight. It gives three renown per turn for
  each wonder held. That links wonder production to great-person recruitment.
- Sejong: all eight strongest cases held The Twelve Tables by turn 40, but
  four of the weakest eight held it too. Four weak cases had lost cities by
  turn 80. The matched case below checks two runs with no city losses.
- Mehmed: the strong group more often held The Ver Sacrum, which grants a
  Settler and melee unit on draft, and Sword and Plough, which gives garrisoned
  towns one culture and two production. The Apprentices, which grants science
  equal to 20% of each completed non-wonder building's production cost, also
  appeared more often. No Mehmed in either group had lost a city by turn 80.

These are associations within a selected parameter-search batch. Most of the
repeated trials use seed 314. Do not treat the counts as a randomized card
experiment or as proof that a particular card is required to win.

The table gives selected opening-card comparisons for every leader. Each
count is out of eight, and means held by turn 40. The complete counts, including
cards more frequent in weak games, are in the accompanying JSON.

| Leader | Order and effect in the tested build | Strong group | Weak group |
|---|---|---:|---:|
| Alexander | The Seed Grain: founded towns start with one extra citizen. | 6 | 0 |
| Alexander | The Quartermasters: worked strategic resources gain three food and three production. | 5 | 0 |
| Jayavarman | The Megaliths: workers can build one stone circle per town on flat land. It gives two faith and one culture, plus one faith per adjacent pasture, camp or plantation. | 6 | 0 |
| Jayavarman | The Calling: the capital gains three faith. | 2 | 8 |
| Lorenzo | The Twelve Tables: the capital gains two production and two culture per held Order. | 8 | 0 |
| Lorenzo | The Workshop at Olympia: three renown per turn per wonder held. | 6 | 0 |
| Mansa | The Brick Kilns: each completed building adds one empire science and gold, capped at twenty of each. | 4 | 1 |
| Mansa | The Periplus: coastal towns gain one science and one culture. | 3 | 0 |
| Mehmed | The Ver Sacrum: drafting it grants a Settler and melee unit. | 6 | 0 |
| Mehmed | Sword and Plough: garrisoned towns gain one culture and two production. | 4 | 0 |
| Sejong | The Twelve Tables: the capital gains two production and two culture per held Order. | 8 | 4 |
| Sejong | The Working Court: towns with a Monument gain production equal to thirty percent of their culture. | 5 | 2 |

Some associations reverse by leader. The Ver Sacrum appears in none of
Alexander's strongest openings and two of his weakest, despite its strong
association for Mehmed. The Royal Household, which gives the capital three
culture and two happiness, appears in four strong and two weak Jayavarman
openings, but two strong and seven weak Mehmed openings. These are warnings
against treating a card's group count as its isolated strength.

## Matched case: Lorenzo, seed 117031

The old play bot and current candidate bot have the same leader, start and map.
Their decisions and later random draws diverge. This is a useful diagnosis, not
an isolated experiment changing only one card.

| Checkpoint | Weak economy | Strong economy |
|---|---:|---:|
| Total yields, turn 20 | 30.65 | 43.25 |
| Total yields, turn 40 | 47.19 | 113.25 |
| Total yields, turn 80 | 104.50 | 962.29 |
| Total yields, turn 100 | 200.15 | 4678.89 |
| Cities, turn 80 | 2 | 8 |
| Citizens, turn 80 | 12 | 44 |
| Drafts, turn 80 | 10 | 18 |

Neither Lorenzo had lost a city by turn 80. The weaker one lost a population-one
city on turn 97. That late loss does not explain the earlier gap.

Both took The Cornerstone on turn 8. It speeds wonder and culture-building
production by 25%. On turn 17 the stronger game was offered The Twelve Tables
and took it. The weaker game's hand offered Open Market, which increases gold purchasing
power by 25%; The Temple of the Muses, which gives each culture building two
faith; and The Merchant Shrines, which gives towns working an improved luxury
two faith. The bot passed. It did not reject
The Twelve Tables: it was not in that hand.

The strong game took The Heralds on turn 20. It grants 30 culture when a town
is founded. The weak game had only The Cornerstone at turn 20. The strong
capital already received six base culture and six base production from its
three held Orders under The Twelve Tables, before applicable modifiers.

By turn 100 the weak bot had passed six of twelve drafts. Its four empty chairs
were not free places for its economic cards: two were Military, one was Civic,
and the Wildcard chair was blocked by The Heavy Writ. Its government and card
collection did not fit well together.

## Matched case: Sejong, seed 314

Both runs took The Twelve Tables on turn 8 and Illuminated Treatises on turn 12.
Illuminated Treatises gives Libraries one culture and Monuments one science.
Both had about 52 total yields at turn 20.

| Checkpoint | Weak council | Strong council |
|---|---:|---:|
| Total yields, turn 40 | 75.40 | 137.50 |
| Total yields, turn 80 | 179.35 | 1004.58 |
| Total yields, turn 100 | 343.13 | 10126.24 |
| Cities, turn 80 | 2 | 8 |
| Citizens, turn 80 | 11 | 32 |
| Cities lost by turn 80 | 0 | 0 |
| Units lost by turn 80 | 14 | 17 |

The strong run added The Art Dealers, The Working Court, The Honoured Dead,
The Learned Patron and The Roll of Masters. Together they connected the
council's size, culture and great-person recruitment to more income.

The weak run held The Polemarch, which gives units two strength per seated
Military card; The Unveiling, which deals a free Order hand when a wonder
finishes; and The Forward Plans, which permits Universities before Scholarship.
These are not interchangeable economic investments. In particular, the weak
empire still had no University by turn 80. Unlocking it did not make the bot
build it. The Unveiling had opportunities to pay because the empire did finish
wonders; a zero standing-income stamp does not describe those one-time rewards.

The strong game had five recruited great people by turn 80, compared with two
in the weak game. Later it also acquired The Two Capitals, a Doctrine that
makes the largest non-capital town count as another capital for cards and
slows growth elsewhere by 25%. That repeats capital-based payoffs. The Curia
also raises Civic card payments by 30%. These must be included when judging
The Twelve Tables and The Honoured Dead late in the game.

## Matched case: Mansa, seed 117031

The two policies also produced different Commerce councils. At turn 100 both
Mansa empires had twelve cities. The stronger one had 112 citizens and about
4,172 total yields; the weaker had 80 citizens and about 1,720 yields. These
are different economies, not a card-only comparison.

The strong council combined The Common Road, which adds three gold, science
and culture to foreign routes, with The Scholars' Roads, which doubles routes'
science and culture. Removing either chair at turn 80 lowers current total
income by about 212 and 197 respectively. These effects overlap.

It later seated The Latifundia, which doubles improved luxury-tile yields, and
Money at Work, which gives each town one science per twenty empire gold per
turn. The latter's current removal effect at turn 100 is about 619 yields.
The route and tile base feeds a broad later conversion. The larger population,
religious effects and other investments also contribute to the gap.

## Cards to examine first

The descriptions below are historical data from the tested build at
`1e844e46`, not a live card reference or proposed replacements.

| Order | Effect | Reason to examine it |
|---|---|---|
| The Twelve Tables | Capital gains two production and two culture per held Order, seated or not. | Early production and draft progress reinforce the same uncapped collection count. |
| The Prytaneion | Each town gains one food per seated Order. | Council size and city count both increase the reward. Growth then supports more production and research. |
| The Heralds | Founding a town grants 30 culture. | Converts expansion into more drafts at a time when culture is scarce. |
| The Art Dealers | Gain three empire gold per seated Order. | Gives a developing council a broad income source without a building prerequisite. |
| The Working Court | Towns with a Monument gain production equal to 30% of their culture. | Converts culture-led development into construction capacity. |
| The Honoured Dead | Each great person gained while it is active adds eight science and eight production to the capital. | Repeated recruitment builds a permanent payment, amplified by capital and Civic effects. |
| The Learned Patron | Towns with an Amphitheater gain science equal to 30% of their culture. | Converts the same culture base into research. |
| The Golden Age | A wonder completion or great person grants cities 25% more production and culture for ten turns; later events refresh the duration. | Frequent completions can keep the bonus active. Measure the timed effect separately from the chair. |
| The Roll of Masters | Three percent more science and culture per great person gained, capped at 30%. | Multiplies the recruitment engine's existing income. |
| The Common Road | Foreign routes give three additional gold, science and culture. | A strong cross-yield route foundation in Mansa's better game. |
| The Scholars' Roads | Trade routes pay twice their science and culture. | Multiplies the same routes rather than asking for an unrelated investment. |
| Martial Law | Each garrison grants its town four food and two happiness to the empire. | Supports growth using units the empire already needs. |
| Sword and Plough | Garrisoned towns gain one culture and two production. | Connects early defense to development. |
| The Regimental Schools | Each garrison gives its town six science and six production. | A later broad economic payoff for the same garrisons. |

The strongest immediate removal effects are not additive. Removing one Order
can reduce another card's seated-card count, cross a happiness threshold, or
reduce a conversion's input. They measure the current council's dependence on
a card, not the card's isolated printed payment or its lifetime contribution.

## Bot issues to keep separate from balance

- The weak Lorenzo passed half his drafts and ended with a poor fit between
  his chair layout and his collection. Inspect the original appraisal at those
  decisions before changing skip or government weights.
- An early building unlock can score as an option, while the production plan
  never realizes it. The weak Sejong's University unlock is a concrete case.
- The bot's free reroll decision is implemented for beliefs. The Order draft
  path does not use that decision. A card granting free Order rerolls needs
  separate bot support before bot outcomes can judge its full utility.
- Some forecast and purchasing estimates call `ratesOf`, which intentionally
  supplies conversion inputs. Review uses that need complete income instead.
  Do not replace conversion inputs globally: the simulator needs that boundary
  to prevent effects reading their own output.

## Interpretation

The inspected games support an Order-driven feedback effect. They do not yet
measure what percentage of variance comes from card balance. The same map can
produce different offers after policy changes because draws use the gameplay
random stream. Starts, early construction, fighting and the opponent's play
also change. One rare opener can help, but one successful opening does not
explain the later council, government and great-person combinations.

The next balance experiment should hold the leader and map fixed, record the
offers as well as picks, and measure development before any city loss. Compare
complete combinations and ordinary hands. Do not reduce every card found in a
winning empire or treat all zero-income military cards as weak.


## Measured current dependencies

These figures use the complete income reading on the real board and on a copy
with one source removed. They include interactions, so do not add the rows.
The total is the HUD's six yields, including production bonuses for the current
queue and active temporary effects. It is not food surplus or a long-run average.

| Strong Sejong, seed 314 | Removal effect at turn 80 | Removal effect at turn 100 |
|---|---:|---:|
| The Twelve Tables, chair | 175.20 | 2225.50 |
| The Honoured Dead, chair | 93.56 | 1912.79 |
| The Working Court, chair | 54.97 | 521.26 |
| The Golden Age, active timed effects | 114.84 | 881.31 |

The late figures include The Curia, The Two Capitals and other multipliers.
Roger Bacon's legacy also creates short food and production bonuses when a
technology finishes. Removing his active timed effects at turn 100 lowers this
position's total by about 1,325. This is a great-person interaction, not an
Order's printed bonus. The later peaks cannot be attributed to Order balance
alone.

## Saved evidence

- `order-variance-2026-11-22.json` contains the 192 turn-80 seat observations,
  each leader's strongest and weakest groups, the five detailed replay cases,
  the actual offered hands, and historical descriptions of the cards involved.
- The frozen simulation bundle has SHA-256
  `ae96571cab6e2a02c94c71682bbcc420a0f95816caff5837708ce396bdf414bd`.
- `order-variance-replay-entry-2026-11-22.mjs` is the analysis entry. Append it
  to that bundle after removing the final `// scripts/botEconomyAudit.ts`
  entry section. The marker also appears at the beginning, so use the final
  occurrence. Run with the saved command log, original metrics JSON, output
  path and comma-separated seat IDs as arguments.
- The complete metric replay checked all 123 source games. It preserved their
  original partial metrics for verification, wrote corrected copies, and
  recomputed the parameter reports. None of these replays ran a new bot policy.

No card balance change or play-server update is part of this audit.

# Balance watchlist: Orders, Doctrines, leaders and wonders

## Scope

This document tracks potentially strong and weak content found during the
22 November bot inquiry. It is a watchlist, not an approved balance change.
The earlier sections use the frozen rules-260 build described in the
[Order audit](order-variance-2026-11-22.md). Later deck proposals are separate.

Evidence labels:

- **Measured association:** appears more often in strong or weak recorded
  games. This does not isolate its effect.
- **Current dependency:** removing it from a copied position changes current
  income. Interactions overlap and must not be summed.
- **Bot limitation:** the bot's appraisal or use is incomplete. Do not infer
  low player value from those games.
- **Needs comparison:** a plausible concern without enough controlled evidence.

This is a historical analysis, not a table of current balance rules. The
[evidence snapshot](balance-watchlist-evidence-2026-11-22.json) records the
tested definitions and counts. It covers 32 Standard-map games on five seeds,
or 192 seats at turn 80. Within each leader, compare the eight highest-income
seats with the eight lowest. Repeated settings on one map are not independent
maps. The groups rank income, not combat success or total score.

Order counts below refer to ownership by turn 40 unless stated otherwise.
Doctrine and wonder counts refer to turn 80. Later ownership can be a result
of a lead. These counts do not control for which choices were offered.
Do not label an untested leader or an unbuilt wonder weak because it has no wins.

## Orders

### Potentially too strong

- **The Twelve Tables:** the capital gains two production and two culture per
  held Order, seated or not. All eight strongest Lorenzo games held it by turn
  40; none of the eight weakest did. On seed 314, median turn-80 income was
  about 1,090 with it and 476 without it. **Measured association.** Check the
  culture-to-drafts feedback and its interaction with capital multipliers.
- **The Honoured Dead:** each great person gained while active adds eight
  science and eight production to the capital. In the strong Sejong case,
  removing its chair lowers turn-100 income by about 1,913, including
  interactions. **Current dependency.** Check capital duplication and Civic
  multipliers before treating this as the card's isolated payment.
- **The Golden Age:** a wonder or great person grants cities 25% more
  production and culture for ten turns; new events refresh the duration.
  Removing its active effects lowers that Sejong position's turn-100 income
  by about 881. **Current dependency.** Check how easily completion and
  recruitment can keep it active.

### Potentially weak or underused

- **The Forward Plans:** permits Universities before Scholarship. Weak Sejong
  took it on turn 27, lacked the required Library until turn 70, and built no
  University through turn 100. The build scorer rejected the upkeep while the
  card scorer valued the unlock highly. It also retained substantial value
  after a copied position received the normal unlock technology.
  **Confirmed bot limitation; possible narrow utility.** Repair the appraisal
  before deciding whether the card needs a broader effect.
- **The Second Reading:** the first reroll of each hand is free. The bot uses
  a free-reroll decision for beliefs, not Orders. **Bot limitation.** Its
  presence in strong games does not show the bot uses its main advantage.
- **Pure faith openers:** The Calling gives the capital three faith; The
  Household Gods gives every town two faith. Jayavarman's strong/weak counts
  are 2/8 versus 8/8 for The Calling, and 1/8 versus 6/8 for The Household Gods.
  **Measured association, bot use unresolved.** Compare
  how that faith becomes beliefs, purchases and development before proposing
  buffs.
- **Merchant Princes:** permits buying great-person drafts with gold.
  The bot has no command path to make this purchase. **Bot limitation.**
  This is a capability check, not an observed weak-game association. Its
  printed effect can be valuable to a player while paying nothing for a bot.

## Doctrines

### Potentially too strong

- **The Jinshi:** adds two Civic chairs. Sejong holds it in 8/8 strong seats
  versus 2/8 weak seats; Lorenzo in 4/8 versus 1/8. **Measured association.**
  Extra chairs can keep early scaling cards active alongside later cards.
  Test its value with and without strong capital payments.
- **The Choregia:** culture buildings gain three culture and two renown each.
  Lorenzo's count is 5/8 versus 1/8. **Measured association.** It develops both
  the draft supply and great-person recruitment from the same buildings.
- **The Barmakids:** each great person already gained gives every town one
  food and one production. Lorenzo's count is 4/8 versus 0/8; Sejong's is
  2/8 versus 0/8. **Measured association.** Check the combined scaling from
  city count, recruitment, and food-driven population growth.
- **The Two Capitals:** the largest non-capital town also counts as a capital
  for cards; the other towns grow 25% more slowly. **Needs comparison.** It
  repeats the capital payments involved in the extreme Sejong outcome.
  Attribute the interaction jointly with those Orders, not to each in full.
- **The Pythagorean Brotherhood:** each city gains two science, doubled with
  a Shrine. Mehmed's count is 5/8 versus 1/8; Sejong's is 7/8 versus 3/8.
  **Measured association.** This is a reliable early development option.
  Check whether competing Doctrines lack an equally useful early return.

### Potentially weak or underused

- **The Apoikia:** gold buys twice as much when purchasing Workers and
  Settlers. Lorenzo's count is 1/8 versus 4/8, but Mansa's is 4/8 versus 3/8.
  **Needs comparison, possible bot limitation.** Its value requires saving
  for purchases and redirecting city production. Ownership alone proves little.
- **The Peregrini:** great-person works give adjacent tiles one food and one
  production; placing a work reduces the next great-person cost by 20%.
  Lorenzo's count is 0/8 versus 3/8. **Needs comparison.** Check work placement,
  worked adjacent tiles, and recruitment before changing its numbers.
- **The Workshops of Syracuse:** military units gain five strength and cost
  50% more to build and buy. Mehmed's count is 1/8 versus 4/8.
  **Possible weak tradeoff or poor bot use.** A bot that already builds too
  many units pays the cost immediately. Measure losses and captures too.
- **The Laws of Lord Shang:** while a city builds a military unit, its food
  surplus becomes production instead of growth. Mehmed's count is 0/8 versus
  2/8. **Needs comparison.** Repeated military production can prevent the
  growth needed for later science and income. The sample is small.
- **The Theoric Fund:** gives one empire culture per three empire faith.
  Jayavarman's count is 1/8 versus 5/8. **Bot limitation plus association.**
  Some planning readers omit this direct empire culture. Do not infer that
  the conversion itself is weak until those readers are corrected.

The Magnaura gives each city two science per seated Civic card. Its Sejong
count is 4/8 in both groups. Keep it as a comparison for The Jinshi, not as
independent evidence that all Civic-related Doctrines are too strong.

## Leaders

The six tested leaders are shown below. Income is the sum of all six recurring
yields at turn 80, including direct empire payments. These are outcome
measurements, not an ability ranking. Decks, start biases, seats, and personas
differ. The 800-yield objective remains turn 100.

| Leader | Main abilities in this study | Median income at turn 80 | Observed range |
| --- | --- | ---: | ---: |
| Lorenzo | Renown from net gold; gold buildings improve wonder production. | 882 | 105–2,413 |
| Mehmed | Barracks science grows with scholars and generals; stronger city attacks and science from captures. | 368 | 113–896 |
| Sejong | Science and culture from population; temporary renown after technologies. | 295 | 24–1,764 |
| Jayavarman | Freshwater farms gain food and faith from public works; population gives empire culture and faith. | 273 | 134–917 |
| Mansa | Mines, Camps and worked desert give gold; routes involving holy cities give gold and faith. | 262 | 79–1,447 |
| Alexander | Attack strength and army healing on capture; military recruitment grants science. | 237 | 107–734 |

- **Potentially too strong: Lorenzo's full package.** He has the highest
  within-seed median on four of the five maps. Commerce gold, renown,
  Magisterial capital payments and wonder production reinforce each other.
  Test his abilities separately from that deck pair before proposing a nerf.
- **High ceiling, inconsistent floor: Sejong.** His best combinations are
  extreme, but his weak games include city losses and confirmed planning
  errors. This does not yet support a general leader nerf or buff.
- **Potentially weak in ordinary peaceful development: Alexander.** His
  economy is lowest in this cohort, but neither his strong nor weak group
  captured a city by turn 80. His capture kit is largely untested here.
  Evaluate conquest and recovery before calling his abilities too weak.
- **Potentially underused: Mansa and Jayavarman.** Their medians are low beside
  Lorenzo, while both have strong individual games. Trace faith spending,
  route selection, and public-work development. A low bot median is not enough
  to justify a buff to a player-controlled leader.
- **Mehmed remains a comparison.** His strong group captured three cities in
  total versus none in the weak group. Growth, science, and conquest all need
  to count when evaluating him.

Other leaders are untested in this original cohort. The later all-leader
cycle below provides initial coverage, not a firm strength verdict.

## Wonders

The descriptions below name the effects relevant to the concern. Exact
tested rows, including completion grants and renown, are in the evidence
snapshot. Every comparison still needs completion timing and production cost.

### Potentially too strong

- **The Theatre of Dionysus:** gives four culture, a Doctrine draft and a free
  Amphitheater on completion, happiness per Amphitheater, and artist renown.
  Lorenzo's count is 8/8 versus 2/8; Sejong's is 8/8 versus 0/8.
  **Measured association.** An extra permanent Doctrine can be more important
  than the wonder's own yields. Record which Doctrine it actually provided.
- **The Oracle:** gives culture, faith and renown, plus one more option in
  each Order and Doctrine hand. Lorenzo's count is 8/8 versus 2/8; Sejong's
  is 7/8 versus 1/8. **Measured association.** Better access to powerful cards
  could increase consistency as well as yield. Test draft quality directly.
- **The Pyramids:** Workers gain a charge and wonder production rises 20%;
  also gives engineer renown. Lorenzo's count is 8/8 versus 1/8; Sejong's
  is 7/8 versus 0/8. **Measured association.** Check how much it advances
  later wonder completions, especially alongside Lorenzo.
- **The Mausoleum:** doubles the entire yield of great-person work tiles,
  applied after other tile bonuses, and gives five engineer renown per turn.
  Lorenzo's count is 7/8 versus 0/8; Sejong's is 5/8 versus 0/8.
  **Measured association.** The whole-tile multiplier and recruitment form a
  strong candidate combination. A work-free empire is a necessary comparison.
- **The Weiyang Palace:** gives culture, raises capital building production
  25%, and adds capital culture per building; also gives engineer renown.
  Sejong's count is 5/8 versus 0/8. **Measured association.** Check the value
  when capital development is already rewarded by Orders.
- **The Hanging Gardens:** gives food, raises empire growth surplus 25%,
  improves freshwater farms in its city, and gives engineer renown.
  Mehmed's count is 6/8 versus 0/8. **Measured association.** Use it to test
  whether early growth is unusually decisive, not just wonder ownership.

### Potentially weak, narrow, or underused

- **The Statue of Zeus:** gives three best-available melee units on completion,
  four attack strength against cities, culture, and general renown.
  Mehmed's count is 0/8 versus 3/8, but Sejong's is 5/8 versus 2/8.
  **Mixed evidence.** Check whether the army fights and captures cities before
  calling the wonder weak. Yield-only comparisons miss its intended return.
- **The Great Lighthouse:** gives gold, gold on fishing boats, and naval
  strength and movement, plus merchant renown. **Bot limitation.** The current
  bot does not build a naval army. Its naval benefit cannot be judged from
  these runs, even when wealthy cities build it for its other benefits.
- **The Great Sphinx:** gives faith, culture per faith-supplying building,
  five free rerolls on completion, and general renown. **Partly underused.**
  The bot does not use its rerolls on Order hands. It appears in 8/8 strong
  Sejong seats versus 2/8 weak seats, so its passive effects may already be
  strong. An unused ability does not mean the whole wonder needs a buff.
- **The Walls of Uruk:** raises its city's health and defense, gives strength
  on owned land, authority, and general renown. **Timing concern.** Weak
  Sejong completed it before the Library. Check the danger it prevented and
  the development it delayed. This is not evidence that its defenses are weak.

No wonder has a confirmed raw-power shortfall from this audit. The weak-side
entries are test candidates, with bot limitations and mixed evidence explicit.

## Cross-system effects

The Curia government raises Civic card payments by 30%. Roger Bacon's legacy
gives temporary food and production bonuses when a technology finishes.
Both contribute to the large Magisterial outcomes. Keep them beside the
Order and Doctrine findings rather than attributing all income to one card.

## First all-leader cycle

The [all-leader report](bot-all-leader-results-2026-11-22.md) adds five maps
with every selectable leader appearing twice. It compares a baseline and
two structural bot experiments, with the earlier tuning held fixed. The
fifteen games are five paired maps, not fifteen independent maps. Its
common comparison is turn 80 because one game ends with a win on turn 88.

- **High ceilings across several packages:** baseline Qin wins on turn 94
  with about 19,174 total income. Baseline Lorenzo reaches about 28,037 on
  turn 100, but only 348 on his other start. Sejong also has large outcomes.
  These observations strengthen the case for checking Magisterial
  interactions, but do not isolate leader abilities.
- **The Grand Army:** the capital gains six science and six culture per
  military unit. In the winning Qin position, removing this seated Order
  lowers current total income by about 3,406. This includes production
  conversions and percentage interactions. **Current dependency.** Check
  whether the card rewards unused armies as much as effective conquest.
- **The Learned Patron:** towns with an Amphitheater gain science equal to
  30% of their culture. Removing it from that Qin position lowers current
  total income by about 2,493. **Current dependency.** Check it together
  with large capital culture payments and Civic amplifiers.
- **The Polymath's Study:** towns gain 8% science and production per
  different deck among held Orders, capped at 40%. Its current difference
  in the same position is about 2,345. **Current dependency.** It magnifies
  an established economy; the observation does not establish an early-game
  or standalone value.
- **The Jinshi remains a candidate:** removing its two Civic chairs lowers
  that Qin position's current income by about 3,953. Losing chairs also
  changes which Orders can remain seated. Do not attribute the whole
  difference to a direct Doctrine payment or add it to the Order differences.
- **Money at Work:** each town gains one science per twenty empire gold
  income, using the card's defined input after upkeep and before direct
  empire card payments. Removing it from baseline Lorenzo's turn-100
  position lowers current income by about 9,090. **Current dependency.**
  The combination of thirty-six towns, route income and science multipliers
  needs a controlled test. Keep this conversion's input separate from the
  complete income a bot can spend.
- **The Immortals:** great-person legacies count twice. Removing it from
  that Lorenzo position lowers current income by about 6,616.
  **Current dependency.** Its value depends on which legacies survived and
  how their percentage effects combine with Orders and government abilities.
- **Happiness wonders can have large indirect value:** removing Notre-Dame
  lowers that Lorenzo position's current income by about 2,998; removing
  the Circus Maximus lowers it by about 2,991. Notre-Dame gives happiness
  per faith-supplying building. The Circus gives four happiness plus one
  per military building. **Current dependency.** These are whole-position
  differences through happiness and other active effects, not direct yield
  payments by the wonders. Check the happiness thresholds and expansion
  costs before treating either wonder as too strong.
- **Conquest needs a separate judgment:** the baseline and combined
  experiment capture no cities on these five maps. The income-only version
  captures three: Alexander takes two from Joan, and Genghis takes one
  from Sejong. The low economic readings of Dominion packages cannot alone
  establish a balance shortfall. The combat audit documents planning gaps.
  Its original-decision trace also confirms that barbarian casualties
  prompted Alexander to accept peace in five wars against other civilizations.

No additional leader, Doctrine or wonder receives a weak-power verdict from
two starts. Keep the earlier weak-side candidates open. Diagnose unused
actions, prerequisite buildings, offered choices and combat execution before
proposing a buff. Individual current-board removal differences overlap and
must not be added together.


## Fresh version-262 baseline, combat comparison

These five games include Claude's weaker barbarians. They are a new baseline,
not a remeasurement of the earlier rules. Each of the fifteen leaders appears
twice. No balance row changed in the combat work.

- **Cyrus:** approximately 10,037 and 4,600 total yields at turn 100. Both
  starts are strong. The Cyrus Cylinder supplies happiness and culture to
  connected cities; the King's Gardeners supplies a worker when founding.
  This can support a large empire, but these two games do not isolate those
  abilities from Orders or map conditions. **Measured association.**
- Both Cyrus runs held **The Learned Patron**, which gives towns with an
  Amphitheater science equal to thirty percent of their culture. They also
  held **The Wonder Commonwealth**, which gives towns holding a wonder
  thirty-five percent more production and food. They had twenty-one and
  eleven wonders respectively. These are candidates for an interaction check,
  not proof that either card or wonder caused the lead. Late ownership can
  be a result of an existing lead.
- **Qin:** approximately 1,968 and 8,975 total yields at turn 100. Both starts
  are strong, with substantial variance. **Measured association.**
- **Mansa Musa** ended one start near 174 yields after losing five cities,
  and another near 3,938 without a city loss. Do not treat the defeated start
  as evidence that the leader or its economic cards are weak.
- **Lorenzo** ended near 2,082 in one start and 233 after losing two cities
  in the other. This also needs the conquest context.

The baseline's median was about 1,403 yields at turn 100. Twenty-two of thirty
seats exceeded 800. Four of the eight below that target had lost cities; four
had not. Keep the unconquered weak positions for the next valuation inquiry.
See the [combat comparison](bot-combat-results-2026-11-22.md) for the fixed
schedule, controls and results of the new bot changes.

### Context from the combat candidates

The combat comparison changes no leader, Order, Doctrine or wonder row.
Each candidate still gives every leader two starts. Do not treat these as
additional independent maps.

- Ranked attacks leaves six seats below 800 income at turn 100. Four lost
  cities. The two without city losses are Nezahualcoyotl on seed 48017
  (about 512 income, twelve cities) and Genghis on seed 85211 (about 724,
  eleven cities and sixty-six military units). Review development and army
  use before interpreting either as weak content.
- Sejong wins seed 85211 on turn 100 in the ranked version. This increases
  the average income sharply. It does not establish a direct economic gain
  from attack ranking. His other start and the policy's median remain
  necessary context.
- Mansa loses five cities in the baseline contested game, one with the peace
  correction and two with ranked attacks. The fight review contains both
  effective defensive combinations and exposed advances. His low-income
  outcomes cannot be separated from those military events.

Keep the existing strong and weak candidates open. This combat batch does
not supply an isolated balance verdict or authorize a balance change.

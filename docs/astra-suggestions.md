# Astra's balance suggestions

Drafted 2026-09-14. **Proposals for review, not approved rulings or implementation instructions.** No game data or mechanics have been changed for this document.

These suggestions come from reviewing the current ability lists and checking the relevant JSON effects and selected simulation readers. Numerical examples are illustrative arithmetic, not measured match outcomes. Proposed numbers are starting points for tests. A strong combination is not automatically a problem: the aim is to preserve powerful builds while improving their costs, vulnerabilities and alternatives.

Sources of truth:

- [Orders, doctrines and governments](orders-and-doctrines.md) and `data/statecraft.json`.
- [Great people](great-people.md), `data/greatPeople.json`, `data/improvements.json` and `data/rules.json`.
- [Beliefs](beliefs.md), [religion rules](religion-v2.md) and `data/religion.json`.
- [Playstyles](playstyles.md), [wagers](wager.md) and [human playtest notes](playtest_notes.md).

Recheck the live rows before implementing: other balance work may supersede this snapshot. Accepted changes should update the source data and its matching reference table together; these tables have sync tests. This file is a proposal record, not another authoritative ability list.

## What this review can establish

- **Direct comparisons:** nearly equivalent abilities with different penalties, weak rewards, arithmetic scaling and payback periods.
- **Structural risks:** rewards that remove their own constraint, erase opponent responses, or pay indefinitely for an early advantage.
- **Questions requiring measurement:** how often combinations are assembled, their timing and opportunity cost, map dependence, and their effect on victory.
- **Questions requiring human judgment:** whether the build is satisfying, whether its drawbacks create interesting choices, and whether a losing player still has worthwhile decisions.

Bot simulations can expose regressions and estimate scale. They should not be treated as a substitute for human balance testing or used alone to set target win rates.

## First candidates for numerical tests

### 1. Barbarian hunting pays too much recurring income

**Current effects**

- **War Chief** (`governments.warChief`): +3 authority, +4 combat strength, and +5 science and +5 culture per kill for each slotted Order. Five occupied slots mean 25 science and 25 culture per kill, before other applicable riders.
- **The Ballad-Weavers** (`orders.theBalladWeavers`): +2 culture per turn for each barbarian killed while the Order is slotted. Ten qualifying kills support 20 culture per turn while it remains active.
- **The Last Hunt** (`orders.theLastHunt`): +4 science and +4 culture per turn for each camp cleared this game. Five cleared camps support 20 of each per turn, including camps cleared before obtaining the Order.

**Concern:** an army earns the science and culture that strengthen that same army, while early access to camps becomes a lasting economic advantage. A late Last Hunt draw also rewards past actions without requiring a new commitment. These effects are not unconditional permanent legacies: the Orders must be active to pay.

**Initial tests:** War Chief 5 → **2** of each yield per slotted Order; Ballad-Weavers 2 → **1** culture per qualifying kill; Last Hunt 4 → **2** science and culture per cleared camp. Test individually before combining the reductions.

**Measure:** total combat-derived science/culture, their share of empire income, draft and technology timing, and dependence on camp proximity. Keep the barbarian-economy identity viable rather than making hunting merely a cleanup chore.

### 2. The Wandering Court removes too much of its expansion constraint

**Current:** `doctrines.theWanderingCourt` gives every noncapital city +3 food, production, science, culture and faith, plus +3 happiness. The capital loses 15% of every yield.

Five noncapital cities therefore gain 15 of each of those five yields and 15 happiness before applicable modifiers. The reward scales with city count; the drawback is concentrated in one city.

**Initial test:** reduce happiness from +3 to **+1 per noncapital city**, retaining the yield package. This preserves the dramatic economic transformation while keeping population support relevant. Authority and settlement costs still matter and must be included in the comparison.

**Measure:** value of the next settlement, happiness before/after adoption, and performance at 2, 4 and 8 noncapital cities. Avoid simultaneously cutting its yields unless the happiness change is insufficient.

### 3. Murasaki Shikibu makes soldiers unusually productive culture infrastructure

**Current:** `people.murasakiShikibu` grants +10 culture per qualifying melee unit in the field, without a printed cap. Twelve units produce 120 culture per turn before other applicable effects.

**Concern:** the payoff can justify maintaining soldiers primarily as culture generators, even without using them in war. This is a permanent legacy, not an Order competing for a chair.

**Initial test:** +10 → **+3 culture per melee unit**. A separate design alternative is paying for garrisons, making the placement of those units matter; do not combine that redesign with the numerical test initially.

**Measure:** income net of military upkeep and recruitment cost, comparison with other artist legacies, and whether the optimal response is to manufacture idle cheap units.

### 4. Hemiunu's legacy has an unattractive comparison

**Current:** Hemiunu (`people.hemiunu`, age III) gives +10% wonder production and −2 happiness in each city while it builds a wonder. Imhotep (`people.imhotep`, age II) gives +10% wonder production without that penalty.

Their families and acts differ, so one whole person is not strictly dominated by the other. The legacy comparison nevertheless makes Hemiunu's supposedly defining benefit look weak.

**Initial test:** raise Hemiunu to **+25% wonder production**, retaining the happiness penalty. This makes the sacrifice purposeful. Check against other wonder bonuses and actual production savings rather than summing displayed percentages as if they all used the same formula.

### 5. Oracle of the Crossroads needs a stronger active-exploration reward

**Current:** `beliefs.oracleOfTheCrossroads` gives +3 faith per discovery covered by its rider and +1 scout sight; its player-facing text describes ruins. Keeper of the Calendar supplies recurring ruin offers every 10 turns and an age-scaled discovery reward rider.

**Concern:** Oracle's small lump is difficult to justify beside an alternative that produces discoveries without requiring the player to reach them. Sight has independent value, so this is not a claim of strict dominance.

**Initial test:** +3 → **+15 faith per ruin/discovery**, retaining sight. Confirm the intended discovery scope when changing the row so the text and behavior agree.

**Measure:** discoveries still available when the belief is acquired, early faith-ladder acceleration, and outcomes on crowded versus open starts.

## Larger comparisons and possible redesigns

### 6. Differentiate the faith-to-culture engines

**Current:** The Great Litany (`doctrines.greatLitany`), Lamplighters (`orders.lamplighters`) and Reliquaries (`enhancerBeliefs.reliquaries`) each pay 1 culture per 3 qualifying faith per turn. Together, 90 qualifying faith produces another 90 culture before other applicable effects. The Tithe (`doctrines.theTithe`) adds 1 gold per faith, without consuming the faith.

**Concern:** assembling several pieces should be powerful, but three identical conversions offer little variation in decisions. Faith can support several currencies while remaining available for its own purchases. This is stacked income, not a demonstrated infinite feedback loop; the evaluator uses bounded rate readings.

**Suggested sequence:**

1. Keep The Great Litany as the simple faith-to-culture foundation.
2. Test The Tithe at **1 gold per 2 faith**, rather than 1:1.
3. Consider redesigning Reliquaries to reward **relics or holy sites**, requiring a specific investment on the map. Check relic availability before choosing that direction: it could move the payoff substantially later.

Do not weaken all faith conversion and building multipliers in the same batch. Measure the actual probability of assembling this combination, acquisition costs, foregone doctrines/beliefs, and the value of the wildcard chair.

### 7. Rebalance great-person acts against works

**Current:** scholar and artist acts pay eight turns of the empire's qualifying science or culture rate. An Academy or Landmark supplies +3 base science or culture per turn. Both spending choices grant the person's legacy.

At 100 qualifying science per turn, a scholar act pays 800 science. An Academy's unmodified +3 contribution would take about **267 turns** to equal that lump. This deliberately incomplete example excludes work synergies, yield modifiers, resource access, displacement of another improvement, citizen allocation and the earlier research enabled by the act.

**Concern:** a supposed long-term versus short-term decision can become an automatic act, except in a heavily specialized work build. The act and work also scale on different axes: empire income versus a single worked tile.

**Investigation:** compare the marginal net income of a work against the act on actual early/middle/late saves, including the remaining match length. A useful initial design target is repayment in roughly **30–50 turns in a suitable early/midgame city**, not a universal guarantee. Late acts being preferable is reasonable.

**Possible changes:** age-scaled work yields or a meaningful city benefit attached to the work. Check whether those changes are sufficient before reducing act payouts. Also compare engineer and merchant acts, whose flat payouts scale with age and researched technologies rather than empire yield.

### 8. Pytheas should reduce trade losses without removing trade conflict

**Current:** `people.pytheas` gives traders +1 sight and makes the empire's trade units unattackable/unplunderable.

**Concern:** this removes a significant response to a successful trade economy and devalues escorts and control of trade corridors. Its strategic effect is much larger than a modest yield increase.

**Design alternative:** a plundered caravan survives and returns to its origin, but its route is interrupted and the attacker still receives a reward. The merchant preserves capital investment while route placement and military protection remain relevant.

This requires a mechanics change, not just a JSON number. Define restart costs and interruption duration so recovery does not become effectively identical to immunity.

## Additional candidates from this review

### 9. Buff weak early choices before adding more Orders

**Weights & Measures** gives only +1 gold per city and occupies an economic chair. Its simplicity is useful, but its opportunity cost may make it a frequent automatic pass.

**Candidate test:** **+2 gold per city**, compared against same-pool economic alternatives such as Silk Roads and The Tax Farm. Record use in small and wide empires; do not assume all currencies have equal value or that differing rarities should have identical power.

At the opposite end, **The Founding Oath** can give the capital +3 in each of six yields after three buildings. It is rare, but rarity does not by itself balance the opening advantage of drawing it early. Compare identical openings with and without it, especially faith/culture milestone timing. If the gap is excessive, test a **two-building cap** before redesigning it. These are investigation candidates, not established balance defects.

### 10. Prefer temporary suspension to permanently losing Hypatia's legacy

**Current:** the great person Hypatia's +10% empire science is lost the first turn happiness becomes negative. This refers to the great-person legacy, not the leader of the same name.

**Concern:** one temporary happiness dip can permanently erase a scarce draft reward. This may promote avoiding reasonable risks or reloading, rather than offering an interesting ongoing tradeoff.

**Design alternative:** the legacy **stops paying while happiness is negative and resumes when happiness recovers**. Keep the condition conspicuous in previews. This is primarily a decision-quality recommendation; compare its strength against unconditional science legacies afterward.

### 11. Test The Merchant Scholars for excessive scaling with empire size

**Current:** +2% science and culture in every city per trade route. Ten routes grant +20% empire-wide; twenty grant +40%. Larger empires can grow both their route count and the underlying yields being multiplied.

**Concern:** a trading identity can turn into a broad reward for already having a large empire, especially when route-slot and route-income bonuses are also stacked.

**Measure first:** total marginal science/culture from one additional route across tall and wide saves. If excessive, compare a **30–40% cap** with a redesign that rewards the cities actually participating in trade. The latter has more geographic character but may also restrict intended wide commerce.

### 12. Audit rewards for potentially perverse incentives

These are **test cases, not confirmed exploits**. Check the implementation and existing safeguards before proposing fixes.

| Ability | Behavior to test | Desired property |
|---|---|---|
| The Widow's Levy: +10 production and +40 gold on a unit's death | Deliberately losing cheap or free units; combinations with other loss rewards | Cushions military losses without making intentional sacrifice a reliable economic engine |
| The Casus Belli: strength and production for 10 turns after declaring war | Declaring on harmless opponents, overlapping declarations, repeated declarations after truces | Rewards committing to conflict rather than maintaining bonuses through diplomatic bookkeeping |
| The King's Road: entering a friendly city restores movement | Repeated exits/reentries, routes between nearby cities, and interactions with post-kill movement | Supports long marches without bypassing intended movement limits through repeated refreshes |

Even if repeated movement restoration is intentional, document its interaction with attacks and retreat so players can anticipate it. Do not call these bugs solely from their text.

### 13. Compare faith-house value at equal investment

Mosque, Wat, Gurdwara and Dar-e Mehr currently share their base size/column and faith-purchase structure. Their identities are promising: expansion, population support, food/science and faith specialization.

**Dar-e Mehr** (+2 faith, +10% city faith) deserves a break-even comparison against **Gurdwara** (+3 food, +3 faith, +2 science). A percentage payoff can be excellent in a mature holy city and poor when first available. Test at several city faith rates, including conversions and building amplifiers. If it remains unattractive in its intended niche, improve the faith percentage or lower its price rather than making every faith house grant the same mixed yields.

## Preserve these directions

- **Hill Forts:** terrain changes settlement and military decisions.
- **River Kings:** a strong geographic preference with an explicit downside.
- **Li Bing:** freshwater farms and Aqueducts form a legible infrastructure combination.
- **Distinct faith houses:** faith solves different economic constraints depending on the choice.
- **Powerful specialized combinations:** preserve the reward for assembling them; prefer meaningful conditions and opportunity costs to making every card equally generic.

## Suggested sequence and evidence

1. **Small numerical comparisons:** barbarian rewards, Wandering Court happiness, Murasaki, Hemiunu and Oracle. Change one factor at a time, then test the combined candidate set.
2. **Economic comparisons:** acts versus works, faith conversions, and trade scaling. Use actual game snapshots so marginal effects include existing bonuses and displaced alternatives.
3. **Mechanics proposals:** Pytheas recovery and Hypatia suspension. Review their behavior explicitly before implementation.
4. **Interaction audit:** death rewards, war declarations and movement refreshes. Establish whether a problem exists before prescribing a restriction.

For each test, record seed, map size, leader, turn/age, city/population count, relevant cards/beliefs/legacies, acquisition timing, and the version of the rules. Compare both immediate impact and the next 20–40 turns. Include early/late access and favorable/unfavorable geography; do not judge a synergy only in its perfect setup.

Useful outcomes include draft/technology timing, net income by source, expansion affordability, work payback, remaining counterplay, and when the winner begins to feel inevitable. Keep a short human note alongside the numbers: **did this change create a better decision?**

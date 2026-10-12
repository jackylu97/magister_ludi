# Balance pass summary (2026-10-06)

Four reviewers read all six decks, each through one lens: power (`power.md`), how the cards connect (`systems.md`), currencies (`economy.md`) and whether each deck is rewarding to play (`experience.md`). Their recommendations, about 130 rows in all, were merged into one apply list. Card-level fixes are applied on the sheets, each marked "Balance pass:" in the card's last column. This page lists what was **not** applied: rule changes, reversals of the user's own edits, and low-confidence suggestions.

## Decisions for the user

### Rules that change how the game works

1. **Cap stacked purchase discounts.** *All four reviewers found this; it affects the game as it plays today.* Card and building discounts on one purchase are added together and the price is only stopped at zero (`applyRiders`, `src/sim/purchase.ts`). Frontier Investment, Private Patronage and The Customs Houses bring an ordinary building to 5% of its price; with The Tithe, a faith building is free; with Letters of Marque, a ship is free. **Proposal:** discounts on one purchase total at most −50%. The tile price already refuses to reach zero for the same reason. (The apply pass also cut Frontier Investment's discount from 50% to 25%, which helps but does not fix the stacking.)
fix: modify bonuses to +25% of the yield instead of a discount on the total cost.

2. **A discount names its currency.** Card discounts apply to gold and faith alike today. Once The Lay Brothers lets faith buy every building, Commerce's gold discounts would cut Devotion's faith prices. **Proposal:** a discount applies only to the currency its card text names.
approve, only the currency specifically named

3. **One price for faith.** Faith is worth 1 gold when buying tiles, 1.33 for great people, 1.5 for science, 4 for buildings and units, and 6 for rerolls. The rules file contradicts itself (the purchase table says 1 faith = 4 gold; the score weights say 1 faith = 1 gold). **Proposal:** decide what 1 faith is worth in gold, record it in `data/rules.json`, and price every faith purchase from it. The reviewers lean to faith buying production at half gold's rate (2 faith per hammer, not 1), but the number depends on how much faith a Devotion seat actually earns. The Lay Brothers and Consecrated Ground carry a "price follows the faith ruling" note until then.
confirmed, 2 faith per hammer. keep the faith cost of rerolls the same, the instances where gold can be used for rerolls should increase commensurately with this determination.

4. **Cap card bonuses toward the Magnum Opus at +60%** (lump payments excluded). Scientific · Magisterial stacks to about +135%, while Expansionist pairs have none that work today, so the pair would decide the winner.
no cap, this seems like a fun way to play the game.

5. **Progress belongs to the card, not the chair.** Adopting a government unseats every card and wipes commission progress and counters such as The Critics' Circle's. **Proposal:** the count stays with the card through unseating and adoption; only events while seated still count.
yes, adopting a new government should no longer unseat every card, the count should stay with the card through unseating and events only count while seated.

6. **Commissions must stay reachable.** A design test for every commission: the seat's own actions can always still complete it. A race may pay more for winning, but losing the race shrinks the reward rather than killing the card. (The apply pass already fixed the commissions that failed this.)
Commissions should not be a race in general, these should be tied/visible only the seat that drafted them.

7. **Citizens that count as growth.** Only a citizen gained by filling the food basket counts as growing. Citizens from levies, migration, retired units, faith or founding do not. Without this, the levy cards have no brake.
approved

8. **Cards that enter your collection other than by drafting.** Two reviewers disagree:
   - **Systems:** any card that enters your collection counts as drafted. It fires its on-draft boon, and a charter grants its technology.
   - **Economy:** on-draft boons fire only when the card is taken from a hand, so The Archive and The Cabinet of Curiosities can't fire boons repeatedly.
   
   The second is safer. Charters would need their own sentence either way.

keep the first. in what instance would this be unsafe?

9. **Charters count as Orders held** (unseated, still no chair). This lets Magisterial's collection cards read them, and would make Scientific · Magisterial work both ways. Today only Magisterial reads Scientific.

yes, charters and commissions count as orders held. All cards drafted should remain in the player's card pool and read as a drafted card (unseated). there should be something in the UX indicating charters are active even while unseated though, defer for later what that should look like.

10. **The charter premium in data.** Charter technologies are meant to cost more research, but no figure exists. **Proposal:** a charter technology costs its column's price × 1.5, as one number in `data/rules.json`.

approved.

11. **Charters guarantee what they open.** Two reviewers want this:
    - **After research:** once a charter technology is researched, the next Scientific card dealt comes from the cards it opens. Today the player pays a pick and extra research, then may not see the reward for many hands.
    - **Before research (medium confidence):** the first Tier I hand's Scientific card is a charter. About half of Scientific seats see no charter in their first five Tier I hands.

I don't understand what you're saying here. The bonus from the charter is access to the technology. Once that technology is researched, you gain access to the benefits of that technology. The bonus should be guaranteed assuming you've researched the technology.

12. **The draft meter against eleven chairs.** Filling eleven chairs costs 981 culture against 579 for nine. **Proposal:** check in the arena whether chairs sit empty, and if so flatten `costExponent` (2.2).

why does the draft meter matter depend on the number of chairs? Is chairs the number of players in the game?

13. **How the third card in a hand is chosen.**
    - **Medium confidence:** the shared-card position deals from the seat's own pair's shared cards first. Today a seat sees its own pair's shared cards about once a game.
    - **Low confidence:** change the order of the third card from common, shared, common, single deck to shared, common, shared, single deck.

let's simplify: One large pool the cards are drafted from, the pool contains common cards and all cards from either deck (shared, single deck). i.e. a commerce/devotion leader can see commerce+magisterial shard cards (because they have access to commercial)
14. **Every pair keeps a shared card at Tier I or earlier.** Magisterial's pairs with Dominion and Commerce have none, so they don't show until Tier II or III. This affects the pending one-sided cuts of Garden Cities, Illuminated Treatises and Hydraulic Schools.

approved, lets add those

15. **Show counts and maturity.** When a tile or building crosses a card's age threshold, the game announces it, and every card that counts something shows its current count on its face. Nine maturity cards and the counting cards pay silently today.

Yup, these should show in the UX.

### Reversals of the user's own edits (all three reviewers that looked agreed)

16. **The Money Lenders:** add a cap, about +30 to +40 gold a turn. You removed the cap. Uncapped, 2% interest compounds while idle, and The Strongroom then turns the hoard into culture without limit.
17. **The Strongroom:** cap its culture reward. The suggestions are 400 flat, or a fifth of the treasury up to 600. This goes with item 16.
18. **Travellers' Letters:** common → uncommon. On a crowded map it is the strongest Tier 0 common in the game.
19. **Financed Industry:** −3 food → −1 food. At −3 the rare is a trap until late in the game.
20. **Merchant Scholars:** narrow it to Academies, so it reads Scientific's own family. It is already on the shared "rule on" lists.

### Data fixes (not design)

21. **Private Patronage reaches wonders** bought through The Gilded Scaffold, against its own text. Wonder rows lack the marker its exclusion reads.
22. **The Endowment's tier and rarity** on the sheet (Tier II common) disagreed with the data (Tier III uncommon). The apply pass moved the sheet back to Tier III uncommon.

### Low-confidence suggestions not applied

- **Commission culture rewards:** write them as a share of the next hand's cost, not flat figures.
- **The Common card "+1 faith per card seated":** cap it at +5, or move it to Devotion.
- **The Last Stand:** a new common card that helps a seat that has lost towns.
- **Two Scientific rarity changes:** Enduring Institutions to common, and Discoveries through Scholars to uncommon.
- **The Surveyors' Charter:** move it to Tier 0.
- **Commission: Open the Road:** a new Commerce goal card at Tier I.
- **The Old Gods Remain:** open a belief offer at once.
- **The Repertory:** add capital culture.
- **The Second Reading:** let it work without a chair.
- **The Performers' Treasury:** pay 40% instead of 20%.
- **The Muster of the Fields:** add a food cost.

## Corrections found along the way

- **The draft's rarity odds are 60 / 30 / 10** (`data/statecraft.json` `rarityOdds`): a hand rolls rarity first, then picks evenly within it. CLAUDE.md and the docblock in `src/sim/statecraft/draft.ts` still describe the old 4 / 2 / 1 weights. A rarity with only one card in a tier gets that whole share; Drill Manuals, Dominion's lone Tier 0 uncommon, was dealt 30% of the time. The apply pass made it common.
- **A hand is one card from each of the seat's decks plus a third**, not three cards from a combined pool. The third card comes from the common pool on half of all hands.

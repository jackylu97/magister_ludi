# Changes after the first deck playtest

The playtest (2026-10-13, Dominion + Expansionist under Mithridates) found the midgame flat and the cards short of synergy. The evidence is `docs/plans/card-measurements-2026-10-13.md` (bot games) and `docs/plans/card-synergy-research.md` (other games). The rulings it rests on are in `docs/decks/deck-design.md`: "Card design principles", the levies-and-tended-works note, and "Dominion is the tempo deck". Nothing below is built yet; open numbers are marked for the user.

## A. The draft (all decks)
1. **A chair step in the midgame.** Chairs are 3 / 5 / 8 / 11 at drafts 0 / 4 / 18 / 29, so a seat sits at 5 chairs from about turn 30 to turn 115. *Held off by the user, 2026-10-13.*
2. **Midgame hands come from the midgame.** *Ruled 2026-10-13, stronger than proposed:* hands are dealt only from the current band, and earlier bands leave the draw when a new one opens (`docs/decks/deck-design.md`, "Only the current band is dealt").
3. **Later cards beat earlier ones.** Size midgame cards so that seating one is an upgrade: today a newly seated card pays less than the cards already seated (2.9% of the seat's yield against 4.0%).
   - **The buff pass (ruled 2026-10-13, numbers chosen from the measurements).** Per seated card, band 0 pays 3.4% of the seat's yield, band 1 2.8%, band 2 3.0%, band 3 1.5%. Every live card in bands 1, 2 and 3 has its yield amounts multiplied by 1.5:
     - What counts: the yield figures a card pays (flat, per-count, share and rate amounts on `pays`), yield percentages, production percentages toward a build, and one-off yield grants (lumps, windfall riders, kill or capture pay).
     - What does not: combat strength, movement, unit stats, happiness, authority, renown, rules, costs in charges, durations, thresholds and conditions.
     - Rounding: each figure is multiplied by 1.5 and rounded up to a whole number (1 becomes 2, 2 becomes 3, 5 becomes 8, 10% becomes 15%). A per-count divisor ("per 2 citizens") stays as it is; the amount paid changes.
     - Left alone: band 0 and band 4, retired and deferred rows, and the cards the bots measured at twice their band's mean pay or more: The Hard Country, Ore Caravans, The Artisan Wages, Frontier Investment, Venture Routes, The Factors' Houses (band 1); Marcher Lords, The Exchange, The Highlands, The Scholars' Roads (band 2); The National Galleries, The Civic Pantheon (band 3).
     - Band 3's measured figure is low partly because many of its cards are percentages and rules a per-turn reading underrates, so it gets the same 1.5 and not more.
4. *Later:* Doctrines and government effects need a rework (the user, 2026-10-13); not part of this pass.

## B. Card writing (all decks)
1. New cards follow the principles: one effect, general stats and keywords, about three lines.
2. A cleanup pass on existing cards: split or trim the two-effect cards (about half of Dominion and Expansionist) and the conditions that need two narrow facts at once (about a fifth).
3. More cards that read levies, tended works, commissions and charters, so each becomes a keyword many cards share.

## C. Dominion: tempo
1. **Economy cards that pay any yield, up front:** lumps on general moments (adopting a government, finishing a building, a town reaching a size, a war starting or ending), short timed bursts, early flats that fade by era, cheaper or faster production. No pay that grows with army size.
2. **Rework the flat civic riders on military buildings** into tempo (faster training, a production refund, a burst on completion) or cut them.
3. **Fewer dead hands at peace:** combat-only and war-only cards are 69% of offered Dominion cards at band 0 and 56% at band 1. Shift the early bands toward the tempo economy.
4. Size the lumps to register: one-off grants are 0.39 yield per seat per turn today.
5. Science and culture from fighting (kills, captures, generals) stay.

## D. Expansionist: scaling in the midgame
1. Pay-offs on its own currency in Tiers I–III, not only Tier IV: per citizen, when a town grows, when a citizen is spent, per hex owned, per improvement worked.
2. Long-term scaling belongs here and in the other non-Dominion decks.

## E. Bugs to check
Checked 2026-10-13: neither card has a rules bug. Both pay, and `explainCardImpact` sees it, once their conditions are met. The bots never meet them.
- **The Tithe** paid nothing over 27 samples. Bots rarely build temples: in a 200-turn bot game, 60 towns held 8 shrines and 1 temple. The bot seats the card on the promise of a temple its build plan never raises (`scopePromisesABuilding` in `src/ai/value.ts`).
- **Established Routes** paid nothing over 30 samples. The bot never turns on a caravan's renewal (`setAutoResend`), so its routes end after one term (about 20 turns) and never reach 30. The bot's route valuation also ignores `standingTurns`, so it seats a card it cannot trigger. Possible fixes, not applied: a bot housekeeping arm that renews routes, or pricing a `standingTurns` share at zero while no route renews. Even when it qualifies the card is weak, since a 50% share of a 1-point route yield floors to 0.

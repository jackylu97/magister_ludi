# Wonders implementation review, 2026-11-19

The [approved build list](wonders-review-2026-11-18.md#ready-for-the-build) leaves 34 wonders. It adds eight, changes eighteen and retires the Water Clock of Su Song. Six existing wonders move to another technology. This is a review of the build against the code at `e3d89148`. The handoff confirms the name **The Great Sphinx**.

## Rules that affect the build

- **The Library of Ashurbanipal.** Pay 10 scholar renown each turn, plus 5 per captured city. A captured city with a wonder pays 20 total. Two ordinary captured cities and one captured wonder city give 40, including the base 10. A scoped `renown` effect already supports a family. Add 5 for each captured city and 15 more for each captured city with a wonder. Use the city scope `hasWonder`. The `wonderTown` test is for hexes. The current `captured` scope also admits a town received by treaty, since `handOverCity` sets the same flag. I would use the game's existing meaning of “captured city you hold”, as in the later ruling. Excluding treaty transfers would require another fact about the change of owner.
- **The Great Wall.** The user accepted the answer to question 11. Check enemy territory when a unit starts its turn. Reduce that turn's allowance by one, with a minimum of one. Crossing the border during a move does not change the allowance for that turn. Cover the next turn in a path forecast, and check later refills such as The King's Road. Use the tile owner field once per reset. This replaces the old border zone of control.
- **The Circus Maximus.** The user accepted the answer to question 14. Keep its four happiness and count military buildings excluding wonders. The current category count includes four military wonders. Add the exclusion on this effect's count. Do not change the default for Orders that use the same count. The Great Sphinx and Notre-Dame can count wonders that supply faith under their separate rule.
- **The Walls of Uruk and the Temple of Thoth.** One-of-a-kind buildings supply effects to their owner. Omitting the city scope would give the bonus to every owned city. Use `hasBuilding` for the city that holds each wonder. Test a second city and capture of the wonder city. The Great Wall's defence and health bonuses do apply to all owned cities.
- **The Great Library and the Alhambra.** The build list specifies the existing family-specific great-person grant. Today it opens a choice of scholars or generals. If a choice already waits, or the family has no names, the completion grant reports failure. The generic Orders use `grantGreatPersonOffer`, which can bank renown at the current threshold. That fallback does not guarantee that the next person comes from the promised family. Use the existing family-specific choice when available. Before building the fallback, decide whether a waiting award must preserve its family. This affects what the completion report promises.
- **The Great Library's Academies.** The yield count `greatPeopleGained` already accepts `family: scholar` and reads the recruitment total. Spending a scholar or losing a legacy must leave the count intact. The combat count uses a different record.
- **The Oracle.** Its completion renown still needs a family on the building row. Set the row's per-turn amount to zero and use a separate family-free `renown` effect for the three per turn.

## Work by wonder

The columns show the rules that change and the code that needs attention. The approved build list carries the base yields, renown, site rules and full list of removals.

| Wonder | Change and implementation |
|---|---|
| Great Sphinx | Use the existing count of faith-supplying buildings for culture. Add five free draft rerolls as a one-time completion grant. Belief hands have a separate price and already offer a free redraw. Spend that first. Check the stock at validation and payment for Order, Doctrine, belief and great-person offers. A stock use must leave the next paid price intact. |
| Temple of Thoth | Pay half the wonder city's faith as science through the existing city share. Require fresh water. |
| Pyramid of the Sun | Add the faith choice to the levy in the wonder city. Price it at five times population before spending the citizen. Use the existing levy wait and minimum population. Show the payment in the menu and report. Use the existing hex effect for Holy Site culture. |
| Solomon's Temple | Use the great-person offer rider for one more choice, and the existing renown cost reduction. Check both the shown price and the offer width. |
| Iron Pillar | Use the existing percentage on the yields of production buildings, plus a hex payment for strategic resources. |
| Library of Ashurbanipal | Use the base renown and scoped scholar payments above. Verify the 40-renown example. |
| Weiyang Palace | Use capital-scoped building production and a capital culture payment that counts its buildings. |
| Great Stelae of Aksum | Pay culture and faith through the existing route yield. Include domestic routes. |
| Temple of Artemis | Put the flat happiness on the building. Remove its improved bonus-resource happiness. |
| Great Lighthouse | Apply combat and movement effects to ships. Remove the embarked movement, city sight and route slot. |
| Oracle | Keep its completion renown and pay three family-free renown each turn. Remove the old city faith. |
| Pyramids | Give every city the wonder production bonus. Remove the building's old base production. |
| Walls of Uruk | Scope the defence to its own city. Apply the combat bonus on both attack and defence in the owner's territory. |
| Great Ziggurat | Pay science in cities with a Shrine. Add the rite discount in the wonder city. Pass the city to the price used for payment, affordability, previews and bot decisions. Check empire-wide rites at the point where the city is known. |
| Mausoleum | Double all six great-work improvements after the other hex bonuses, before city and empire percentages. Add a labelled line equal to the preceding hex total. The new engineer renown fits the building row. |
| Statue of Zeus | Use the flat combat bonus against cities. Resolve the three free melee placements in sequence and report each outcome. If a hex has filled, the next unit checks the board again. |
| Petra | Apply desert food and production and floodplain gold to worked tiles across the empire. Keep the desert site rule. |
| Angkor Wat | Add faith to improved resources and Holy Sites in every city. Remove the old worked-hex payment and land price discount. |
| Great Library | Set the base science, count recruited scholars for Academy science, and grant a choice of scholars on completion. Remove the free technology. |
| Forbidden City | Remove its base culture. Keep the Wildcard chair and authority. |
| Great Wall | Give every city five defence and 25 maximum health. Extend the maximum-health calculation, then test current health after capture or loss. Apply the start-of-turn movement rule above. |
| Chichen Itza | Give cities with an active rite happiness and a culture percentage. Remove the flat happiness. |
| Circus Maximus | Use a military-building count with the exclusion above. The happiness ledger reads this payment in `cardHappiness`. |
| Machu Picchu | Add two trade routes. Pay gold for each adjacent mountain on tiles worked by any owned city. |
| Notre-Dame | Count faith-supplying buildings for happiness. Remove the old Temple count and the separate Cathedral payment. |
| Alhambra | Set the base culture, grant a choice of generals and append a Military chair. Today's added chairs are Wildcard. Check council layout, legal cards, adoption, capture and loss. Existing chairs keep their positions. |

## Technology moves

| Wonder | Current technology | New technology ID |
|---|---|---|
| Statue of Zeus | Iron Working | `bronzePanoply` |
| Petra | Mathematics | `irrigation` |
| Chichen Itza | Theology | `horology` |
| Great Mosque of Djenné | Theology | `artisanry` |
| Angkor Wat | Theology | `stateWorkforce` |
| Great Wall | Satrapies | `theExaminationHall` |

Move each unlock at both ends. Remove the Water Clock from the Horology unlocks and retain its retired row. Check the resulting columns and costs through the production cost reader. A wonder carries a size and takes its cost from its unlocking technology.

## Work shared with generic Orders

1. Build The Gilded Country and the Mausoleum against the same hex-yield sequence. The Order checks gold supplied by earlier lines and adds one. The wonder doubles the resulting great-work yield. Test a tile that gets its first gold from another card, plus a tile with a hidden resource.
2. Test the Statue of Zeus and The General Summons against the same unit placement rules. One triggers on building completion in its city. The other triggers on draft in the capital. Test a full ring and a ring with space for only some of the units.
3. Keep The Builders' Lodge and the Iron Pillar on their respective sources. One amplifies card payments from buildings. The other increases the yields of production buildings. Check their overlap. The Weiyang Palace, Pyramids, The Capital's Example and The Old Patterns also share the production evaluator.
4. Coordinate great-person grant work with The Office of Works. Share tests for a waiting offer and a spent family. The Summer Palace only raises card payments directed to the capital. Cover a wonder in the capital when testing attribution.
5. Start the data-only wonder rows, technology moves and their tests together. Develop the reroll stock, faith levy, rite price, Great Wall allowance and typed chair in separate batches. Coordinate the menu and chair display with Claude. Check bot valuation and use for each new rule. Recompute the bot digest pins on the combined tree when it is ready to land.

The approved figures for Ashurbanipal and Machu Picchu remain playtest questions. This review makes no change to their values.

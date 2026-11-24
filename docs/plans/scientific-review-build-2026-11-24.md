# Scientific review implementation, 2026-11-24

Sources: `deck-review-scientific-2026-11-23.md`, `scientific-second-pass-2026-11-24.md`, and the Scientific/shared/base-rule rows in `card-changes-for-astra-2026-11-24.md`. The user comments override the earlier proposals.

## Implemented rules

- Every charter technology costs half its column price. Other research discounts apply to that baseline. The cost breakdown shows both lines. This includes Liturgy.
- The Military Engineers' Charter, The Physicians' Charter and The Forward Plans leave the draft pools. Their rows remain for saves. Their existing technologies and buildings remain for a player who already holds them.
- The Schoolmen's Charter moves to Tier II. Scholasticism moves to Age II, follows Epic Poetry, and keeps its lane. Its base column price is 190; charter research costs 95 before other modifiers. Epic Poetry is the earlier node on the same path that leaves room for the charter inside Age II.
- The Great Archive, Chemistry's Grenadier trait and The Great Catalogue count held charter Orders from every deck. The charter's technology need not be researched. The Great Catalogue has no cap.
- Astronomical Diaries starts at two science and two culture in the capital. Each new city size above eight adds one of each. A grant that passes several new sizes counts each qualifying size. Regrowth below the previous record does not count. Only a seated card gains progress.
- Reading Rooms gives one happiness for every five citizens in each Library town. Towns are counted separately.
- Garden of Epicurus removes the positive happiness cap. It uses the first positive happiness rung, currently ten percent for each five spare happiness. Fixed tier increases apply next; The Good Years then doubles that bonus. Negative happiness is unchanged.
- Hippodamian Plan reduces happiness demand by thirty percent in towns with at least ten citizens. Founded towns cost one more authority. Captured towns do not pay the extra authority.
- Round City has no population cap. Queen of Cities gives fifty percent more food and production at fifteen citizens.
- Armoury Patterns becomes Civic. A kill against a real empire with fewer known technologies grants science equal to twice the killed unit's strength. Equal or greater research, missing opponent information and barbarians do not qualify. Combat supplies the opponent for attack kills and counterattack kills.
- Royal Academies becomes rare. Barber-Surgeons becomes uncommon and stays in the pool.

## Bot valuation

- Charter research reads the same discounted cost breakdown as the player.
- The held-charter count uses the existing charter-draft forecast, including Chemistry's strength and Catalogue's production.
- The Diaries forecast estimates each city's growth using its current surplus and future size costs. It counts only new records above eight.
- Armoury Patterns uses the existing kill rate and the share of known rivals with fewer technologies.
- Garden's current benefit comes from the existing yield snapshot. Its future benefit uses the same fallback as the existing uncapped-authority card.

## Cross-checks

- Royal Academies counts physical empire-building copies. A Second Seat copy counts.
- Cathedral School already doubles its science-per-faith-building line while its town keeps a rite. This implementation preserves that rule. Its shared charter text needs to print that existing clause.
- The Academy multiplier order is unchanged here. The Magisterial implementation owns the new Mausoleum and its combined multiplier check.
- Hanlin Academy's shared-deck move belongs to the Magisterial implementation.
- Countermarch, Licence to Teach and Learned Leisure are not added.

## Verification

Focused boundary cases were added, and changed descriptions, deck sheets, charter pricing and placement fixtures were updated. No tests, typecheck, simulations or builds were run in this worktree, as requested. The coordinator runs the combined checks after integration.

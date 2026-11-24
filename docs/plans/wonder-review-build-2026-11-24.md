# Approved wonder review build

Source work is complete. Tests have not run. The orchestrator runs the combined checks after integration.

## Implemented

- Mausoleum doubles improvement yields and their technology renewals. Terrain, resources, card bonuses and Spirit Way proxy works do not receive that share.
- Library of Ashurbanipal gives science to Library cities and finishes current research on capture. Its recurring scholar renown stays.
- Pyramids gives production in its city per held wonder. The wonder production bonus stays; worker charges go.
- Terracotta Army copies newly gained units in its city. Production, purchase, levy, ordinary grants, building gifts, traders and recruited great people use the same completion path. Copies are free units, keep named-person identity, and pay ordinary unit-gained rewards. A delivery-only flag prevents recursive copies. Ruin escorts appear at the ruin and are not city-created units.
- Solomon's Temple gives recurring renown instead of a recruitment-price discount. Its extra offer choice stays.
- Walls of Uruk gives a Palisade on completion and pays Palisade cities. Authority capacity stays.
- Great Wall pays garrisoned cities and keeps the enemy-movement reduction.
- Notre-Dame moves to Castellany. Machu Picchu moves to Daughter Cities and gives more gold per adjacent mountain. Both use normal column-derived costs.
- Pyramid of the Sun pays faith, science and renown from population before its levy. The menu, command and bot use the same price helper. Existing cooldown and other wonder effects stay.
- Chichen Itza doubles rite duration.

## Integration and checks

- `test/sim/wonderReview.test.ts` covers the new scopes, copy recursion, multiple unit creation paths, levy banks, research completion, moved costs and current-age wonder counting.
- Existing wonder, armoury, renown, upkeep, rite and bot-value fixtures are updated. Fixtures are unexecuted.
- The trader change is a small `applyBuyRoute` block in `commands.ts`. Merge it against the newer trade implementation by routing its new trader through `realiseItem`.
- The newer Magisterial branch owns its final Spirit Way fixture expectations. Its proxy works have no improvement base, so only whole-hex percentages can raise their card bonuses.
- `git diff --check` passed. No build, typecheck, simulation or tests ran in this subagent.
- No save version, server, commit or branch merge changed here.

## Follow-up after checks

- Rebuild the generated card-text fixture in the final batch if its normal maintenance command requires it.
- Watch Machu Picchu gold on mountain-heavy maps in a later balance run. This build does not add a cap.
- The remaining smaller wonder proposals are deferred. No values were added for them.

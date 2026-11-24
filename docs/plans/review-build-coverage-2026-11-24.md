# Card review coverage, 24 November 2026

This checklist covers the settled and default rows in the card-change index, the later rulings in the build triage, and the named rows whose open number or name was resolved. It compares the combined source with the Scientific worktree for Scientific cards, shared Schoolmen content and wonders. Runtime tests and playtest results are pending.

## Resolved source findings

- **The Revised Edition, row 70.** Paid belief rerolls now receive the faith discount. The first belief redraw stays free and the gold price keeps its existing rule.
- **Aristocracy, rows 259, 369 and 390.** The government and reference table now describe its 15% increase to recurring renown.
- **The Schoolmen's Charter, rows 258, 367 and 389.** The charter now names the Cathedral School's doubled science while its town keeps a rite.

## Source checklist

| Index rows | Coverage |
|---|---|
| Magisterial 60–77 | New Orders, revised commissions, retirements, moves and retained combinations are present. The Anteroom uses unseated Orders. Hall of Heroes reads the recorded families gained. The two new growers use explicit seating and successful rerolls. |
| Dominion 100–108 | Pax Romana, Companion Cavalry, Sacred Band, Huscarls, Interior Lines and Tributary Kings have their revised effects. Drill Masters and Horde move tiers. The drill combination remains. |
| Expansionist 124–133 | Growth, road-linked population, offer bands, retirements and the retained levy and authority combinations are represented. |
| Commerce 148–167 | The revised purchases, luxuries, roads, retirements and retained combinations are represented. The five named partner cards read the union of outbound international routes and active deals. |
| Devotion 184–200 | The Patriarchate, four former rites, Bell Tower retirement, Anointing, terminology, authority removals and four card retirements are represented. See the exclusions below. |
| Scientific 222–236 | The revised cards, three new rows, charter count, charter retirements, rarity and Doctrine changes are present in the Scientific worktree. |
| Shared 256–259 | Hanlin Academy and Missi Dominici have their shared deck assignments. Schoolmen moves to Tier II and Scholasticism to Age II. |
| Beliefs 277–315 | The named changes and retirements are represented. The Hermits covers desert and tundra. Temple relics add four science and four culture each. Ecclesia applies twenty pressure within six hexes on a rite start. |
| Wonders 337–347 | The Scientific worktree contains the Mausoleum and the ten later wonder rulings. The tech unlocks put Notre-Dame at Castellany and Machu Picchu at Daughter Cities. Solomon's Temple uses the later 15% renown ruling. |
| Base rules and Compendium 366–391 | The Scientific worktree implements the new charter price rule. The trade-partner definition is in the Compendium. The ordinary renown ladder, happiness tiers and one-time grant rules remain. |

## Explicit exclusions

The proposed new effects for Second Prophet, Mission Houses and Holy Inquisition still need a ruling. State Church loses authority and keeps its existing happiness amount. Founder share remains deferred. The Great Mosque of Djenné, the other wonder cut candidates and the wider cross-deck wonder pass remain deferred. The drill loop, the spare-authority engine and Licence to Teach await playtest evidence. Wager calibration and UI work are separate from this index.

The source comparison cannot establish play frequency, balance or bot performance. Check those in the serial validation and playtest.

## Release validation exception

The user asked for an immediate release after the production build, accepted minor bugs, and waived further tests. The first core run passed the new Magisterial and Commerce regression cases but failed older fixtures and exposed integration bugs. Those bugs were repaired. A second core run was stopped at the user’s request with remaining failures in religion, Devotion, doctrine offers, Commerce bot valuation, and citizen-focus fixtures. Complete those checks in follow-up work. The slow tier was not run.

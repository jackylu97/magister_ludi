# Compendium pass, 2026-11-21

## The user's words

> "i'm noticing that we need to have way better compendium entries. None of the
> unique units have their special abilities, and every unit has a long entry
> about their auto-scout, which isnt needed at all. The descriptions are also way
> too wordy. Could you take a pass at the compendium entries, make them less
> wordy, and remove information that isn't useful, and add in things players need
> to know? Paradise gardens for example, should have an entry noting they count
> as great people."

## What changed, in short

- Each unit, building, wonder, improvement, resource, great person and leader
  entry follows one standard (below).
- A unit entry prints the row's own combat lines and effects. The new describer
  is `describeUnitRow` in `src/sim/statecraft/describers.ts`.
- The sentences that were the same on every entry of a kind are gone from the
  entries. Each is said one time on the lead page of its shelf
  (`src/ui/compendiumShelves.ts`).
- Markers that changed play and printed nothing now print one short sentence.
- Rows that nobody can get are filed under "Not in the game" and say so.
- A row's figures can be links ("Upgrades to", "Needs standing here").
- Every `kind:id` anchor is the same as before.

Files: `src/ui/compendium.ts`, `src/ui/compendiumShelves.ts`,
`src/ui/compendiumText.ts`, `src/ui/keywordCards.ts`,
`src/sim/statecraft/describers.ts`, `src/sim/statecraft.ts`.

## The audit, by kind

Word counts are for a whole entry: name, eyebrow, rows and clauses.

### Units (70 entries, 164 words each before)

- 60 entries printed the sentence about exploring on its own.
- 60 entries printed a 45-word note about the price on the roster.
- 36 entries printed two sentences about the build list after an upgrade.
- 11 entries printed two or three sentences about holding a resource copy.
- 14 ships printed two sentences that are true of every ship.
- No entry printed `UnitDef.combatLines` or `UnitDef.effects`. About 40 units
  have such lines (the Catapult's bonus against
  cities, the Pikeman's against mounted units, the Mandekalu's pillage rider,
  the Condottiere's purchase rider, the Janissary's rank).
- The Apostle and the Canoness said they carry "work charges" and build
  improvements. They do not: their charges pay for three acts.
- The Company Guard said "Bought in a city with gold. It cannot be ... bought
  with gold."
- The Prophet printed two paragraphs of about 190 words with no figure.
- The Company Guard and the Numidian Cavalry said "Unlocked by a card". The
  card has a name: a charter opens its row through `charter.unlocks`, and
  `cardThatOpens` did not read that field.
- 13 units that nobody can get were printed as ordinary entries: the Augur
  (withdrawn), three ships the tree does not reach, and nine leader units that
  no leader holds.
- The notes on unit rows are in the old voice, and some are history ("the
  cataphract that used to stand between the two is a row no node opens any
  more").

### Buildings and wonders (130 entries, 81 and 87 words before)

- The yields, the science for each citizen, the trade routes, the production
  bonus and the renown were printed two times: as rows and as describer clauses.
- All 34 wonders printed the same note ("Only one player in the game can build
  this...").
- The Town Charter said three times that it is never built or bought. The
  Magnum Opus said its world gate, its bead gate and its win three times.
- 11 buildings said "Unlocked by a card". For 3 of them the card is a charter
  with a name. For the other 8 the card is withdrawn, so nobody can get the
  building.
- The Hall of Deeds said "Unlocked from the start". It has `awaitsTech`, so
  nobody can build it.
- 13 leader buildings that no leader holds were printed as ordinary entries.
- The Relic printed "Production cost: 0".
- Silent markers: `publicWork`, `consecrated`, `faithBuysWonders`,
  `restoresMovementOn`, `queueFloor`.
- About 80 building notes are in the old voice. Most say the generated lines
  again ("What the jar keeps, the year forgets").

### Improvements (26 entries, 60 words before)

- The Paradise Garden did not say that it counts as a great person's work
  (`countsAsGreatWork`), and it did not print its happiness.
- No great person's work said what a work is.
- No entry printed `upgrades`: the yields a technology adds later (the Farm
  with Irrigation, the Academy with two technologies).
- 14 entries printed "Clears the loose plants and stones drawn on the hex".
  It is a drawing rule and changes no play.
- A row that may stand only on its own resources printed the list two times.

### Resources (45 entries, 66 words before)

- Each strategic resource printed about 100 words of notes that are the same
  on each.
- No entry said which units need the resource.
- The reveal note was on every gated resource and on the lead page.

### Technologies (63 entries, 60 words before)

- The entries are short and were not changed.
- Each charter technology printed two notes that are the same on each.
- The Technology page of Concepts said a charter technology "costs more than
  an ordinary technology". Since batch DS9 it costs the same.

### Great people (160 entries, 86 words before)

- Each entry printed a long sentence for the act and a sentence for the work
  that are the same for a whole family, with "Use it once" in most.

### Leaders (16 entries, 114 words before)

- Each entry had four heading lines and two sentences of padding. It did not
  say which decks the leader draws from, or when each unique thing opens.

### Written pages (Introduction, Concepts, lead pages)

- "The goal" said the game is won by being the last empire, and named the
  Bead Race as "the other way". The Bead Race lead page said it is "the only
  way to win". The simulation has both (`beads.ts`, `combat.ts`).
- Combat and movement had one paragraph of about 330 words. Its line about
  archers and siege engines against ships spoke of damage; the rule is a flat
  strength line now (`rules.naval.landRangedVsShipPoints`,
  `landSiegeVsShipPoints`).
- Great people and Triumphs listed prophets as a family of great people.

### Not changed

- Orders, Doctrines, beliefs, rites, malices and the wager: every clause is
  `describeCard`, which the hover cards and the card text fixture also read.
- The Orders lead page (about 1,100 words), the Faith and religion page and the
  Trade page. Tests pin many of their sentences, and test runs are paused.
- The Meters and Trade shelves.

## The standard for an entry

An entry answers four questions, in this order.

1. What it is: the name and one eyebrow line.
2. What it does: the figures as rows, then every effect of the row as a
   clause, in the words of the simulation's describers.
3. How you get it: the cost rows, then one opening line that names the
   technology, the leader or the card.
4. What it leads to: the upgrade rows and the links.

Rules:

- Facts are short labelled rows or one-sentence clauses. No paragraphs.
- A sentence that is true of every entry of a kind is not on the entry. It is
  on the lead page of the shelf, one time.
- Every figure comes from a data row or `RULES`. Every named thing is a
  keyword link.
- The rows of a kind are always in the same order.
- A row that is not in the game says so in its opening line, which is drawn as
  a band, and its page is under the last heading of the shelf.
- A flavour line prints only from `flavor` or `epigram`, with the label
  Flavour.

Target length:

| Kind | Rows | Clauses | Words |
|---|---|---|---|
| Unit | 6 to 10 | 1 to 5 | 40 to 90 |
| Building, wonder | 2 to 5 | 2 to 8 | 30 to 80 |
| Improvement | 3 to 7 | 1 to 6 | 30 to 90 |
| Resource | 3 to 8 | 0 to 4 | 20 to 70 |
| Great person | 1 | 4 to 7 | 50 to 80 |
| Leader | 0 | 8 to 12 | 70 to 110 |

Row order:

- Unit: Combat strength, Ranged strength, Movement points, Sight in hexes,
  Health, Charges, Production cost, Purchase cost, Upkeep each turn, Needs a
  copy of, Upgrades from, Upgrades to.
- Building and wonder: Production cost, Cost premium, Upkeep each turn, Can
  only be built in, Needs standing here.
- Improvement: Adds to the hex, Happiness, Defence for units on it, Work
  charges used, Built by, Terrain, Terrain beside fresh water, Features, Flat
  or hills, Built only on, Gives access to.
- Resource: Adds to the hex, Terrain, Features, Flat or hills, Revealed by,
  Needs improvement, Copies per seam, Units that need a copy.

Headings on the Units, Buildings and Improvements shelves, after the ordinary
rows: "Unique to one leader", "Opened by a card", "Works of great people",
"Not in the game".

## Markers and the sentence each now prints

New means the Compendium did not say it before.

| Marker | Where | Sentence or row |
|---|---|---|
| `UnitDef.combatLines` | unit | New. "+15 combat strength when attacking cities" (`describeUnitRow`) |
| `UnitDef.effects` | unit | New. The card describer's clause: "for mandekalus alone, pillaging pays +100%" |
| `upgradesTo`, read backwards | unit | New. Row "Upgrades from" |
| `requiresResource` | unit | Row "Needs a copy of: Horses or Camels". The holding rule is on the lead page |
| `charges` | unit | Row "Charges" |
| `prophesies` | unit | "Each act costs charges: found a religion 2, ..." from `rules.religion.prophetCosts` |
| `proclaims` | unit | New. "Each act costs one charge: proclaim the faith over a small area, heal your units beside it, or leave a relic in a city that has a cathedral." |
| `purges` | unit | The purge with its pressure and range, and the strength it gives nearby units, from `rules.religion` |
| `purchase` | unit | "Bought with faith in a city. It cannot be built." New: the building the city needs, and the rise in price |
| `mirrors` | unit | New figure: the share of the mirrored unit's cost |
| `hitAndRun` | unit | The movement an attack costs and the strength a unit at sea loses, from `rules.naval` |
| `blockades` | unit | New figures: the strength for each ship beside it and the cap |
| `trades` | unit | New. "An enemy melee unit that attacks it plunders it: the caravan is destroyed, its route ends, and the attacker takes the cargo." |
| `retired`, `awaitsTech`, a leader row with no leader, a card row with no live card | unit, building, improvement | New. The opening line as a band, and the heading "Not in the game" |
| `charter.unlocks` | unit, building | New. The opening line names the charter |
| `publicWork` | building | New. "A public work: a card that counts public works counts this." |
| `consecrated` | building | New. "When it is finished, the city gets one consecration, picked at random." |
| `faithBuysWonders` | building | New. "This city can buy a wonder with faith." |
| `restoresMovementOn` | building | New. "Your military units get all their movement back each time they stop on a Pasture inside the borders of this city." |
| `queueFloor` | building | New. "The build queue of this city must always hold 2 or more things." |
| `awaitsTech` | building | New. "Unlocked by nothing yet: no technology reaches this, and nobody can build it." |
| `empireBuilding`, `oncePerEmpire` | building | Kept. The second sentence is shorter |
| `waters`, `easesUnrest`, `acceptsContributions`, `endsTheGame` | building | Kept, shorter |
| `grantedOnly`, `placed` | building | In the opening line. No production cost row |
| `worldUnlockTech` | building | In the opening line, one time |
| `irrigates`, `purchaseOnly`, `faithPurchases`, `followingOnly` | building | Already said by `describeBuildingRow` |
| `countsAsGreatWork` | improvement | New. "Counts as a great person's work, though a worker builds it: every card, legacy and commission that counts works counts this." |
| `greatPerson` | improvement | New. "A great person's work: ..." and "It gives access to a resource on its hex, and it can be built on a resource that asks for another improvement." |
| `happiness` | improvement | New. Row "Happiness" |
| `upgrades` | improvement | New. "Irrigation: +1 food beside fresh water." |
| `tended` | improvement | Kept, as its own clause |
| `onePerTown`, `countsAs`, `watersBeside`, `copiesNeighbours`, `yieldsAs`, `landBeside`, `beyondBorders`, `claimsUnowned`, `claimsNeighbours`, `adjacentImprovement`, `requiresAdjacentMountain` | improvement | Kept, shorter |
| `requiresTech` | resource | Row "Revealed by", a link. The rule is on the lead page |
| `requiredResourcesOf`, read backwards | resource | New. Row "Units that need a copy" |
| `leaderDef.decks` | leader | New. The eyebrow names the decks |

What `isGreatPersonWork` does in the simulation, which the two work sentences
state: `openedResource` (`cities.ts`) gives a work the resource on its hex;
`improvementErrorAt` (`improvements.ts`) lets a work stand on a resource that
wants another improvement; and every count of works reads it (cards and
legacies in `statecraft/evaluator.ts`, commissions in `commissions.ts`, a
capture's riders in `combat.ts`). A work can be pillaged. Only a tended work
cannot.

## Said one time on a lead page

- Units: the base price, upkeep, upgrades and the build list, the resource
  copy, a worker's charges, exploring on its own, how a ship moves.
- Wonders: one in the world, no purchase with gold, the refund, no upkeep.
- Improvements: what a great person's work is; a new improvement replaces the
  old one.
- Resources: the three things you need, the reveal rule, one copy for a bonus,
  a unit holds a copy.
- Technology (Concepts): the price of a charter technology, and that it does
  not count toward an age.

## Words, before and after

| Shelf | Entries | Before | After | Change |
|---|---|---|---|---|
| Units | 71 | 11,665 | 4,174 | -64% |
| Buildings | 96 | 7,749 | 4,716 | -39% |
| Wonders | 35 | 3,048 | 1,856 | -39% |
| Improvements | 27 | 1,630 | 1,617 | -1% |
| Resources | 46 | 3,027 | 2,204 | -27% |
| Technologies | 64 | 3,867 | 3,166 | -18% |
| Great People | 161 | 13,852 | 10,553 | -24% |
| Leaders | 17 | 1,933 | 1,514 | -22% |
| Introduction | 5 | 1,327 | 1,303 | -2% |
| Concepts | 24 | 6,003 | 6,047 | +1% |
| Those ten shelves | 546 | 54,101 | 37,150 | -31% |
| The whole book | 2,100 | 153,331 | 136,360 | -11% |

The Improvements shelf has the same length because the lines it lost were
replaced by facts it did not have. The other eleven shelves (Orders, Doctrines
and the rest, about 99,000 words) did not change, except one sentence on the
Bead Race lead page and one line on the Rites shelf.

The full text of every entry, before and after, is in the scratchpad of the
session that did this work (`compendium-pass/before.txt`, `after.txt`).

## Needs a sim or data change (not done)

1. **Unit notes** (`data/units.json`, about 30). The unit page no longer
   prints them. Rewrite each as one plain fact, or delete it. Then the page can
   print them again.
2. **Building notes** (`data/buildings.json`, about 80). The page prints a
   note only where the generated lines are the yields and the renown and
   nothing more. Rewrite the notes plainly. Two carry a rule that has no data
   field: the Temple's guard against other religions (the simulation finds the
   Temple by its id) and the Relic's limit of one a town. Each needs a marker
   so that the page can print the figure.
3. **What a leader unit replaces.** No row says it. A `replaces` field on
   `UnitDef` would let the page print "Replaces: Knight".
4. **Unit names in the plural.** `unitPluralWords` now gives "janissaries" and
   "khopeshes". A `plural` field on the row is the full fix.
5. **Describer clauses start with a small letter** ("janissaries you gain
   start as Veterans"). That is the card vocabulary, and it is the same on
   every surface.
6. **The Apostle's three acts** have no figures in `data/rules.json` (the
   range and weight of its proclamation, how much it heals). The page says the
   acts in words.
7. **The Orders lead page, Faith and religion, and Trade and roads** are long.
   Tests pin many of their sentences. Shorten them when test runs are allowed.
8. **Card and tech lines use an em dash** ("New unit: Trader — 51"). They are
   the star chart's lines and tests pin them.
9. **The Meters and Trade shelves** print long generated paragraphs. They were
   not reviewed in this pass.

## Tests

Updated, and not run (the user has paused test runs):

- `test/ui/compendium.test.ts`
- `test/ui/compendiumCharterTechs.test.ts`
- `test/ui/religionV2.test.ts`
- `test/sim/leaders.test.ts`
- `test/sim/decks/devotionReview.test.ts`

A script checked the pinned claims of `test/ui/compendium.test.ts` outside the
test runner (one opening line an entry, the gate of each row, each link has a
page, no digit in a string). All held. The card text fixture
(`test/fixtures/cardText.json`) is the same, byte for byte.

## The user's comments on the review page, 2026-11-21

The user: "it looks great mostly", with eleven comments. Each is quoted, with
what was done.

1. Scout: "could we make the voice more direct, doesn't need flavor. this
   should probably read something like 'ignores terrain costs to movement'".
   Done for every ability line of a unit (`unitMarkers` in
   `src/ui/compendium.ts`). The table below has each line.
2. The Mandekalu: "Capitalize 'for'?" The cause: the card describer names the
   kind of unit a line is for ("for mandekalus alone, pillaging pays +100%")
   and starts a clause with a small letter. `describeUnitRow` now takes the
   unit's own name out of its own lines and starts each with a capital. A line
   that starts with the name keeps it ("Janissaries you gain start as
   Veterans").
3. The Prophet: "could we add compendium links for 'founding a religion'
   'rites' 'proclaim' and 'holy sites'" and "second line is probably unneeded
   with those links. maybe just a line that says: see 'faith and religion'".
   Done. Two new Concepts pages give the two acts an anchor:
   `concept:foundingReligion` and `concept:proclamation`. "Holy site" links to
   `improvement:holySite` and "rite" to `rite:about`. The Prophet, the Apostle
   and the Inquisitor each end their acts with "See Faith and religion."
4. About units: "good".
5. The Forum: "lets swap these two clauses ... Have them be one bullet point."
   Done in `EMPIRE_BUILDING_WORDS.entry` (`describers.ts`): "An empire
   building: your empire can build only one. If you lose the city that holds
   it, you lose the building too."
6. Fish Traps: "didn't we determine that we wanted to replace 'tended work'
   with unique improvement? That said, fish traps should just be a normal
   improvement." The Compendium's own two phrases now say "unique improvement"
   (the marker sentence on an improvement, and a Doctrine's "Needs" row). The
   rest is a rule change and was not made. See "What prints tended" below.
7. The Academy: "could we add a note: 'removes forest or jungle on the tile
   when placed'". Not printed, because the game does not do it. Building any
   improvement, a work included, leaves `Tile.feature` as it is. The one place
   that sets a feature to none is `chopFeatureAt` (`improvements.ts`), which a
   worker's clearing calls. A work can stand on forest or jungle
   (`improvementErrorAt` skips the feature check for a work), and the forest
   stays under it. If the user wants the forest removed, that is a sim change.
8. Iron: "we should probably allow players to trade strategics." A rule change
   for another developer. The entry said "A strategic resource cannot be traded
   away." That sentence is now printed only while `isLendableResource`
   (`deals.ts`) refuses the resource, so it leaves the page with the rule.
9. Surveying: "this should link to the qanat". Each unit, building,
   improvement and rite a charter technology opens is a link (`giftWords`, with
   links on for a charter technology's page).
10. Mansa Musa: "we don't need 'from the first turn' also applies to the leader
    screen. Maybe just write 'leader abilities' instead". The one source is
    `LEADER_STEP_WORDS.rules` (`src/ui/leaderSelect.ts`), now "Leader
    abilities". The Compendium's leader page reads the same word.
11. Combat and movement: "could we add a 'fortify until healed option'..." A
    new feature for another developer. The Compendium does not describe it.

### Each ability line of a unit, before and after the comment

| Marker | Before | After |
|---|---|---|
| `foundsCity` | Founds a city. This uses up the unit. | Founds a city. Is used up when it does. |
| `haltsGrowth` | A city stores no food toward its next citizen while this is first in its build queue. | Stops its city storing food for growth while it is first in the build queue. |
| `prophesies` | Each act costs charges: found a religion 2, ... The unit is used up when its charges run out. | Spends charges on its acts: found a religion 2, ... Is used up when it has no charges left. |
| `prophesies`, second line | A card can change what an act costs. Faith and religion explains each act. | See Faith and religion. |
| `proclaims` | Each act costs one charge: proclaim the faith over a small area, heal your units beside it, or leave a relic in a city that has a cathedral. | Spends one charge on each act: proclaim the faith over a small area, heal your units beside it, or leave a Relic in a city with a Cathedral. See Faith and religion. |
| `purges` | The purge uses up the unit. Every rival religion loses 60 pressure in each city within 5 hexes, and followers it can no longer hold follow nothing. Your own religion is spared. | Purges: every rival religion loses 60 pressure in each city within 5 hexes. Is used up when it does. |
| `purges`, aura | +2 combat strength for your units within 1 hex of it. A second inquisitor adds nothing. | Gives +2 combat strength to your units within 1 hex. A second inquisitor adds nothing. See Faith and religion. |
| `greatWork` | Use it for the act of its family, or have it build the work of its family. Each uses up the unit. | Does the act of its family, or builds the work of its family. Is used up when it does. |
| `routeOnly` | This is not built and not bought in a city. It comes with a route you hire on the Trade screen. | Comes with a route you hire on the Trade screen. It is not built and not bought in a city. |
| `trades` | It walks between the two cities of its route and lays road on every land hex it crosses. | Walks between the two cities of its route and lays road on every land hex it crosses. |
| `trades`, plunder | An enemy melee unit that attacks it plunders it: ... | Is plundered when an enemy melee unit attacks it: the caravan is destroyed, its route ends, and the attacker takes the cargo. |
| `ignoresTerrainCost` | Rough ground does not slow it: every hex it can enter costs the same. | Ignores terrain costs to movement. |
| `ignoresHillCost` | A hill costs it no more movement than flat land. Forest and jungle still slow it. | Ignores the movement cost of hills. |
| `hitAndRun` | An attack costs it 1 movement and does not end its turn. It attacks one time a turn. | Keeps its movement after an attack, less 1. Attacks one time a turn. |
| `hitAndRun`, escort | A land unit that shares its hex at sea defends with this ship's strength if that is higher, and does not lose the 20 strength a unit at sea loses. | Escorts a land unit on its hex at sea: that unit defends with this ship's strength if it is higher, and does not lose the 20 strength a unit at sea loses. |
| `blockades` | +4 combat strength for each friendly ship of its kind beside it, to at most +8. | Gains +4 combat strength for each friendly ship of its kind beside it, to at most +8. |
| `blockades`, harbour | Beside an enemy harbour it blockades the city: ... | Blockades an enemy harbour beside it: the water around the ship is closed for a siege, and the trade routes of the city pay nothing. |
| `mirrors` | It is as strong as the best mounted unit your empire can build on the day you buy it, and it costs 80% of the production cost of that unit. | Takes the strength of the best mounted unit your empire can build on the day you buy it. Costs 80% of the production cost of that unit. |
| `minCityPop` | Only a city of 2 or more citizens can build one. | Needs a city of 2 or more citizens to build it. |
| `purchase` | Bought with faith in a city. It cannot be built. Each one you buy raises the price of the next by 60. | Bought with faith in a city. Cannot be built. Each purchase raises the price of the next by 60. |
| effect lines | for mandekalus alone, pillaging pays +100% | Pillaging pays +100% |
| effect lines | keshigs: a unit that kills gets its movement back for the rest of the turn | A unit that kills gets its movement back for the rest of the turn |
| effect lines | +2 combat strength for tang heavy cavalry while standing beside melee units | +2 combat strength while standing beside melee units |
| effect lines | janissaries you gain start as Veterans | Janissaries you gain start as Veterans |

The figures in the table are the data's values on 2026-11-21. The page reads
them from `RULES` and the unit rows. The combat lines of a row ("+15 combat
strength when attacking cities") did not change.

### What prints "tended"

- Compendium prose, changed to "unique improvement": the marker sentence on a
  tended improvement, and the Doctrine row "Needs: a charter that opens a
  unique improvement" (both in `src/ui/compendium.ts`).
- The card describer, not changed (`src/sim/statecraft/describers.ts`): the
  tile word "tended", "tended works cost your workers no charge", "your tended
  land also counts as improved for every card", "the named works also count as
  tended land", "your improvements, tended works and great people's works", and
  the commission counters "tended tiles" and "tended hexes".
- Data rows, not changed: 17 `text` and `note` lines in `data/` say "tended".
- The field names `tended` and `needsTendedWork`, and the fact that a card
  opens Fish Traps, are data and sim. They are the rule change of
  `docs/flags.md`, "Three rulings from the Compendium review".

### Tests updated in this round, and not run

- `test/ui/compendium.test.ts`: the empire building sentence; the trade
  sentence follows `isLendableResource`.
- `test/ui/religionV2.test.ts`: the Prophet's acts are read with the links
  taken out, and the page ends them with "See Faith and religion."

## The notes and the rules pages, 2026-11-21 (third round)

The user: "Please rewrite the notes, yes. You're free to modify tests at your
pleasure."

### The notes in the data

Every hand-written `note` on a unit row, a building row and a technology row
got one decision. No improvement row and no resource row has a note.

| Decision | Count |
|---|---|
| Deleted: the entry prints the fact from the row, or the note is history or scene-setting | 116 |
| Rewritten as one or two plain sentences | 14 |
| Kept as it was | 1 |
| `deferred` lines kept and shortened | 4 |
| Moved to flavour | 0 |

- None moved to flavour, because a unit row and a building row have no flavour
  field. A new field was not added.
- The four `deferred` lines are on rows that are not in the game (the Treasure
  Ship, the Canoness, the Longjiang Dockyard, the Rupertsberg Scriptorium).
  Each part is still not built, so each line stays.
- All eight notes on withdrawn building rows went. None said why the row is
  withdrawn, and a withdrawn building has no page.
- A unit entry prints its note again, after the effects. No unit row has a
  note today.
- A building entry prints its note when the row has one. The rule that hid a
  note beside generated lines is gone, because the notes that repeated those
  lines are gone.
- Each rewritten fact was checked in the code: the Temple (`templeShare`,
  `religion.ts`), the Relic (`placeRelicError`), the worker's charge
  (`cardExtraCharges` is read at a unit's birth), the upgrade of units you
  have (`upgradeUnits`, `tech.ts`), the enhancer beliefs (`ENHANCER_TECH`), the
  bead and the Magnum Opus (`paysBead`, `opusOpen`).
- `docs/tech-tree.md` mirrors the technology notes. It was regenerated
  (`TECH_DOC_WRITE=1`). `test/fixtures/cardText.json` holds the two building
  `deferred` lines and was regenerated. No deck sheet, `docs/luxuries.md` or
  `docs/production-costs.md` holds one of these notes.
- About units now says that your units upgrade on their own when you research
  the technology of the better unit.

Needs a field (the prose cannot carry a number):

1. The Temple: how much more the city's own religion presses, and how much
   less the others. The figures are `rules.religion.templeOwnPercent` and
   `templeForeignPercent`, but the game finds the Temple by its id, so no
   describer can print them on the entry. A marker on the row fixes it.
2. The Relic: the limit of one a city is in `placeRelicError` only.
3. A `flavor` field on unit and building rows, if the deleted scene-setting
   lines are wanted as flavour.

### Every note

| File | Row | Old note | Decision | New note |
|---|---|---|---|---|
| units | `horseman` | Light shock cavalry, and the rung The Saddle hands over. It climbs to the knight: the cataphract that used to stand between the two is a row no node opens any more. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `numidianCavalry` | Light horse paid for by trade. It fights harder for every kind of luxury its empire controls. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `companyGuard` | A trading company's own soldiers. Hired with gold in a city with a Barracks, and never trained. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `fubing` | A militia farmed between musters. It costs the realm nothing at all while it stands in a city of its own. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `tangCavalry` | Lamellar and a long lance, and it fights best with foot beside it. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `xiongnuHorseArcher` | It shoots and rides on: a kill leaves it with its feet still moving. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `chanyuGuard` | The Chanyu’s own household, and the archers riding next to it shoot harder for the company. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `khopesh` | A sickle sword, and it fights hardest on ground that keeps its king’s god. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `camelArcher` | It shoots the keener for every great work standing in the capital it was raised for. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `ponticPeltast` | Javelins and a physician’s training. A kill leaves it better than it was. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `gendarme` | Heavy lance, and it is walls it was bred for: it strikes a town harder than it strikes anything standing in the field. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `mandekalu` | Mail under a quilted coat, and a long way from home. What it tears down it carries back twice over. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `treasureShip` | Nine masts and a crew of a small town. It sees further than any hull afloat and is very hard to sink. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `treasureShip (deferred)` | It does not yet carry a second passenger. | Rewrite. The part is still not built: the row is not in the game. | It cannot carry a second land unit yet. |
| units | `eagleWarrior` | It needs no iron, and every kill is a song somebody will still be singing in a hundred years. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `alexandrianGalley` | A lookout on the masthead and the Pharos behind it. It finds the coast before the coast finds it. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `canoness` | She travels with a choir and a book of her own composing, and she preaches as an apostle does. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| units | `canoness (deferred)` | Her preaching does not yet set the whole realm building. | Rewrite. The part is still not built: the row is not in the game. | Her proclamation does not speed up building in your empire yet. |
| units | `rihlaCaravan` | It has crossed everything there is to cross and knows whom to pay. Nobody robs it, and it comes home richer than it left. | Delete. The entry prints the fact from the row (an effect, a combat line, a cost row), or the note is scene-setting. |  |
| buildings | `granary` | What the jar keeps, the year forgets — and some of it is still there after the town grows. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `barracks` | The drill yard of the foot. Spearmen, warriors and archers are raised here faster than anywhere else; horse, engine and hull are trained elsewhere. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `stable` | Built where the herds are. Every pasture and camp the city works is worked harder, and horsemen are raised here faster than anywhere else. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `temple` | Foreign faiths pressing on this city lose a quarter of their strength at its door. | Rewrite. The one place the rule is said. The game finds the Temple by its id, so no describer prints it. | The religion this city follows presses on it more strongly, and other religions press on it less. |
| buildings | `market` | The stalls, the scales and the road out. Each Market lets your empire run another trade route. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `workshop` | The town’s own joiners and masons. What they raise, they raise faster. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `cathedral` | Dedicated to a patron the day it is finished. Units may be bought with faith in the city that holds it, at the rate gold buys them elsewhere. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `reliquary` | Units may be bought with faith in the city that holds it, at the same rate gold buys them elsewhere. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `armoury` | The engine yard and the bowyers' hall. It works hard for the town that keeps it, and bows and siege engines are raised here faster than anywhere else; foot, horse and hull are trained at the ordinary pace. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `petra` | A caravan city at the edge of the sand: it may be raised in a town standing on desert, or in one with desert beside it. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `terracottaArmy` | Soldiers raised in this city start out better trained, and keep that training wherever they march. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `waterClockOfSuSong` | The escapement keeps the realm's whole calendar. Every boon of yours that comes round on a beat comes round sooner, and on the clock's own beat the realm is paid in learning for everything its workshops made. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `hallOfDeeds` | No longer raised anywhere. The row is kept so that a game begun before the tree was re-cut still plays back exactly as it did. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `steleOfLaws` | The law, cut in stone where anyone may read it. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `bazaar` | Every kind of luxury this city can reach pays a further gold here. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `harbour` | Built on the coast. The wharf works for the town that keeps it, and every seam of the sea the city works — the fish, the crabs, the whales — pays a further food and a further coin. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `baths` | Hot water, cold water, and somewhere to argue in between. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `forum` | The square where the city hears itself think. One realm, one Forum. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `examinationHall` | Clerks chosen by what they can write down. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `courthouse` | Built only in a city taken by force. It answers for the whole cost of holding one. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `shipyard` | Built on the coast. The slips work for the town that keeps them, every fishing boat the city works brings in more, and ships leave the yard faster; everything else is built at the ordinary pace. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `castle` | The town is worth more to storm, and takes longer to empty. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `forge` | Soldiers are made here faster than anywhere else in the realm. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `caravanserai` | A walled yard and a well. It lets your empire run more trade routes than a Market does, and every caravan that sets out from this city carries more than it could alone. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `printingHouse` | The town that holds it learns and builds faster. Every trade route that ends here also brings science and culture. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `observatory` | The sky, written down night after night. An observatory with a mountain inside the city’s borders reads it better. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `garden` | Water is led where nothing needed it. Every fifth citizen of this town has somewhere to walk in the evening, and what the town does is remembered further afield. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `publicBath` | Makes its town happier, as long as the town is joined to your capital by road. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `lighthouse` | Built on the coast. It feeds the town that keeps it, and every water hex the city works pays a further coin for the light that brings the boats home. Each Lighthouse also lets your empire run another trade route. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `townCharter` | A city founded under Daughter Cities is founded holding one. It is never built and never bought. | Rewrite. Says who gets one. The opening line says only that it is granted. | Each city you found after you research Daughter Cities starts with one. |
| buildings | `clocktower` | The town keeps one hour, and everybody in it keeps the same one. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `bank` | Coin that stays still long enough to be counted twice, and counts fastest in a city the caravans come to. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `bourse` | The floor where the realm's coin changes hands, and a little of it turns into song. One realm, one Bourse. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `bastion` | A wall with corners, so that nobody may stand anywhere it cannot be shot at. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `alchemicalSociety` | Every other workshop in the city sends its problems here, and gets an answer back. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `chartTheStars` | One of these in an empire. Every ship of the realm sails a hex further, and so does anybody crossing the water on a raft. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `theTurningHeavens` | One of these in an empire, and only where there is a University to argue about it in. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `theAlchemicalCodex` | One of these in an empire. Every soldier you have fights harder, and one that digs in mends faster. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `theMagnumOpus` | The great work of the age. Nobody may begin one until some empire in the world has reached Alchemy, and no empire may begin one until its own rod of beads is full. Gold and faith may be poured into it as well as production. The first one finished anywhere ends the game: the last measures of the age are taken for the record, and the empire that raised it wins. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `specularium` | A glass house that grows fresh food in every season, and teaches the town a little more as it grows. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `mouseion` | A house of scholars, fed and kept by the realm. Its town sings for every empire building the realm holds, and it costs more to raise than other empire buildings. One realm, one Mouseion. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `aldinePress` | A press that prints small books for travellers. It adds culture to its town. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `bimaristan` | A house of healing, open to all. Its town eats better. Your empire may build only one. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `tophane` | The cannon foundry of the realm. Soldiers raised in its town are stronger for the rest of their lives, and the town raises them faster. One realm, one Tophane. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `chapel` | Every rite this city performs pays a little culture as well. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `keep` | The town takes longer to empty, and your own units resting in it or beside it mend faster. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `scriptorium` | Copies of everything, kept dry. It is worth more where a scholar's academy stands inside the town's borders. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `assayHouse` | Coin weighed before it is spent. Anything this city buys with gold costs a little less. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `cistern` | The city counts as standing on fresh water, every desert hex it works feeds it a little better, and the farms in its fields draw their irrigation from the town as they would from a river. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `assemblyHall` | Built in the seat of your government and nowhere else. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `viziersHall` | The office that keeps the town's works list. It must always hold at least two things to build, and while it does, everything is raised faster. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `smithy` | The first hearth hot enough to matter. It works for the town that keeps it, and every seam the city has opened — a mine or a quarry standing on a named resource — gives up a further hammer. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `warHall` | Where the armour is fitted. It works for the town that keeps it, and every soldier raised here marches out in bronze — hardier from the day it musters, and hardier wherever it goes. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `coinworks` | Coin struck where the town can watch it being struck. A share of everything this city earns is heard again as culture. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `almshouse` | Settlers, workers and caravans may be bought with faith in the city that holds it, at the same rate gold buys them elsewhere. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `orrery` | Brass rings turning at the speed of the heavens. It is worth more in a town raised within sight of a mountain. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `assizeCourt` | Citizens in this town ask for less happiness. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `plantationHouse` | Bought with gold, never built. Every plantation this city works feeds it a little more and pays a little more. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `relic` | An apostle may leave one of these in a town that has finished its cathedral. It is never built and never bought, and a town holds one at most. | Rewrite. The one place the rule is said (`placeRelicError`). | An apostle leaves one in a city that has a Cathedral. A city can hold only one. |
| buildings | `heroicEpic` | The deeds of the realm set to verse, and sung where they were done. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `imperialThrone` | The seat of the realm. The wider the realm, the further its authority carries. Soldiers raised in its shadow cost a little less to keep, for as long as they live. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `highTemple` | Your faith carries from here as far and as strongly as it does from a holy site, and the bigger the city that keeps it the harder it carries. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `mosque` | Bought with faith, and only in a city that keeps the faith that opened it. Its courts widen what a ruler may hold together. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `wat` | Bought with faith, and only in a city that keeps the faith that opened it. The town gathers here, and the larger the town the more it gives back. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `gurdwara` | Bought with faith, and only in a city that keeps the faith that opened it. Its kitchen feeds whoever comes, and its rooms are where the reading is done. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `darEMehr` | Bought with faith, and only in a city that keeps the faith that opened it. The flame is never let out, and everything offered here goes further. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `terraces` | Steps cut into the hillside. Farms may be cut into the high ground this town holds, and every farm it works up there feeds it better. | Delete. A withdrawn row has no page, and the note does not say why it is withdrawn. |  |
| buildings | `tambo` | A way station on the royal road, with room for another caravan. Every road of your own that runs to or from this town carries grain and timber as well as coin. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `qollqa` | Round stone granaries on a cold hillside. The town keeps a share of its stores when it grows instead of eating them all. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `examinationCourt` | The town that holds it gains science for each Order in your military chairs. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `postStation` | The town that holds it builds faster, as long as the town is joined to your capital by road. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `hordeCamp` | Felt tents pitched among the herds. Every pasture this town works is holy ground as well as grazing, and a soldier of yours is given a fresh horse every time it steps onto one of them — not once a march, but each time. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `obelisk` | One stone, cut whole and stood upright, with the sun on its tip at noon. Cutting it teaches the town to cut everything else. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `sunCourt` | An open court with no roof over the altar. The town is glad of it, and the larger the town the more it offers. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `valleyOfKings` | Shafts cut into the rock of a dry valley, one for each empire building raised in this town. A wonder may be hurried along here with faith. One realm, one valley. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `houseOfLearning` | Rooms for copyists, a kitchen and a courtyard with a well. Those who read here are fed here, and the house learns from every great person your realm has called. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `mihnaCourt` | Where the creed is argued rather than recited. A share of everything this town offers is written down and studied. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `paperMill` | Rag, water and a screen. Every caravan that ends its road here arrives carrying something worth reading. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `mithridatium` | A physic garden, and a king who takes a little of everything grown in it. The town walks here in the evening, and what it learns of the plants it writes down. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `ponticHold` | A fastness above the town, with its own cistern and its own terraces. The town is worth a great deal more to storm. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `sainteChapelle` | Glass from floor to vault, raised over a relic. Soldiers may be bought with faith in the city that holds it. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `sankoreMadrasa` | Mud brick and a courtyard of scholars. A quarter of the devotion this city makes comes back as learning. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `longjiangDockyard` | Built on the coast. Slips long enough for a treasure ship, and a road out for everything they unload. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `longjiangDockyard (deferred)` | Ships launched here do not yet sail an extra step. | Rewrite. The part is still not built: the row is not in the game. | Ships built here do not get more movement yet. |
| buildings | `tetzcotzinco` | An aqueduct cut through a hill to water a garden on top of it. The whole town eats better for it. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `museion` | Shelves, a dining hall and a salary. Every great name the realm has ever called is read here. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `rupertsbergScriptorium` | A copying room with a window and a choir beyond it. The house writes down everything it sings. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `rupertsbergScriptorium (deferred)` | What this city believes is not yet worth twice as much here. | Rewrite. The part is still not built: the row is not in the game. | The faith of this city is not doubled here yet. |
| buildings | `funduq` | A yard, a well and rooms above the stalls, and every town may keep one. Foreign roads that touch it come in loaded. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| buildings | `cathedralSchool` | The masters teach beside the altar. Every religious building in the town counts, this school included, and so does any other building that a card gives faith. | Delete. The entry prints the same facts from the row. The rest is scene-setting. |  |
| techs | `divination` | A shrine is where a people first listen, and the first of your gods arrives of its own accord once the realm's faith runs deep enough. | Rewrite. The node gives no rule line for it. | Your first god comes when your empire has saved enough faith. |
| techs | `theWheel` | Every worker made from now on has an extra charge of work. Chariots may be trained if you have improved horses or camels. | Rewrite. Says which workers. | Each worker you make after this has an extra charge. Workers you have already do not change. |
| techs | `siegecraft` | Your soldiers may besiege an enemy town: a town they surround cannot heal and loses health each turn. Towns may raise stone walls, and workers may build lumber mills. | Delete. The node prints the same things as its own lines. |  |
| techs | `irrigation` | A farm standing beside fresh water feeds its city better than it did. | Delete. The node prints the same things as its own lines. |  |
| techs | `epicPoetry` | Renown now brings great people. Before you know this, renown still builds up, but no great person comes. | Rewrite. The node gives no rule line for it. | Great people come only after you research this. Renown you earn before then is kept. |
| techs | `kingship` | A city may put its labour into pageants, and what it raises is celebration rather than stone. The crown's authority reaches further too: your realm may hold more cities in hand than it could. | Rewrite. Says what the authority line is for. | Your empire can govern more cities. |
| techs | `theLongCount` | You may spend faith to draw a new hand of Orders in place of the one you were offered. | Keep. Plain already, and the node gives no rule line for it. | You may spend faith to draw a new hand of Orders in place of the one you were offered. |
| techs | `stateWorkforce` | Every worker made from now on has an extra charge of work. | Rewrite. Says which workers. | Each worker you make after this has an extra charge. Workers you have already do not change. |
| techs | `bronzePanoply` | Phalanxes and swordsmen may be trained if you have improved copper or obsidian. When you do, your spearmen become phalanxes and your warriors become swordsmen. Iron now shows on the map. | Rewrite. The upgrade of units you have is said nowhere else on the node. | Your spearmen become phalanxes and your warriors become swordsmen, if you have improved copper or obsidian. |
| techs | `paperMoney` | Notes, ledgers and a floor to shout them across: the realm's coin can be turned into song at the Bourse. | Delete. The node prints the same things as its own lines. |  |
| techs | `artisanry` | Towns may build a Workshop. | Delete. The node prints the same things as its own lines. |  |
| techs | `theImperialPost` | Opens the Forbidden City. | Delete. The node prints the same things as its own lines. |  |
| techs | `theExaminationHall` | A town you have taken by force may build a Courthouse. | Delete. The node prints the same things as its own lines. |  |
| techs | `colonialCharters` | Every town you found starts with its Town Charter already built. | Rewrite. Says which cities. | Each city you found after this starts with a Town Charter. |
| techs | `theology` | The enhancing beliefs open here: a faith may now be deepened as well as spread. | Rewrite. The node gives no rule line for it. | Your religion can take enhancer beliefs after this. |
| techs | `ironWorking` | Legionaries and spear walls may be trained. Your phalanxes become spear walls. When you have improved iron, your swordsmen become legionaries. | Rewrite. The upgrade of units you have is said nowhere else on the node. | Your phalanxes become spear walls. Your swordsmen become legionaries if you have improved iron. |
| techs | `horology` | Opens Chichen Itza. | Delete. The node prints the same things as its own lines. |  |
| techs | `theCataphract` | Horsemen, horse archers and war elephants may be trained, and every pasture your towns work gives more production. | Delete. The node prints the same things as its own lines. |  |
| techs | `prospecting` | Every mine your towns work gives more production. Workers and scouts may also search a hill for a buried seam. | Delete. The node prints the same things as its own lines. |  |
| techs | `silkRoad` | Towns may build a Caravanserai, which lets your empire run more trade routes. | Delete. The node prints the same things as its own lines. |  |
| techs | `machinery` | Crossbowmen may be trained. | Delete. The node prints the same things as its own lines. |  |
| techs | `theSilkRoad` | Your empire may run an extra trade route at once. | Rewrite. Says what the line is for. | Your empire can run another trade route. |
| techs | `feudalism` | Towns may build a Castle, and pikemen may be trained. | Delete. The node prints the same things as its own lines. |  |
| techs | `steel` | Longswordsmen may be trained, and towns may build a Forge. | Delete. The node prints the same things as its own lines. |  |
| techs | `alchemy` | Niter is named, and the first soldier who carries fire may be trained where it is dug. Completing this pays a glass bead, and the first empire in the world to complete it opens the Magnum Opus for everybody. | Rewrite. The bead and the world rule are said nowhere else on the node. | Finishing this pays a bead. When any empire finishes it, every empire with a full rod of beads can begin the Magnum Opus. |
| techs | `movableType` | Opens the Printing House, which makes the town that holds it learn and build faster. | Delete. The node prints the same things as its own lines. |  |

### The three rules pages

| Page | Words before | Words after |
|---|---|---|
| About Orders (`order:about`) | 958 | 556 |
| Faith and religion (`concept:religion`) | 915 | 460 |
| Trade and roads (`concept:trade`) | 424 | 302 |

- Each page has one topic a paragraph, with the topic named first ("Draft:",
  "Chairs:", "Spread:", "Slots:").
- Each page links the entries it names: the leader page, the four card
  keywords, the technology that opens the faith reroll, the Prophet, the
  Apostle, the Inquisitor, the Temple, the Shrine, the holy site, the rites,
  the Trader, Currency, the Market, the Lighthouse and the Caravanserai.
- Corrected: Faith and religion said a Temple "doubles" its own religion and
  "halves" the others. The second figure is no longer a half, so the page says
  "presses harder" and "press less". Trade and roads gave the number of slots a
  Market gives; the page now leaves numbers to the linked entries.
- The acts of a Prophet left the Faith page. They are on the Prophet's entry,
  with the cost of each from `rules.religion.prophetCosts`, and on the two
  pages Founding a religion and Proclamation.
- The other Concepts pages were read again. Combat and The goal were rewritten
  in the first round. Yields, Cities and borders, Unrest, War weariness and
  Unit ranks are plain already and were not changed. They are long (about 250
  words each) and are a candidate for the same treatment.
- The coastal rule of 2026-11-20 is not built, and no page describes it.

### Tests

Changed in this round:

- `test/ui/compendium.test.ts`: the Trade page is found by its links; the
  slot sentence pins the building links; "from the start" allows no silent row.
- `test/ui/religionV2.test.ts`: the Faith page pins five links in place of
  five sentences.
- `test/ui/compendiumDecks.test.ts`: the Units shelf has three headings; the
  Doctrine row says "unique improvement".
- `test/ui/keywordCards.test.ts`: the short definition is checked on the
  Temple; the source pin names the one printer.
- `test/sim/decks/devotionThemeCards.test.ts`: the devout sentence.
- `test/sim/decks/devotionReview.test.ts`: the Cathedral School has no note.
- `test/sim/tech.test.ts`, `test/sim/prospect.test.ts`: two technology notes.

Run with `nice -n 15 npx vitest run <files>`, all passing at the end:

- `test/ui/compendium.test.ts`, `compendiumCharterTechs.test.ts`,
  `compendiumDecks.test.ts`, `religionV2.test.ts`, `quietTable.test.ts`,
  `upkeepPanels.test.ts`, `guideCopy.test.ts`, `keywordCards.test.ts`,
  `vocabulary.test.ts`, `techLines.test.ts`, `leaderScreens.test.ts`
- `test/sim/decks/devotionReview.test.ts`, `devotionThemeCards.test.ts`
- `test/sim/techDocSync.test.ts`, `cardTextSnapshot.test.ts`,
  `prospect.test.ts`, `leaders.test.ts`, `tech.test.ts`

The first run of fourteen files found eight failures. Five were pins of the
first two rounds that had never been run: the Units shelf headings, the hover
card's printer, the "first in the world" phrase on the Technology page, the
"from the start" count, and the note on the Scout. All are fixed.

## The kinds of building, 2026-11-22 (fourth round)

The user: "in the compendium, many of the public works are labelled as food
buildings. Could we add sections to the buildings list that break down the
types of building by type (military, science, faith, production, public work,
etc) so that it's clear what certain orders are referring to". And then: "also,
defensive buildings".

### The terms a card uses, and how the game decides each

| Term on a card | How the game decides | The function |
|---|---|---|
| "food building", "science building" and the other five | The one `category` of the row. A wonder has a category too and counts, unless the card says "other than wonders" | `buildingDef(id).category`, which every category test in `statecraft/evaluator.ts` compares |
| "public work" | The marker `publicWork` on the row | `isPublicWork` |
| "empire building" | The marker `empireBuilding` on the row | `isEmpireBuilding` |
| "fortification" (the cards' word for a defensive building) | A building that adds to its city's defence strength (`cityStat`) or to its city's health (`cityHp`). No marker: the two facts are the rule | `isFortification` |
| "faith house" | Bought with faith only, and only in a city that follows the religion | `isFaithHouse` |
| "building that supplies faith" (and the other five yields) | The row's category is that yield, or the row itself pays that yield. A card or a luxury can add more for an empire | `buildingRowSupplies` for the row; `buildingSupplies` in a game |
| "wonder" | The marker `wonder` | `isWonder`. The Wonders shelf is the list |

- Cards do not say "defensive building" or "walls" for a set of buildings.
  They say "fortification" (five clauses). "Walls" appears only in two
  clauses about a city's defence in a fight, which is not a set of buildings.
  So there is one page, Fortifications, and it says it is the defensive
  buildings.
- "Consecrated" is one building (the Cathedral). Its entry says so, and it has
  no page.
- A building a charter or a leader opens says so in its opening line.

### What was built

- **A page for each kind**, first on the Buildings shelf under the heading
  "Kinds of building": 17 pages. Each lists its buildings as links, then the
  wonders that count, then the rule. The lists are made by the functions in
  the table, so a new building joins its pages with no edit.
- **The buildings are under a heading for each category** (Food, Production,
  Gold, Science, Culture, Faith, Military), then "Not in the game". The
  headings for a leader's and a card's buildings went: the opening line says
  who opens a building.
- **Each building's entry has a row "Kinds"**, each kind a link to its page
  ("Food building · Public work"), and a row "Supplies". The eyebrow says the
  same in plain words ("food building · public work"). A wonder's entry has
  both rows too.
- **A card's words are links.** `markBuildingKinds` (`describers.ts`) runs over
  each finished clause of `describeCard` and makes "public work", "empire
  building", "per fortification" and the seven "... building" terms a link to
  the page. 132 clauses of the card text fixture changed in their marked form.
  The plain words of every clause are the same. "Buildings that supply faith"
  already links the Supplies page, and that page's kind pages are linked from
  each building.
- **The hover card of a term lists what counts**: a kind's page is a written
  page, and its first paragraph is the list.
- Anchors: `building:setPublicWorks`, `building:setEmpireBuildings`,
  `building:setFortifications`, `building:setFaithHouses`,
  `building:setFoodBuildings` (and the six others), `building:setSuppliesFaith`
  (and the five others). The ids are in `BUILDING_KIND_PAGES`. Every building's
  own anchor is the same as before.

### The pages and their sizes

| Page | Anchor | Buildings | Wonders | Buildings listed |
|---|---|---|---|---|
| Public works | `building:setPublicWorks` | 7 | 0 | The House of Fire, Granary, Aqueduct, Watermill, Harbour, Public Bath, Cistern. |
| Empire buildings | `building:setEmpireBuildings` | 15 | 0 | Great Archive, Forum, Caravanserai, Bourse, Chart the Stars, The Turning Heavens, The Alchemical Codex, The Magnum Opus, Mouseion, Aldine Press, Bimaristan, Tophane, Heroic Epic, Imperial Throne, High Temple. |
| Fortifications | `building:setFortifications` | 5 | 1 | The Basilica, Palisade, Stone Walls, Castle, Bastion. |
| Faith houses | `building:setFaithHouses` | 4 | 0 | Mosque, Wat, Gurdwara, Dar-e Mehr. |
| Food buildings | `building:setFoodBuildings` | 8 | 2 | Granary, Aqueduct, Harbour, Public Bath, Town Charter, Glasshouse, Bimaristan, Cistern. |
| Production buildings | `building:setProductionBuildings` | 7 | 2 | The Bottega, Workshop, Watermill, Forge, The Alchemical Society, Smithy, The Commandery. |
| Gold buildings | `building:setGoldBuildings` | 8 | 6 | Market, Bazaar, Caravanserai, Lighthouse, Bank, Bourse, Plantation House, The Funduq. |
| Science buildings | `building:setScienceBuildings` | 13 | 3 | Great Archive, The Hall of Worthies, The Külliye, Library, University, Printing House, Observatory, Chart the Stars, The Turning Heavens, Scriptorium, The House of Learning, The Sankore Madrasa, The Museion. |
| Culture buildings | `building:setCultureBuildings` | 12 | 6 | Monument, Amphitheater, Forum, Courthouse, Garden, The Magnum Opus, Mouseion, Aldine Press, Assembly Hall, Heroic Epic, Imperial Throne, The Tetzcotzinco. |
| Faith buildings | `building:setFaithBuildings` | 15 | 11 | Bell Tower, The Basilica, The House of Fire, Shrine, Temple, Cathedral, Chapel, Relic, High Temple, Mosque, Wat, Gurdwara, Dar-e Mehr, The Sainte-Chapelle, Cathedral School. |
| Military buildings | `building:setMilitaryBuildings` | 13 | 4 | The School of Mieza, The Yam, Barracks, Stable, Palisade, Stone Walls, Armoury, Shipyard, Castle, Bastion, The Alchemical Codex, Tophane, War Hall. |
| Buildings that supply food | `building:setSuppliesFood` | 13 | 2 | The House of Fire, Granary, Aqueduct, Watermill, Harbour, Public Bath, Lighthouse, Town Charter, Glasshouse, Bimaristan, Cistern, Gurdwara, The House of Learning. |
| Buildings that supply production | `building:setSuppliesProduction` | 12 | 4 | The Bottega, Workshop, Watermill, Armoury, Harbour, Shipyard, Forge, The Alchemical Society, Smithy, War Hall, Mosque, The Commandery. |
| Buildings that supply gold | `building:setSuppliesGold` | 9 | 6 | Market, Bazaar, Courthouse, Caravanserai, Lighthouse, Bank, Bourse, Plantation House, The Funduq. |
| Buildings that supply science | `building:setSuppliesScience` | 15 | 4 | Great Archive, The Hall of Worthies, The Külliye, Library, University, Printing House, Observatory, The Alchemical Society, Chart the Stars, The Turning Heavens, The Alchemical Codex, Scriptorium, The House of Learning, The Sankore Madrasa, The Museion. |
| Buildings that supply culture | `building:setSuppliesCulture` | 17 | 10 | The School of Mieza, Monument, Amphitheater, Cathedral, Forum, Courthouse, Printing House, Garden, Town Charter, The Magnum Opus, Mouseion, Aldine Press, Chapel, Assembly Hall, Heroic Epic, Imperial Throne, The Tetzcotzinco. |
| Buildings that supply faith | `building:setSuppliesFaith` | 16 | 12 | Bell Tower, The Basilica, The House of Fire, The Külliye, Shrine, Temple, Cathedral, Chapel, Relic, High Temple, Mosque, Wat, Gurdwara, Dar-e Mehr, The Sainte-Chapelle, Cathedral School. |

Rows that are not in the game are not listed.

### Units and improvements

- Units have the same fault. A card says "mounted units", "siege units",
  "light warships" or "military units", and a unit's entry said only
  "military unit". Done now, as the small part: each fighting unit's entry has
  a row "A card calls these" with the card describer's own words for its class
  (`filterWords`). Not done: a page for each class and links from the cards'
  words. That is the same job as this one again (about ten classes, and the
  same kind of pass over the describers), and "military units", "ships" and
  "scouts" are decided by three more functions.
- Improvements: "great person's work" has a heading and a sentence on each
  work. "Tended" and "unique improvement" wait on the rule change of
  `docs/flags.md`. No page was added.

### Tests

- New: `test/ui/compendiumBuildingKinds.test.ts` (each page lists what the
  function says; a building of two kinds is on both pages; each entry's Kinds
  row; the links on every Order have a page; the plain words do not change).
- Changed: `test/ui/compendium.test.ts` (the shelf's length),
  `test/sim/statecraft.test.ts`, `test/sim/decks/commerceDoctrines.test.ts`,
  `test/sim/decks/scientificDoctrines.test.ts` (three comparisons of a marked
  clause), `test/fixtures/cardText.json` (regenerated).

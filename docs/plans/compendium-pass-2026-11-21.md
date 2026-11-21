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

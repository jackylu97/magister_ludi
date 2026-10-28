# Batches R2a and R2b: the user's Devotion comments of 2026-10-28

**Status:** the spec, written 2026-10-28 before any agent starts. The user left 11 comments on the Devotion tab of the review page (version 17, "Deck sheets" group), then said: *"ok i made a ton of comments on the devotion deck, please make those changes"*. Each comment is quoted below with the card it sits on. The readings are the orchestrator's; each stands until the user changes it.

Two batches, run one after the other in the main tree:
- **R2a** changes two rules: the price of a rite, and the one-per-world rule for pantheon gods. Schema 200.
- **R2b** changes the cards: three removed, four moved to Tier I, one revised with a new building, three new. Schema 201.

## R2a: two rules

### 1. A rite starts at 20 faith and costs more for each rite started

On The Rogations: *"for this to be relevant, we need to make rites cheaper early, and they currently are too late (divination). Lets move this to tier 1 for now and make rites cheaper to start (20 faith) and become more expensive for each rite the empire has started."*

- **Today:** `riteCost(age)` (`src/sim/religionData.ts`) reads `rite.costByAge` in `data/religion.json`: 40, 56, 72 and 90 faith by the empire's research age. Its docblock says the price does not vary with the rites an empire has started. `riteCostFor(state, playerId)` (`src/sim/religion.ts`) is the reading every surface asks.
- **The rule:** a rite costs `base + step × (rites this empire has started)`. The base is 20. The research age no longer sets the price.
- **Reading 1:** the step is **5 faith**: 20, 25, 30 and so on. The 14th rite costs 90, today's price in the fourth age. The two numbers live in `data/religion.json` (`rite.baseCost`, `rite.costPerRiteStarted`, or names in the file's style), and `costByAge` goes.
- **Reading 2:** "each rite the empire has started" counts every rite any of the empire's towns has started this game, of any kind, from the same moment that pays `riteStarted`. If the game already keeps that count on the player, read it. If it does not, add one counter on the player, raised in the one place a rite starts, and never lowered.
- **Reading 3:** the price stays one reading. The rite button, the refusal, the charge and the bots ask the same function. Where the game prints a price breakdown for a rite, print the base and the step as two lines; where it prints only a figure, the figure is enough.
- **Reading 4:** any card that changes a rite's price applies to the new figure, in the same order as today.
- The rites still need Divination. The comment moves The Rogations to Tier I "for now" (batch R2b); it does not move the technology.

### 2. A pantheon god is no longer one per world

On The Old Gods Remain: *"remove, overlap with stonehenge. One more thing: lets make all pantheons available to draft (no longer one in the world)"*.

- **Today:** `beliefPool` (`src/sim/religion.ts`) leaves out every pantheon belief another empire holds (the user's ruling of 2026-08-29, "a god belongs to one world").
- **The rule:** the pool leaves out only the gods this empire already holds. Two empires may hold the same god.
- **Reading 5:** this is for pantheon gods only. Founder, follower and enhancer beliefs keep today's rules.
- Find every other reader of the old rule (a "taken by" label, a bot that avoids a rival's god, a test, the Compendium, `docs/beliefs.md` or `docs/religion-v2.md`) and bring it in line.

## R2b: the cards

| Card | Where | The comment | The change |
|---|---|---|---|
| The Old Gods Remain | Devotion, Tier 0 | *"remove, overlap with stonehenge"* | Retired. |
| The Sacred Precincts | Devotion, Tier I | *"remove"* | Retired. |
| The Monastic Builders | Devotion, Tier I | *"remove, kind of boring"* | Retired. |
| The Founding Vows | Devotion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Rogations | Devotion, Tier 0 | (quoted under rule 1) | Tier I. |
| The Gifts of the Faithful | Devotion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Shrine Guards | shared with Dominion, Tier 0 | *"move to tier 1"* | Tier I. |
| The Schoolmen's Charter | shared with Scientific, Tier I | *"revise: create a new religious building instead of unlocking cathedral and apostle. effect: +2 science for every building that supplies faith in this city, doubled while this city has an active rite."* | Revised, with a new building (below). |
| The Tithe Barns (new) | Devotion, Tier 0 | *"add: +1 faith and +1 production in every city with a granary"* | New card. |
| The Royal Cult (new) | Devotion, Tier 0 | *"add: +1 faith for each population in your capital"* | New card. |
| The Temple Storehouses (new) | Devotion, Tier I | *"add: +2 happiness and +2 food on every temple"* | New card. |

Retired rows keep `retired: true` and stay in the data for saves (CLAUDE.md). Moved cards keep their text, rarity and type.

### The new cards

| Card | Tier | Rarity | Type | Text |
|---|---|---|---|---|
| **The Tithe Barns** | 0 | common | Economic | Cities with a Granary gain +1 faith and +1 production. |
| **The Royal Cult** | 0 | uncommon | Civic | Your capital gains +1 faith for each citizen. |
| **The Temple Storehouses** | I | common | Economic | Temples give +2 food and +2 happiness. |

- **Names** (the orchestrator's; the user did not name them): the tithe barns of medieval estates, which stored the Church's tenth of the harvest; the royal cult of the capital's temples in Egypt and Mesopotamia; and the temple storehouses of the temple economies, which kept grain.
- **Reading 6:** The Royal Cult is uncommon because it is large early: a capital of six citizens makes six faith a turn in Tier 0.
- **Reading 7:** each uses a shape that exists: a city line under a building scope (The Agora: "+3 gold in each city with a Granary"), a capital line paid per citizen (Market Day: "+1 gold per citizen in your capital"), and a city line with happiness under a building scope (The Wayside Shrines: "Cities with a Shrine gain +2 food and +1 happiness"; a town holds one Temple, so "Temples give" and "cities with a Temple gain" pay the same). If one needs a new shape, stop and report; do not bend a near fit.
- Flavour lines: write one for each, in the style of the deck's rows, labelled Flavour as always.

### The Schoolmen's Charter and the Cathedral School

- **Today:** the charter opens the charter technology Scholasticism. Knowing it lets the empire build the Cathedral and buy the Apostle before Theology (`data/techs.json`, Scholasticism's `unlocksBuilding` and `unlocksUnit` effects; Devotion batch DV2).
- **The change:** Scholasticism no longer opens the Cathedral or the Apostle early. It opens a new religious building, **the Cathedral School**. Name: the cathedral schools of the eleventh and twelfth centuries, where the schoolmen taught before the universities.
- **The Cathedral School:** a religious building (the faith category), medium size, opened only by knowing Scholasticism (its `unlocks.buildings`). It gives +2 science for each religious building in its town, and +2 more for each while the town keeps a rite.
- **Reading 8:** "every building that supplies faith" is read as the town's religious buildings (the faith category, wonders of that category included), because that count exists and the deck's cards already say "religious buildings". The Cathedral School is one, so it counts itself. If the game already has a count of a town's buildings whose own row yields faith, use that instead and say so. Do not add a new count for this.
- **Reading 9:** "doubled while this city has an active rite" is a second line of the same size under the scope of a town keeping a rite (`keepingRite`).
- **The card's new text:** "Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral School: +2 science for each religious building in the town, doubled while the town keeps a rite. No chair required."
- The early-unit purchase path that DV2 added to `purchase.ts` stays as general code; no card uses it after this.
- Update the shared row on the Devotion and Scientific sheets, the Scientific deck's charter notes if they name the Cathedral or the Apostle, and the Compendium if it has hand-written words about Scholasticism.

### Sheets and docs

- `docs/decks/devotion.md` is the spec of record: move, retire and add the rows there (the retired rows to its "Retired rows" section), and update its count tables. `docs/decks/dominion.md` and `docs/decks/scientific.md` carry the two shared rows. `docs/orders-and-doctrines.md` mirrors the data. Their sync tests must pass.
- Add a "Built" note to this file's end when each batch passes the gate.

## Not in these batches

- The rest of the Devotion deck, and the other decks' sheets.
- When the rites open (Divination). The comment moves the card instead.

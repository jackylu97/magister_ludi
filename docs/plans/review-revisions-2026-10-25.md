# Batch R1: the review comments on built cards (2026-10-23 and 2026-10-25)

**Status:** the spec of batch R1, written 2026-10-25 before any agent starts. The user left these comments on the deck review page (https://claude.ai/artifact/UWXhWQ3Rfz9Bkmg8VTmZjS). Every card here is already built, so each comment is a change to data, code or a sheet. The user's words are quoted verbatim. Where a comment leaves a choice open, the row gives a **reading**: the build uses it unless the user changes it.

The user's request of 2026-10-25, verbatim: *"ok i've commented on both, please fold those in and begin implementing devotion and magisterial. Please do a pass on the doctrines for the remaining decks"*. The Dominion and Scientific comments below are from 2026-10-23 and were missed then; they are folded in now.

## The changes

### Dominion (`data/decks/dominion.json`, `docs/decks/dominion.md`)

| Card | Now | The user | New text, or what changes |
|---|---|---|---|
| The King's Levy | Tier 0, rare: "Every fifteen turns your capital raises a melee unit for free. It costs no upkeep." | *"revise: add "gain a melee unit in your capital". move to tier 1"* | Tier I. "When drafted, your capital gains a melee unit. Every fifteen turns it raises another for free. They cost no upkeep." **Reading:** the drafted unit is the same unit the fifteen-turn levy raises, and it also costs no upkeep. |
| The Standing Army | Tier 0, uncommon, shared with Commerce (`common.json`) | *"move to tier 1 (barracks appear later)"* | Tier I, in both decks. Text unchanged. It stays the early shared card of the Dominion and Commerce pair. |
| The Drill Grounds | Tier 0: "Units standing in your towns gain 1 experience every 4 turns." | *"revise: every 3 turns"* | "Units standing in your towns gain 1 experience every 3 turns." |
| The Campaign Annals | Tier 0, rare: "While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science." | *"revise: this card gains +3 science each time one of your units earns a rank."* | "While seated, this card gains +3 science each time one of your units earns a rank. It starts at +3 science." **Reading:** the start of +3 stays. |
| The Cattle Raid | Tier 0, common | *"remove, too similar a shape to the bards' praise"* | Retire the row. |
| The Defiant Kingdom | Tier 0, uncommon | *"remove"* | Retire the row. |
| Copying the Enemy | Tier I, uncommon, shared Scientific and Dominion (`common.json`) | *"remove"* (on the Dominion list's shared table) | Retire the row. **Reading:** the card is removed from both decks. It pays on kills, so a Scientific seat alone would rarely use it. If the user meant only "not in Dominion", it becomes a Scientific card instead. |

### Scientific (`data/decks/scientific.json`, `docs/decks/scientific.md`)

| Card | Now | The user | New text, or what changes |
|---|---|---|---|
| The Almanac | Tier 0, common: "Libraries cost 25% less production and give +1 production." | *"implemented incorrectly, it's making libraries more expensive, when it should be less expensive"*, then *"revise: give +2 production"* | **A bug first:** with the card seated, a Library must cost 25% less, and the user saw it cost more. Find the cause, fix it, and pin it with a test that compares the Library's cost with and without the card. Then: "Libraries cost 25% less production and give +2 production." **Reading:** the discount stays and the production goes from +1 to +2. |
| The Secret Arts | Tier I, uncommon: "Each town gains +1 production for each technology you know that no empire you have met knows, at most +5." | *"this should count charter technologies"* | Charter technologies count toward it. No met empire can know one, so each charter technology you know adds +1. Keep the cap of +5. If the count already includes them, say so and change only the text if it needs it. |

### Commerce and Magisterial (`data/decks/common.json`, `docs/decks/commerce.md`, `docs/decks/magisterial.md`)

| Card | Now | The user | New text, or what changes |
|---|---|---|---|
| The Art Dealers | Tier I, common: "Each card you draft grants 15 gold." | *"revise: +3 gold for each card slotted in your government"* | "+3 gold for each card seated in your government." **Reading:** an empire flat of +3 gold for each Order in a chair. Charters take no chair, so they do not count. The `cardDrafted` moment stays: The Court Painter and The Accessions Register will read it when the Magisterial build makes them. |

### Devotion (`data/decks/devotion.json`, `docs/decks/devotion.md`)

These two are live cards that the Devotion pass keeps. The Devotion build plan treats them as done by this batch.

| Card | Now | The user | New text, or what changes |
|---|---|---|---|
| The Fast (charter) | Tier I: "Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains faith equal to its population each turn. No chair required." | *"gain science and culture instead of faith"* | "... and gains science and culture equal to its population each turn." **Reading:** science and culture each equal to the town's population, every turn of the rite. The rite row in `data/` changes with it. |
| The Rites Commonwealth | Tier I, rare: "Cities keeping a rite demand 25% less population happiness. Your cities without a rite gain −1 happiness." | *"remove malice"* | "Cities keeping a rite demand 25% less population happiness." |

## What else to check

- **Chair types after the moves.** The King's Levy, The Standing Army and The Defiant Kingdom were Tier 0 Military cards. After the batch, check that Dominion and Commerce each still have Military-typed cards at Tier 0. If one has none, report it. Do not invent a card.
- **Tests and fixtures** that seat or pin a retired or moved row, the deck tests' row counts and band spreads, `test/fixtures/cardText.json`, and the sorted sheets' shared tables.
- **Bot pricing** (`src/ai/value.ts`): The Art Dealers' new shape and The Fast's new pay.
- **Saves.** A retired row stays in the data for old saves. Raise `SCHEMA_VERSION` only if a stored shape changes.
- **The sheets.** Each changed card's row shows the new text and stays `implemented`. A retired card leaves the tables and gets a line in the sheet's notes, with the date and the user's words.

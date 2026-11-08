> Kept as the spec of record for stage 3 of `docs/plans/performance-pass-2026-11-06.md`. Line numbers are those of `7e76fee0`. A read-only agent wrote it; the orchestrator read it in full before the batches were planned.

# Stage 3 audit: encapsulation after the Doctrine build

Written 2026-11-07 by a read-only agent. Nothing in the repo was edited, and no test, build or long command was run.

- **Tree read:** branch `decks` at `643f3ff0`, with batch U2's uncommitted edits. So `export` means that another file uses the declaration.
- **Diff read:** `2a73a7e5..a207602a -- src`, 57 files, +6,507 and -913 lines.
- **Plan read:** `docs/plans/performance-pass-2026-11-06.md`, stage 3 and its rules. Every batch below is a move or a merge that changes no decision and needs no schema bump.

**Tools.** Each script is in `~/code/webciv-review/`. Each parses source with `node_modules/typescript` and runs in about 3 s.

| Script | What it does | Output |
|---|---|---|
| `s3-callgraph.cjs` | Builds the call graph inside one file and finds clusters (Louvain). It lists who outside the file imports each name. | `s3-value.json`, `s3-eval.json`, `s3-bot.json`, `s3-draft.json`, `s3-*-coarse.txt`, `s3-*-fine.txt` |
| `s3-sections.cjs` | Counts edges between the `// ---` sections of a file. | `s3-value-sections.txt`, `s3-eval-sections.txt` |
| `s3-diffdecls.cjs` | Lists the declarations the Doctrine build added or changed, and where each one is now. | `s3-diff-*.txt` |
| `s3-dupes.cjs` | Finds near-copies by token 5-gram similarity, for functions the build touched. | `s3-dupes.txt` |
| `s3-trace.cjs` | Finds the code lines that name each sampled Doctrine's identifiers. Comments and import lines are excluded. | the table in 1.1 |

---

## 1. Findings

### 1.1 Where the Doctrine logic lives

**The path of one Doctrine is fixed by the layers.** These are the layers that E3b chose ("files by layer, not by topic", `docs/audit/evaluations.md` §4b step 9):

1. The data row (`data/decks/<deck>.json`).
2. The type member in `src/sim/statecraftData.ts`.
3. One reader in `src/sim/statecraft/evaluator.ts`.
4. The seam that the system file asks (for example `cities.ts`, `trade.ts` or `improvements.ts`).
5. The words in `src/sim/statecraft/describers.ts`. This is a table entry, and sometimes a switch arm too.
6. The bot's price in `src/ai/value.ts`, often with a knob in `aiConfig.ts` and `data/ai.json`.
7. The UI surfaces.

**46 of the 98 Doctrines are data only.** These are group 1 of the triage, and 7 of them did not change. They have no code of their own. The other 52 added a shape: 51 in group 2, plus Human Sacrifice in group 3.

**Twelve samples across the six decks.** Each row counts the `src/` files and the regions, where a region is code lines within 120 lines of each other in one file. Data rows are included and comments are not.

| Doctrine | `src` files | Regions | Where |
|---|---:|---:|---|
| The Steppe Confederacy (Dominion I, `targetWounded`) | 3 | 4 | `statecraftData.ts:1566`, `evaluator.ts:8146`, `describers.ts:6042`. The bot has no code for it, because the generic condition price reads it. |
| Centurions (Dominion II, `rank` on a rebate) | 1 | 2 | `evaluator.ts:7103` (`rebateReaches`) |
| The Universal Monarchy (Dominion III, "from now on") | 13 | 21 | `state.ts` 4 places (`foundedTurn`), `draft.ts:545,3425` (`doctrineTurns`), `evaluator.ts:2585,2992,4180,7967`, `meters.ts:897`, the two ghost seats `value.ts:6083` and `cardImpact.ts:419`, `barbarians.ts`, `religion.ts`, `notifications.ts` |
| The Wildwood Compact (Expansionist II) | 9 | 25 | `improvements.ts:915` (`workChargeCost`), `draft.ts:1323,1991` (the gate), `value.ts:9006,9136`, `unitPanel.ts`, `controls.ts`, `compendium.ts` |
| Human Sacrifice (Expansionist II, group 3) | 9 | 12 | `levies.ts:195,367`, `religion.ts:2273`, `evaluator.ts:11180`, `value.ts:10197,10341`, `bot.ts:3717`, `levyMenu.ts`, `religionScreen.ts`, `main.ts` |
| The Grand Canal (Commerce II) | 12 | 17 | `evaluator.ts:12412`, `cities.ts:3468-3607` (one block), `yields/empire.ts:128`, `readings.ts:307`, `value.ts:9623-9701,10733`, `routes.ts:224`, three UI files |
| The Sea Ban (Commerce IV, `noForeignRoutes`) | 11 | 17 | `trade.ts:300,864,1344`, `turn.ts:1322`, `commands.ts:4443`, `value.ts:9519`, `bot.ts:3903`, `routes.ts:334`, `tradeScreen.ts`, `tradeLines.ts` |
| The Court of Rudolf II (Scientific IV, `techPrice`) | 5 | 9 | `tech.ts:2144`, `evaluator.ts:7427`, `describers.ts:1967,5367`, `value.ts:5173,8650` |
| The Two Capitals (Scientific IV) | 8 | 35 | `evaluator.ts` 6 regions (2451, 2999, 3388, 4691, 5417, 7972), `value.ts` 7 regions (2845, 3241, 3489, 5842, 6513, 7003, 8312), `trueCapital` in 7 data files |
| Scutage (Magisterial III) | 6 | 12 | `evaluator.ts:925,1391,13958`, `draft.ts:1004,1190`, `value.ts:12247,13135`, `bot.ts:2527` |
| The Hospitium (Magisterial I) | 5 | 10 | `draft.ts:1348,1668,1889` (bag, positions, expected bags), `value.ts:11974,12178,13130`, `cities.ts:6598` |
| The Apostolic Camera (Devotion IV) | 4 | 6 | `evaluator.ts:4984` (`explainFollowerLinesAbroad`), `value.ts:10882,11542` |

What the table shows:

- **A Doctrine that adds one rule at one seam is local.** It touches 1 to 5 files and 2 to 9 regions. Examples: The Steppe Confederacy, Centurions, The Court of Rudolf II and The Apostolic Camera.
- **A Doctrine that adds a new fact about the board is spread out.** Examples: a turn stamp, a second capital, food along a route and a refusal at the trade seams. These touch 8 to 13 files and 17 to 35 regions, because every reader of the fact must know about it. A move does not change that count. The sim half is usually one block (The Grand Canal's seven functions sit together at `cities.ts:3468-3607`).
- **The spread that a move can fix is inside files:**
  - `value.ts` files each rule's price under a deck section, but the shared machinery is spread across the file. The Two Capitals touches 7 regions of `value.ts`.
  - The council code is in two parts of `draft.ts`, 1,300 lines apart (969-1199 and 2508-3235). Scutage and The Arthashastra read both parts.
  - The Hospitium reads three places in `draft.ts`.
- **Where a reader starts.** The type member's docblock in `statecraftData.ts` names the sim reader, for example "Read in one place, `cardSurplusCarrier`, and paid by `explainFoodCarried`" (line 5333). It does not name the bot's price. A reader must search `value.ts` for the rule id, and the id sits in one of seven dispatch functions (see 3, item 10).
- **Two headings name only the start of what they cover:**
  - `value.ts:746` "the wager's lean" covers 1,040 lines, but only lines 746 to 875 are about the wager. The prices that the whole file uses (`delayDiscount`, `voiceWeight`, `hammerPrice`, `sciencePrice` and more) have no heading.
  - `evaluator.ts:11970` "what a town holds" covers 2,284 lines, but only lines 11970 to 12078 are about a town's buildings. The other 78 values are seam readers for the Opus, refusals, purchases, unlocks, religion, renown, routes, amplifiers, chairs and founding.
- **A detached docblock.** The docblock of `commerceRuleWorth` ("The rules of Commerce batches T3 to T6") is at `value.ts:9499-9508`, directly above `doctrineRuleWorth`'s own docblock. `commerceRuleWorth` at 9610 has none. DT7 put its function between the two.

### 1.2 Groups that hold together

**`src/ai/value.ts`** has 446 top-level declarations, of which 433 are values. The graph is a hub with spokes:

- The hub is `scoreEffect` (3494-4273, 782 lines). It switches on `effect.kind`.
- The arms are filed by deck, and they call back into `scoreEffects` and `explainEffects`.
- Two layers under the hub call nothing back:

| Group | Lines now | Size | Its job | Entry points | Depends on |
|---|---|---|---|---|---|
| **G1, the prices** | 413-417, 746-1786, 4290-4308 | 42 declarations, 1,112 lines | What one point of each voice, a hammer, a beaker, a point of faith, a meter point and a turn of delay are worth to one seat | 34 names. 8 other `src/ai` files import 26 of them: `bot.ts` 18, `wants.ts` 10, `chain.ts` 8, `plan.ts` 5, `wager.ts` 3, `routes.ts` 3, `citizen.ts` 2, `diplomacy.ts` 1 | Only `ValueContext` (a type) from `value.ts`; otherwise `./decision`, `./aiConfig` and the sim. The rest of `value.ts` calls it 116 times. |
| **G2, the scope's reach** | 2245-2266, 2536-3166 | 28 declarations, 682 lines | How many of a seat's towns, capitals and worked hexes a card's scope reaches, and what share of a hex's yield a hex line changes | 14 names (`townsAdmitting` is called 13 times, `workedHexesAdmitting` 5 times, `capitalAdmits` 4 times) | G1 only (`delayDiscount`, `voiceWeight`, `VOICES`), plus the sim's own predicates (`cityScopeAdmits`, `cardCapitalIds`, `tileConditionHolds`, `cityContext`, `foldTile`) |
| G3, the hub and its readings | 3167-7034 | about 3,900 lines | Prices one effect, by kind | `scoreEffect`, `scoreEffects`, `explainEffects`, `explainCardEffects` | Every other group. It calls into every deck section. |
| G4, the deck sections | 7568-13425 | Dominion 175, Scientific 1,101, Expansionist 423, Commerce 879, the levy 684, Devotion group 1,090, Magisterial 1,511 | Each deck's rule prices, with the knobs of `score.<deck>` | One `xRuleWorth` each, plus 2 to 24 names that other sections call | The hub (Magisterial calls it in 9 functions), and each other: Scientific to Magisterial (5 edges), Scientific and Commerce to the commissions (5 each), Commerce to Devotion (2) |

- G1 and G2 are the only groups that leave `value.ts` with no import cycle.
- Every G4 section calls the hub, so moving it out makes a two-way cycle with `value.ts`.

**`src/sim/statecraft/evaluator.ts`** has 389 declarations. It falls into three layers:

| Layer | Lines | Size | Calls in from the rest of the file | Notes |
|---|---|---|---|---|
| E1, the walk ("what is live") | 331-1866 | 1,536 lines, 50 values | 161 | It calls out only 8 times. 12 of the file's 22 `CardEffect.kind` checks are here. |
| E2, the predicates (conditions, city scopes, counts and rates) | 1867-4616 | 54 declarations, 2,804 lines | 17 names (`cityScopeAdmits` 51 times, `label` 29, `helpings` 19, `countOf` 17) | It calls out to 24 names, for example `heldReligions`, `townBuildings`, `groundFactsFor`, `unitMatches`, `cardBehaviorRule` and `liveEffects`. It holds **no** `CardEffect.kind` check: the checks at 2034, 2049, 2134, 2550, 2564 and 4197 are on queue items and resources. |
| E3, the readers | 4617-14253 | the rest | few: "percentages" 0, "the meters" 2, "combat" 3 | They are leaves over E1 and E2. The tail (12079-14253) holds 78 seam readers of 5 to 80 lines each. |

The other 10 `CardEffect.kind` checks are at 5027, 7184, 7215, 11262, 12978, 13000, 13032, 13097, 13098 and 13244, spread over five sections.

**`src/sim/statecraft/draft.ts`: the council.** It is spread over two places:

- **What it holds:**
  - The chairs at 969-1199: `slotTypesOf`, `chairCount`, `chairLayoutUnder`, `typedChairsOf`, `refitSlots`, `chairIndexAtPosition`, `orderAtSlotPosition` and `ghostCouncilUnderDoctrine`.
  - The fit, the slots and the malices at 2508-3029.
  - `reseatOrders` and `reseatCouncil` at 3127-3235.
  - In all, 34 declarations and about 960 lines.
- **What calls it:** the rest of `draft.ts` calls in through `adoptGovernmentAt` (`chairFitFor`, `chairCount`, `reseatCouncil`, `settleCouncilFit`).
- **What it calls back:** five small helpers: `statecraftOf`, `holdsOrder`, `isSlotted`, `commissionFulfilledTurn` and `drawWithoutReplacement`.
- **The Doctrine build changed it in four batches:** DT9, DT11, DT19c and DT20.

**`src/ai/bot.ts`: the council and offer decisions.** These are lines 2420-2830 and 2994-3493.

- **Size:** 19 declarations and 932 lines.
- **What it calls in `bot.ts`:** three names: `seatContext`, `foldOf` and `unweighed`.
- **What calls it:** `answerBlocker`, `housekeeping`, and the `cardWorth` closure in `valueContext`.
- **The Doctrine build changed four of its functions:** `slotPairTerms`, `moveToCountedChair`, `adoptionTable` and `skipCandidate`.

### 1.3 What is repeated

- **Reuse in the Doctrine build is mostly good.** The bot asks the sim's own readers:
  - `cardCollectionShare` ("the same reading for the bots");
  - `foodAlongRoute`, `carriableSurplus` and `surplusShareCarried`;
  - `secondCapitalCity`, `explainFollowerLinesAbroad` and `cityScopeAdmits`.

  DT19 put the parts shared by a prophet's rite and a levy's rite into `realmRiteError` and `sayRiteOverRealm`.
- **The repeats are small.** The largest are:
  - the Doctrine ghost seat, written twice;
  - four `cityCost` readers that walk the same rows four times;
  - three lists of the kinds that a second reading leaves out, copied by hand into the bot;
  - seven dispatch functions for one switch.

  Section 3 lists all fourteen.
- **The near-copy scan** (`s3-dupes.txt`) found nothing larger. Its other high scores are the reducer's validate-then-apply arms in `commands.ts`, which are the intended form.

---

## 2. Proposed batches, ranked by what a reader gains for the risk

Rules for every batch:

- The code moves unchanged.
- Each name that the old file now imports gains `export`.
- The pins stay unchanged: the two-deck games at seeds 999 and 42, and `test/sim/aiDigest.slow.test.ts`.
- There is no schema bump.
- The narrow tests and the registers listed under each batch must pass.
- **Keep new `src/ai` files flat.** 21 register globs read `src/ai/*.ts` and only one reads `src/ai/**`, so a subfolder would hide the moved code from them.

### S1: the bot's prices leave `value.ts`

- **Moves:** from `src/ai/value.ts` to the new `src/ai/prices.ts`:
  - lines 413-417 (`VOICES`, `Voice`, `YieldBag`);
  - lines 746-1786 (the wager's lean and the prices, 37 declarations);
  - lines 4290-4308 (`RATES_MEMO`, `ratesOf`).
- **Its job:** what one point of each voice, a hammer, a beaker, a point of faith, a meter point and a turn of delay are worth to one seat at this sitting.
- **Exported surface (34):**
  - `VOICES`, `Voice`, `YieldBag`, `WagerAppetite`, `WagerLean`, `wagerAppetiteTerm`;
  - `delayDiscount`, `delayTerm`, `buildTurns`, `townProduction`, `yieldWeight`, `ageBand`, `voiceWeight`, `PricedMeter`, `meterWeight`;
  - `hammerPrice`, `hammerTerm`, `sciencePrice`, `faithPrice`, `routeSlotTerm`;
  - `realmResources`, `spareResourceCopies`, `newResourceTerms`, `meterWords`, `explainMeterCall`;
  - `explainYields`, `valueOfYields`, `explainLump`, `lumpOfPoints`, `bagOfTileYield`, `yieldDelta`, `explainUpkeepCost`, `costOfUpkeep`, `ratesOf`.
- **Private:** `wagerShare`, `wagerVoicePremium`, `wagerLift`, `baseVoiceWeight`, `weightWords`, and the three memos.
- **What the reader gains:**
  - Every reading in `value.ts`, and 8 other bot files, is built on these prices.
  - Today they are lines 746 to 1786 of a 13,425-line file, under a heading that names only the first 130 lines.
  - After the move they are one file of about 1,110 lines that imports nothing from `value.ts`. A reader can learn the bot's units of account first, in one place.
- **Edits:**
  - `value.ts`: the cut, and its import block.
  - The import lines of `bot.ts`, `wants.ts`, `chain.ts`, `plan.ts`, `wager.ts`, `routes.ts`, `citizen.ts` and `diplomacy.ts`.
  - The import lines of 16 test files and 2 scripts. The tests are `aiAppraisal`, `aiDevotion`, `aiExpansionist`, `aiMagisterial`, `aiScientific`, `aiBot`, `aiWants`, `aiPersona`, `aiRows`, `aiCommerce`, `aiPrices`, `aiCommissions`, `aiLevy`, `gridObjective`, `decks/devotionDoctrines` and `decks/scientificDoctrines`. The scripts are `scripts/gridObjective.ts` and `scripts/gridSearch.ts`.
- **Registers to update:**
  - `test/sim/aiBot.test.ts:1314-1334`, the list of `src/ai` files: add `prices.ts`, and update the count in the comment above it.
  - `test/sim/aiWants.test.ts:1846`: the readers of `newLuxuryBonus` become `['aiConfig.ts', 'prices.ts']`, because `newResourceTerms` moves.
  - `test/ui/spectatePage.test.ts:100`: add `"from '../ai/prices'"` to the banned imports, so the register still forbids the page any appraisal.
  - `test/sim/readings.test.ts:784` (`['value.ts', 'readCity']`): it stays true, because `value.ts:9653` and `9693` still read `readCity`. Check it after the cut.
  - `test/sim/resourceBonuses.test.ts:552`: no change, because the caller of `unitMaxHp` (`pieceBar`, 2281) stays.
- **Cycle risk:** none, if `prices.ts` writes `import type { ValueContext } from './value'`. Its top-level statements are `new WeakMap()` and literals only.
- **`CLAUDE.md` lines that change:** none.
- **Size:** about 1,110 lines moved, and 26 import blocks edited.

### S2: the scope's reach leaves `value.ts` (after S1)

- **Moves:** from `src/ai/value.ts` to the new `src/ai/scopeReach.ts`:
  - lines 2536-3166, the section "the scope, evaluated (batch X2)" (26 declarations);
  - `townHolding` and `townHoldingOn` (2245-2266).
- **Its job:** how many of a seat's towns, capitals and worked hexes a card's scope reaches, and what share of a hex's yield a hex line changes.
- **Exported surface (14):** `townsAdmitting`, `realmTownsAdmitting`, `oneTownShare`, `capitalAdmits`, `workedHexesAdmitting`, `groundOfHexLine`, `wholeShareOf`, `hexPercentShareOf`, `scopeShare`, `scopeNote`, `promisedMirror`, `promisedYieldPercent`, `empireIncomeShareWorth` and `townHolding`. The five memos stay private, with their docblocks and lifetimes.
- **What the reader gains:**
  - "Where does this line land" is the reading that the Doctrine build fixed most often:
    - DT6: the ring that `groundOfHexLine` lacked;
    - DT13: the counted hex rows;
    - DT17: `capitalAdmits`;
    - DT19b: `oneTownShare` and `hexPercentShareOf`;
    - DT19c: `wholeShareOf`.
  - After the move it is one file of about 680 lines. Every price arm imports it, and it imports nothing back.
- **Registers to update:**
  - `aiBot.test.ts:1314-1334`: the file list.
  - `spectatePage.test.ts:100`: add `"from '../ai/scopeReach'"`.
  - The imports in `aiAppraisal.test.ts` and `aiPrices.test.ts`.
- **Cycle risk:** none. It is a leaf over `prices.ts`.
- **`CLAUDE.md` lines that change:** none.
- **Size:** about 680 lines.

### S3: the schema history leaves `state.ts`

This is outside "the Doctrine logic". It is here because it is the largest cheap gain in reading that I found.

- **Moves:**
  - `src/sim/state.ts` lines 143-3507, the entries v79 to v221 of the `SCHEMA_VERSION` docblock, go to the end of `docs/history/schema-changelog.md`. They move verbatim with the comment prefix taken off, as batch H4 did for entries 3 to v78.
  - Entries v222 to v226 stay. The docblock says "the recent entries stay here because the next bump is written by whoever reads them".
  - Update the docblock's pointer ("entries 3 through v78" becomes "through v221"), the doc's title, and the kept entries that say "for the reason given under v119".
- **What the reader gains:**
  - `state.ts` falls from 8,611 to about 5,250 lines.
  - Its first type (`TimedEffect`) moves from line 3,601 to about line 240.
  - The Doctrine build alone added 21 entries (323 lines).
- **Registers to update:** none. No test reads this docblock (checked). Update the line in `docs/history/README.md` that describes the changelog.
- **Risk:** none on code.
- **Size:** about 3,365 lines of comment.

### S4: the council leaves `draft.ts` (needs the user's answer to question 1)

- **Moves:** from `src/sim/statecraft/draft.ts` lines 969-1199, 2508-3029 and 3127-3235 to the new `src/sim/statecraft/council.ts`. That is 34 declarations.
- **Its job:** how many chairs a seat has and of which type, which card may sit in which chair, where a malice sits, which chair counts twice, and how the council is seated again after an adoption or a Doctrine.
- **Exported surface (about 28):**
  - `slotTypesOf`, `chairCount`, `chairLayoutUnder`, `refitSlots`, `chairIndexAtPosition`, `orderAtSlotPosition`, `ghostCouncilUnderDoctrine`;
  - `chairFitFor`, `orderFitsSlotFor`, `chairFitWithout`, `councilRefit`, `settleCouncilFit`;
  - `slotOrderError`, `SLOT_WORDS`, `chairMisfitRefusal`, `slotOrderAt`, `SlotOutcome`, `sealRemaining`, `unslotOrderError`, `unslotOrderAt`;
  - `maliceAt`, `maliceChairRefusal`, `maliceChairFor`, `MaliceSeating`, `takeMalice`, `shedMalices`, `reseatMalices`, `reseatCouncil`.
- **What the reader gains:**
  - The Doctrine build changed the council in four batches:
    - DT9: The Arthashastra and The Council of Ten;
    - DT11: Scutage;
    - DT19c: the chair that no malice holds;
    - DT20: `chairLayoutUnder`.
  - That code is now in two places 1,300 lines apart, under five headings: "what a player holds", "the fit a council grants", "the slots", "the malice's chair" and "adoption".
  - After the move it is one file of about 960 lines. `draft.ts` keeps the ladder, the pools, the hands, the offers and the adoption, and falls to about 2,520 lines.
  - `chairReadingsAt` and `cardExtraChairs` stay in the evaluator, because they are readers of the walk.
- **Registers to update:**
  - The index `src/sim/statecraft.ts`: a fourth block, re-exported by name and never with `export *`.
  - `test/sim/slateRegister.test.ts`: six keys move from `draft.ts#…` to `council.ts#…`. They are `seatMalice` (278), `settleCouncilFit` (281), `refitSlots` (285), `slotOrderAt` (335), `unslotOrderAt` (537) and `reseatCouncil` (549).
  - `test/sim/decks/magisterialConstitution.test.ts`:
    - the `draft.ts#` keys at 515-519 and the switch on the file name at 528;
    - `bodyOf('sim/statecraft/draft.ts', 'slotOrderError')` at 549-550;
    - the list of `orderFitsSlot` readers at 545, because all four reads in `draft.ts` (2528, 2565, 3132, 3214) move.
  - `test/sim/typedChairs.test.ts:509-538`: its glob names `draft.ts`, and it reads the body of `reseatCouncil`.
  - The direct importers: `evaluator.ts:315-323`, `commissions.ts:93`, `value.ts` (the block that ends at line 298) and `aiMagisterial.test.ts`.
  - `test/mapgen/moduleCycles.test.ts` covers the new file through its glob. Run it.
- **Cycle risk:**
  - A function-level cycle runs both ways with `draft.ts` (5 helpers out, 4 names in) and with `evaluator.ts`. `statecraft/` already lives on this kind of cycle (`evaluator.ts` and `draft.ts`).
  - Check that no top-level statement reads an imported value. `SLOT_WORDS` and `CHAIR_WITH_ARTICLE` are literals.
- **Lines that change:**
  - `CLAUDE.md` lines 122-126, under Layout: "the card system in three … `statecraft.ts` is the index that re-exports all three by name".
  - `docs/README.md:542` and `:576`.
- **Size:** about 960 lines.

### S5: the bot's council and offers leave `bot.ts` (needs S0 first, and the user's answer to question 2)

- **S0, the guard:**
  - Add a load-order test for `src/ai/*.ts`, in the form of `moduleCycles.test.ts`: load each module first after `vi.resetModules()`, then run one bot command on a duel board.
  - `src/ai` already has many function-level cycles (for example `value.ts` with `chain.ts`, `wants.ts`, `routes.ts` and `campaign.ts`), and no test covers them.
  - Measure its cost before it joins the core tier. The sim's sweep takes 2 to 4 s a module, and `src/ai` has 19 modules.
- **Moves:**
  - From `bot.ts` lines 2420-2830 to the new `src/ai/council.ts`: `slottingDecision`, `slotPairTerms`, `reslotDecision`, `moveToCountedChair`, `sealedThisTurn` and `adoptionTable`.
  - From `bot.ts` lines 2994-3493 ("the offers") to the same file: `orderDecision`, `skipCandidate`, `doctrineDecision`, `beliefDecision`, `beliefRedeal`, `redealBag`, `discoveryDecision`, `pickCard`, `scoreCard`, `explainCard`, `cardName`, `decksOf` and `heldInDecks`.
  - From `bot.ts` 9498-9557 ("naming a decision") to `src/ai/decision.ts`, which is the module of `BotCandidate`: `rankTerms`, `chosenAt`, `refused`, `unweighed`, `townSubject`, `itemName`, `unitLabel` and `foldOf`.
- **Its job:** how a bot answers an Order, Doctrine, belief or discovery offer, which cards it seats in which chairs, and how it weighs a government.
- **Exported surface (10):** `slottingDecision`, `reslotDecision`, `adoptionTable`, `orderDecision`, `doctrineDecision`, `beliefDecision`, `discoveryDecision`, `explainCard`, `scoreCard` and `cardName`.
- **What the reader gains:**
  - The four functions that the Doctrine build changed in this area sit in two places of `bot.ts` today: inside the 1,730-line section "the one entry point", and in "the offers".
  - After the move they are one file of about 930 lines.
  - `bot.ts` keeps the entry point, the towns, the units and the banks, and falls to about 8,630 lines.
- **Registers to update:**
  - `aiBot.test.ts:1314-1334`: the file list.
  - `magisterialConstitution.test.ts:558-559`: the three `chairFitFor(state, player.id)` and the one `chairFitWithout(state, player.id, slot)` are all in moved code (2451, 2594, 2771, 2628).
  - `aiWants.test.ts:2280`: the only file that asks `'rerollOffer'` becomes `council.ts` (`beliefRedeal`, 3300).
  - `spectatePage.test.ts:100`: add `"from '../ai/council'"`.
  - The test imports of `scoreCard` (12 files) and `explainCard`.
  - These are not affected: `doctrinePriceLines.test.ts:105` (lines 5004-5159), `seatNames.test.ts:141` and `weariness.test.ts:692`.
- **Cycle risk:**
  - `council.ts` and `bot.ts` call each other. `council.ts` calls `seatContext`, and the `cardWorth` closure in `valueContext` calls `explainCard`. Both calls are inside functions.
  - Moving the naming helpers into `decision.ts` removes the other two edges back.
- **`CLAUDE.md` lines that change:** none.
- **Size:** about 990 lines.

### S6 (optional): headings and order in the evaluator's tail

- **Moves:** inside `evaluator.ts` only.
  - Keep lines 11970-12078 under "what a town holds".
  - Group the 78 readers of 12079-14253 under headings for the seam that asks:
    - the Opus;
    - the behaviour rules and refusals;
    - purchases and unlocks;
    - religion;
    - renown;
    - routes;
    - amplifiers and chairs;
    - founding.
  - The smallest form adds headings and moves no function.
- **What the reader gains:**
  - A reader who scans for "what can a card change about trade" finds every trade reader under one heading.
  - Today the 2,175 lines have one heading that is wrong for 2,100 of them.
- **Registers to update:** none. No test reads the evaluator by order (checked: no `between` or two-name slice on it).
- **Risk:** low. The cost is that `git blame` points at this batch.
- **Size:** up to 2,175 lines in the same file.

---

## 3. Simplifications (no move, no decision change)

Each one must leave the pins and `test/fixtures/cardText.json` unchanged. Items 1 to 9 fit in one sim batch. Items 10 to 14 fit in one bot batch, after S1 and S2.

1. **The city-cost rows.**
   - The duplicate: `cardCityCostDelta`, `cardCityCostDiscount`, `cardCityCostValue` and `cardCityCostPercent` (`evaluator.ts:7893-7954`) walk the same `meterRule` rows four times for one town. `meters.ts:762-767` calls all four to fill a `CityCostRows` record. `cardProspectCityCost` (7967) already builds that record in one walk.
   - The one place: one `cardCityCostRows(state, city)`, which shares its fold with `cardProspectCityCost`. The only difference is the scope test.
   - The gain: one walk instead of four, for each town at each authority reading, and three fewer exported names.
   - Risk: none. The arithmetic is the same: the least `value`, the sum of `percent`, and the deltas split by `noMinimum`.
2. **`cardUpgradeStrength`.**
   - The duplicate: `cardUpgradeStrength` (12432) writes `ruleFigures` (12504) again, for the field `value`.
   - The one place: `ruleFigures`. Add `'value'` to its field union, and sum its answer.
   - Risk: none. The class filter is the same when a piece is in hand.
3. **`cardLevyEvery`.**
   - The duplicate: `cardLevyEvery` (11180) is `cardLevyReturnDelay` (11150) with another field.
   - The one place: one helper for "the shortest whole-turn figure of the live levy rows".
   - Risk: none.
4. **`cardBeliefPoolSlots`.**
   - The duplicate: `cardBeliefPoolSlots` (13148) and `cardPantheonSlots` (13133) are one walk.
   - The one place: one reader that takes `pool?`.
   - Risk: none.
5. **The Doctrine ghost seat.**
   - The duplicate: `deckPair` (`value.ts:6064-6092`) and the `'doctrine'` case of `ghostPair` (`cardImpact.ts:399-431`) are the same two cases:
     - a held Doctrine: take the id out, with `ghostCouncilUnderDoctrine(…, false)`;
     - a Doctrine not held: add the id and stamp `doctrineTurns` with this turn, with `ghostCouncilUnderDoctrine(…, true)`.
   - The one place: beside `ghostCouncilUnderDoctrine` (`draft.ts`, or `council.ts` after S4). One function returns the ghost `Player` and which side of the pair it is.
   - Risk: none. Both callers always take the malices from the ghost council.
6. **The kinds that a second reading leaves out.**
   - The duplicate: the evaluator's `CHAIR_READS_ONCE`, `GOD_READS_ONCE` and `GOVERNMENT_READ_NOT_AT_ALL` (1559-1565) are copied by hand into the bot: `orderReadAgain` (`value.ts:12755`), `godsAgainWorth` (12786) and `otherGovernmentsWorth` (12808).
   - The one place: the evaluator. Export the three lists by name through the index. The bot adds its own kinds (`YES_OR_NO_KINDS` and `cardYieldAmplifier`).
   - Risk: none today, because the sets are the same. After the change, a change to the walk also reaches the price.
7. **The row test of The Apostolic Camera.**
   - The duplicate: `followerLinesInOneTown` (`value.ts:11561`) repeats the row test of `explainFollowerLinesAbroad` (`evaluator.ts:5027`: `pays`, `where:'city'`, no payee). It also repeats `VOICES_AN_EMPIRE_BANKS`, by dropping food and production.
   - The one place: the evaluator. Export the test and the list.
   - Risk: none.
8. **The `rulePercent` words.**
   - The duplicate: the `rulePercent` arm of `describeEffect` patches three `RULE_WORDS` sentences with `.replace()`: `tilePurchase` with a `tile`, `goldContribution` with a `building`, and `techPrice`.
   - The one place: the `RULE_WORDS` entry. It takes the effect and builds the whole sentence.
   - Risk: none, if `cardText.json` does not move.
9. **`levyLineError`.**
   - The duplicate: `levyLineError` (`levies.ts:379`) starts with the three clauses of `citizenFocusError` (`cities.ts:2599`), word for word.
   - The one place: `citizenFocusError`. Call it.
   - Risk: none.
10. **One switch for the bot's rule prices.**
    - The duplicate: the `rule` arm of `scoreEffect` (`value.ts:4042-4152`) is an `if` chain plus seven functions that return `number | null`, filed by batch: Expansionist 9127, Scientific 8283, Commerce 9610, Devotion 10863, Magisterial 13112 and the DT7 refusals 9513. Their rule ids do not overlap (checked).
    - The one place: one exhaustive `switch (effect.rule)` over `CardFlagRuleId` (96 ids). Each case calls the existing helper, and the rules that keep the stand-in become named cases.
    - The gain: one list says how each rule is priced, and a new rule fails the type check until it has a case.
    - Risk: low. The order does not matter, because the sets are disjoint.
11. **The detached docblock.**
    - The problem: the docblock of `commerceRuleWorth` is at `value.ts:9499-9508`.
    - The fix: put it at line 9610.
    - Risk: none.
12. **`foldOf`.**
    - The duplicate: `foldOf` (`bot.ts:9554`) is `foldTerms` under another name, with 35 uses.
    - The one place: `foldTerms`. Use it directly.
    - Risk: none.
13. **The walks that ask "does this test name X".**
    - The duplicate: the same walk appears seven times. In `value.ts`: `scopePromisesABuilding` 2585, `asksAboutGarrisons` 3127, `scopeNames` 8320, `tileTestAsks` 8849 and `scopeAsksFaith` 11641. In `evaluator.ts`: `testNamesWork` 12548 and `testReadsWorkBeside` 12555.
    - The one place: one helper for each kind of tree. Five of the walks go into `all` and `any` the same way and can share it.
    - Keep these apart: `scopeNamesBuilding` and `scopeNamesABuilding` (`evaluator.ts:5200-5217`) and `namesCondition` (`value.ts:7570`) go into `all` only. `tileTestAsks` also goes into `beside`.
    - Risk: low, if each walk keeps its rule. The gain is small.
14. **The context memos (optional).**
    - The duplicate: `value.ts` holds 37 hand-written `WeakMap<ValueContext, …>` blocks that get, compute and set.
    - The one place: one helper `onContext(memo, ctx, compute)`, which states the lifetime (the sitting) once.
    - Leave out `HAND_RULE_MEMO` and `WIDE_FIT_ASKING`. They set a guard value before they compute, to stop a recursion (DT10).
    - Risk: low, but there are many small edits.

**Pairs that look like duplicates and should stay apart:**

- `shutTreasuriesCost` (`value.ts:9574`) counts the shut towns with its own walk, not with `realmTownsAdmitting`, which adds the towns that a chain promises. A treasury is shut today, so the plain walk is the right one.
- `scopeWithoutFaith` (11653) and `scopeWithoutCapital` (8385) have one shape, but they treat an `any` scope differently. A merge would change a price if a row ever puts one of those tests inside an `any`.
- The Order arms of `deckPair` and `ghostPair` choose a chair differently on purpose: the bot's own seating against the stamp's first free chair.
- The typed tuple `VOICES` in `value.ts` beside the evaluator's `VOICES` and `CITY_YIELD_KEYS`: it is older than the Doctrine build, and the bot needs the literal type `Voice`.

---

## 4. Not worth doing

- **Split `evaluator.ts` into files by section.**
  - The sections are already the layers, and a reader finds a reader by its name.
  - The predicates (E2, 2,804 lines) are the only part that keeps "the only module that switches on `CardEffect.kind`" true without care. They already sit together at lines 1867-4616, and a split runs a cycle both ways: 24 names out and 17 names in.
  - Moving the tail (E3) out would take six `CardEffect.kind` checks with it (12978, 13000, 13032, 13097, 13098, 13244), unless those five functions stayed behind.
  - 50 test files name `statecraft/evaluator.ts`. `expansionistCura.test.ts` alone keys 20 rows by "`statecraft/evaluator.ts` › function".
  - The gain is a smaller file and nothing else. S6 gives the reader the same help with no new file.
- **One file for each Doctrine, or a `doctrines` folder.** One Doctrine's rule is a row, a type member, one reader, a seam, its words and a bot arm, and those are different layers. A module for one Doctrine would import from every layer, and every layer would import it back. Doctrines also share their shapes with the Orders.
- **Split `value.ts` by deck now.** Each deck section calls the hub, so each split adds a cycle with `value.ts` in `src/ai`, where no load-order test exists. The sections also call each other, and each one already sits together in the file. Look at it again after S0, S1 and S2, if the user wants smaller files.
- **Split `scoreEffect` (782 lines) into named arms.** That is a code change, not a move. Three places in `aiAppraisal.test.ts` (2622, 2743, 2844) read its `case` labels between `function scoreEffect(` and the first `\n}\n`.
- **A subfolder for the bot** (`src/ai/value/…`). 21 register globs read `src/ai/*.ts` flat.
- **Move the type docblocks out of `statecraftData.ts`.** They are the one index from a rule id to its reader ("Read in one place, X").
- **Split `describers.ts`.** The Doctrine build added words to its tables and to the switch in `describeEffect`. The tables are the index of the player prose, and there is no unit with one job to take out.

---

## 5. Questions for the user

1. **May `src/sim/statecraft/` hold a fourth file, `council.ts`?** (S4)
   - `CLAUDE.md` says "the card system in three", and `docs/README.md:542` says the same.
   - **I recommend yes.** The council is the shape that the Magisterial Doctrines change, and today it sits in two places of `draft.ts`.
2. **May `src/ai` gain one more function-level cycle (`council.ts` with `bot.ts`), guarded by a new load-order test over `src/ai/*.ts` in the core tier?** (S0, S5)
   - The test's cost is not measured yet. Expect tens of seconds of CPU.
   - **I recommend yes to the test, and yes to this one cycle.** Leave the split of `value.ts` by deck for later.
3. **Do you want `evaluator.ts` split into files?**
   - If you do, "the only module that switches on `CardEffect.kind`" either keeps the walk and ten functions in `evaluator.ts`, or it changes.
   - **I recommend no.** S6 gives the reader the same help, and the rule stays as written.

# E5 — the yield family collapsed: `pays`

The proposal, then the migration. The ruling is `docs/flags.md` (pp)'s E5 clause
(the user, 2026-09-08: *go, after E4b, alone*); the finding is
`docs/audit/evaluations.md` §3d ("Eight ways to say 'pays a yield'") and §4
step 5. The sequence the shape lands in does not move: `docs/yields.md` is the
spec of record and this batch changes **which words a row is written in**, never
which step it is read at.

---

## 1. The proposal

Eight `CardEffect` kinds say *pay a voice* and differ only in **where** and on
what **basis**:

| kind | where | basis |
|---|---|---|
| `cityYields` | the town | a flat bag |
| `tileYield` | the hex | a flat bag (+ two shares of the hex's own subsets) |
| `empireYields` | the empire | a flat bag |
| `routeYield` | the route | a flat bag (+ a share of the road) |
| `countScaled` | the town, the capital, or the empire | per count |
| `mirrorYield` | the town | a mirror of one shelf's own figures |
| `yieldConversion` | the town | a share of one voice, paid as another |
| `rateConversion` | the empire | a conversion of one rate into a voice |

Two dimensions and nothing else. So: **one kind, `pays`, with `where` and
`basis` as fields**, exactly as batch H6 folded the four flag-rule kinds into one
`rule`.

```ts
export interface CardPaysEffect extends CardYieldBag {
  kind: 'pays';
  where: PayWhere;   // 'city' | 'capital' | 'hex' | 'empire' | 'route'
  basis?: PayBasis;  // 'flat' (the default) | 'count' | 'mirror' | 'share' | 'rate'
  …
}
```

`basis` is **optional and defaults to `'flat'`**, which is what makes the
migration of the four flat kinds a one-field rewrite: a `cityYields` row becomes
`{ kind: 'pays', where: 'city' }` and keeps its bag verbatim.

`where` is **required**, because it is the question the old kind's *name* was
answering and a default would put it back in the reader's head.

### Old kind → new (`where`, `basis`)

| old kind | `where` | `basis` | lands at (`docs/yields.md`) |
|---|---|---|---|
| `cityYields` | `city` | `flat` | 3 |
| `tileYield` | `hex` | `flat` | 2 |
| `empireYields` | `empire` | `flat` | 16 |
| `routeYield` | `route` | `flat` | 6, 14 |
| `mirrorYield` | `city` | `mirror` | 3 |
| `yieldConversion` | `city` | `share` | 10 |
| `countScaled`, payout `{to:'yield', where:'city'}` | `city` | `count` | 3 |
| `countScaled`, payout `{to:'yield', where:'capital'}` | `capital` | `count` | 3 |
| `countScaled`, payout `{to:'yield', where:'empire'}` | `empire` | `count` | 16 |
| `countScaled`, payout `{to:'happiness'\|'authority'}` | `empire` | `count` | — (a meter) |
| `countScaled`, payout `{to:'percent'}` | `city` | `count` | 11 |
| `rateConversion` | `empire` | `rate` | 16 |

`'capital'` is kept as a fifth `where` because it is a real third reading of
"the town" — *once, in one town* — and `CardPayout`'s own docblock states why
(an empire line has no basket for food or a hammer). The four dimensions the
audit named are the town, the hex, the empire and the route; `capital` is the
narrow reading of the first.

A payout to a **meter** (`happiness`, `authority`) carries `where: 'empire'` and
nothing reads it: a meter has exactly one bank per empire, so there is no second
place the figure could land. It is written down rather than left absent so that
`where` is a total field and a reader never has to ask whether a blank means
"empire" or "nobody decided".

### Every field's new home

| old field | on | new home | read by |
|---|---|---|---|
| the six voices | `cityYields`, `tileYield`, `empireYields`, `routeYield` | **the bag** (`CardYieldBag`, unchanged) | every `basis: 'flat'` arm |
| `scope` | `cityYields`, `tileYield`, `mirrorYield`, `yieldConversion` | `scope` | the town arms and the hex's owner clause |
| `on` | `tileYield` | `on` | the hex arm (`where: 'hex'`) |
| `percent` | `tileYield` | `percent` | the hex's **works** share |
| `basePercent` | `tileYield` | `basePercent` | the hex's **ground** share |
| `origin`, `destination` | `routeYield` | `origin`, `destination` | the route arm's two ends |
| `share` | `routeYield` | `share` | the route arm's per-voice shares |
| `perEndpointLuxury` | `routeYield` | `perEndpointLuxury` | the route arm, carried to `routeYields.ts` |
| `from` (a voice) | `mirrorYield`, `yieldConversion` | `from` | the mirror and share arms |
| `to` (a voice) | `mirrorYield`, `yieldConversion` | `to` | the mirror and share arms |
| `percent` (a share) | `yieldConversion` | `percent` | the share arm |
| `category` (the shelf read) | `mirrorYield` | `category` | the mirror arm |
| `count`, `per`, `max` | `countScaled` | `count`, `per`, `max` | `countOf` + `helpings` |
| `building`, `category`, `categories`, `class`, `slot`, `tally`, `voice`, `within` | `countScaled` | unchanged | `countOf`, exactly as before |
| `from` (a rate) | `rateConversion` | **`fromRate`** | the rate arm |
| `per` | `rateConversion` | `per` | the rate arm — the same question ("how many of the thing read buy one helping") |
| `pays.to === 'yield'` → `pays.yield` | `countScaled`, `rateConversion` | `to` | the count and rate arms |
| `pays.amount` | `countScaled`, `rateConversion` | `amount` | the count and rate arms |
| `pays.where` | `countScaled`, `rateConversion` | **`where`** — the shape's own dimension | every arm |
| `pays.to === 'happiness' \| 'authority'` | `countScaled` | `to` (the same two words) | the meter folds |
| `pays.to === 'percent'` → `pays.percent`, `pays.stage` | `countScaled` | `percent`, `stage` | `cityYieldPercents` (step 11) |

`CardPayout` is **retired**: its four arms are five fields on the one shape, and
`where` — the field the audit's whole finding turns on — is hoisted out of it and
made the shape's first dimension.

### The three fields that serve two readings, and why that is honest

- **`percent`** is *a share, in whole percent*, and its subject is decided by
  (`where`, `basis`), which are disjoint: at `where: 'hex'` it is the share of
  the hex's **works**; at `basis: 'share'` it is the share of the town's fold of
  `from`; at `basis: 'count'` (with `stage`) it is the percentage **one helping**
  adds. No row can be two of those at once, because no row is two `where`s.
- **`category`** is *which shelf*, in both readings — the buildings a mirror
  reads off, and the buildings `buildingsOfCategory` counts. One question, one
  field; `countScaled` and `mirrorYield` were asking it in two.
- **`per`** is *how many of the thing read buy one helping* — `countScaled`'s
  count per helping and `rateConversion`'s rate per helping were already the same
  sentence about two different readings.

`stage` is the discriminant between the count's two payout forms: **present iff
the helping pays a percentage**. That is the same reading `percentYields`
already gives the field, and the count's flat form has never carried one.

### What does not move

- **The sequence.** `docs/yields.md`'s town steps 1–12 and empire steps 13–18
  are untouched; the register table gains a `where · basis` column and one row
  per pair, so a `pays` row still declares which step it lands at before it
  compiles.
- **The ledger classes.** `classifyCard` (`ledgerClass.ts`) decides a class by
  the card **id** and has never read an effect kind; `cardImpact.ts`'s
  `CARD_FLAT_STEPS` is a claim about *steps* (3, 9, 10) and those steps do not
  move. Neither file changes.
- **The luxuries' vocabulary.** A luxury's `empireYields` was already the card's
  own interface (batch H6, `ResourceEffect`); it becomes the card's own
  `CardPaysEffect`, narrowed by an alias to the one reading a luxury has ever
  used — `where: 'empire'`, `basis: 'flat'`. `perCityYields` is a luxury's **own**
  kind and stays one: it is per-copy-and-scope arithmetic no card shares.
- **Every number.** The gate is byte-identity: the four parity boards, every
  `explainCity` and `explainEmpireLines` list line by line, and every card's
  printed text.

### What the collapse is worth

Four registers stop having eight entries each: the evaluator's arms, the
describers' arms, the bot's `scoreEffect` arms, and the yields register. A ninth
way to pay a voice is now a `where` or a `basis`, which is a decision somebody
has to make in one place instead of a shape somebody can add in eight.

---

## 2. As built (2026-09-08)

Schema **96**, unmoved. Every replay is byte-identical and no figure in the game
changed; `docs/audit/evaluations.md` §4c.3 is the same account in that file's
voice.

### The migration script

`scripts/migrate-pays.mjs`, run once and committed (CLAUDE.md's rule for a
data rewrite: the script is the record of what was done to the rows). It walks
every `data/*.json` value recursively, rewrites any object whose `kind` is one of
the eight, and preserves key order per row so the diff reads as a rename rather
than a reflow.

### The counts

| file | rows rewritten | by old kind |
|---|---|---|
| `data/statecraft.json` | 163 | `cityYields` 32 · `countScaled` 74 · `tileYield` 36 · `rateConversion` 8 · `yieldConversion` 8 · `routeYield` 4 · `mirrorYield` 1 |
| `data/religion.json` | 41 | `countScaled` 14 · `tileYield` 15 · `cityYields` 11 · `rateConversion` 1 |
| `data/buildings.json` | 31 | `countScaled` 13 · `tileYield` 9 · `cityYields` 5 · `routeYield` 2 · `rateConversion` 1 · `yieldConversion` 1 |
| `data/greatPeople.json` | 42 | `cityYields` 20 · `countScaled` 15 · `tileYield` 7 |
| `data/techs.json` | 5 | `tileYield` 3 · `countScaled` 1 · `routeYield` 1 |
| `data/resources.json` | 9 | `empireYields` 9 |
| **total** | **291** | |

### The arms merged

| register | before | after | file |
|---|---|---|---|
| `statecraft/evaluator.ts` — the kind arms | 8 kinds across 11 loops | 1 kind, the same 11 loops filtered on (`where`, `basis`) | 5757 → 5836 lines |
| `statecraft/describers.ts` — `describeEffect` | 8 `case`s | 1 `case 'pays'` → `describePays`, five basis clauses | 2616 → 2659 |
| `ai/value.ts` — `scoreEffect` + `productionOf` + `amplifiedLines` | 8 + 3 + 4 arms | 1 `case 'pays'` → `scorePays`, 1 arm, 1 branch | 3163 → 3225 |
| `statecraftData.ts` — the shapes | 8 interfaces + `CardPayout` | 1 interface | 4560 → 4471 |
| `docs/yields.md` — the register | 8 rows of 12 kinds | 1 kind, 10 (`where`, `basis`) rows of 14 | — |

The line counts go *up* in three of the four because the merged arms carry the
eight docblocks' reasoning rather than dropping it; what came down is the number
of places a ninth way to pay a voice would have to be written.

`ledgerClass.ts` and `cardImpact.ts` are **untouched**, as §1 said they would be:
`classifyCard` decides by the card **id** and has never read an effect kind, and
`CARD_FLAT_STEPS` is a claim about steps 3, 9 and 10, which did not move.

### The gates

| gate | result |
|---|---|
| `test/sim/parity.slow.test.ts` — four bot boards at t30/t60/t150 | **byte-identical**: the state print, every town's flats, percents and total, every fold, every worked hex's breakdown, the empire's totals and lines, the Ledger, the deck, and `explainCardImpact` for every card each seat holds |
| the same harness's fifth reading — `explainCity`'s own list, line by line (step, source, ledger class, handles, six voices) | **byte-identical** on all four boards |
| `test/sim/cardTextSnapshot.test.ts` — every card of every class and every luxury, `raw` and `stripRefs`'d | **byte-identical**; 625 cards over ten classes plus 25 luxuries |
| the data's reverse mapping — every migrated row unmigrated and compared to its predecessor | **291 of 291 identical**, field for field |

### One thing the harness caught, and it is not a number

`TimedEffect` (`state.ts`) carries a **copy of the card's own row**, so
`snapshotState` prints that row's field names into the board's canonical print. A
rite (Omen Reading) was live at t150 on the two standard boards, so the state
hash moved while nothing about the game did — a full state diff at t150 showed
the *only* differing bytes on either board are that row, spelt the new way.

The harness therefore hashes the print with a stamped row's own spelling taken
out (`snapshotShape`: `card` and `expiresTurn` are still pinned, which is the
behaviour — which rite, on which town, until when). The row's content is gated
twice over instead, by the reverse mapping above for what it *means* and by the
card-text snapshot for what it *says*. No schema bump: a save is `{config, log}`
and a log carries no effect rows, so every replay is byte-identical.

### What could not be made byte-identical

Nothing in the simulation, and nothing a player reads on a card. One deliberate
change of text that is neither: the bot's own appraisal feed labelled each term
with the effect's `kind`, so eight labels ("countScaled", "tileYield", …) would
have become one word. A term now says `pays <where> <basis>` (`paysWord` in
`ai/value.ts`), so the spectator reads what it read before. No figure moves.

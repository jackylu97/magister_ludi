# Great People, Renown & Triumphs — reference

Shipped system (Entry XXXII + later passes). Sources of truth:
`data/greatPeople.json` (the roster — names, families, ages, tiers, legacies),
`data/triumphs.json` (the triumph table), `rules.greatPeople`,
`src/sim/renown.ts` / `greatPeople.ts` / `triumphs.ts`, `statecraft.ts` (the
one effect evaluator — a legacy is a card that walks). Roster contents and
printed abilities: the Compendium, never this file. History:
`docs/design-history.md`.

## The machinery

- **Renown** is one empire pool, banked in ONE place
  (`settleRenownWindfall`); `explainRenown` is its rule-5 fold. Sources:
  building trickles (a `renown` column on rows, tagged by family), wonder
  lumps + trickles, Triumphs, cards, lapis (family-less by construction).
- **Threshold** escalates like the settler ladder (`rules.greatPeople`);
  filling it opens a 1-of-3 offer.
- **The draw** is weighted (base 1000 + the pool's family feed shares),
  never restricted; an empty family falls through. A short age pool
  **spills**: `[age, previous…, next…]` — "the forgotten", "ahead of their
  time". The offer shrinks before it fails.
- **Names are world-shared**, consumed on pick, resolved by log order.
  `chooseGreatPerson` is the reducer's one refusal that mutates (redraw on a
  taken name). A spent roster banks renown rather than blocking.
- **Purchases** (`OFFER_PURCHASES`): recruit with gold
  (`offerPriceGold` 300, The Commonwealth) or faith (`offerPriceFaith` 150,
  The Magisterium); The Academy's **scholar draft** (1000🕯, scholar-only,
  no renown moved). All through the one draw path.

## The person

Arrives as an agent (charges); `greatWork` marker + `Unit.person` (in the
piece fingerprint). Two verbs:

| Family | Act (spend now) | Work (plant forever) |
|---|---|---|
| Scholar | research windfall | **Academy** |
| Artist | culture windfall + timed happiness | **Landmark** |
| Engineer | production hurry (a wonder wants two) | **Manufactory** |
| Merchant | gold windfall (age-scaled) | **Customs House** |
| General | timed aura or area heal | **Citadel** (flat defender line, claims its ring) |

- Works are improvement rows (`greatPerson: family`); a work stands anywhere
  but water/mountain and **opens the seam it covers** ("Iron · academy").
- Acts pay through the ordinary windfall seams; `AmplifierTarget
  greatPersonAct` (Leonardo) folds before banking.

## Legacies

- Every person leaves a **legacy** on the empire when spent (either verb):
  ordinary card effects, `liveEffects`' sixth source, read only by
  `statecraft.ts`. Tiers per the Doctrine philosophy: game-defining with a
  malice · generic strong · situational no malice.
- **Revocation is marking, never deleting**: `LegacyRecord.revoked`,
  `revokeLegacies` the only writer; `GreatPersonDef.revokedWhen` names the
  occasion (two swept in `reviewLegacies`, `enemyEntersCapital` hooked at
  `arriveOnTile`). History (`greatPeopleEarned`, the roll) never shrinks.
- Deferred rows (Sin-lēqi-unninni, Yi Sun-sin, Mimar Sinan's cathedral half,
  Leonardo's project half) carry player-plain `deferred:` prose — see
  `docs/flags.md`.

## Triumphs

- `Player.triumphs` is append-only and turn-stamped; read by diffing
  (`triumphMarks` / `triumphsSince` / `triumphsAwarded`), never passed as
  parameters.
- `triumphs.ts` owns the only trigger switch: **announced occasions**
  (hooked at the events that already report) vs **standing counts** (swept
  in the `renown` phase). Scopes: once · per age · contested
  (`state.contested` keys `(id, age)`, first by log order).
- The table is data (`data/triumphs.json`); the Academy-of-Deeds doubling
  folds into the printed figure in `awardTriumph` before banking.

## Extension rules

- A new legacy is a JSON row; a new SHAPE is a design decision (the
  vocabulary grew for this system: counts, combat conditions, scopes — see
  `statecraftData.ts`'s unions). Never bend; defer with prose.
- A new triumph is a row + one arm in the trigger switch.
- A new renown source joins `explainRenown`'s fold, never a second bank.

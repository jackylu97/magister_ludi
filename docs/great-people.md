# Great People — reference and nerf worksheet

Shipped system (Entry XXXII + later passes). Sources of truth:
`data/greatPeople.json` (the roster — names, families, ages, tiers, legacies),
`data/rules.json` (`greatPeople`, `renown` — every act, work and ladder number),
`data/triumphs.json` (the triumph table), `src/sim/renown.ts` /
`greatPeople.ts` / `triumphs.ts`, `statecraft.ts` (the one effect evaluator — a
legacy is a card that walks). History: `docs/design-history.md`.

**This file is a worksheet** (user ruling, 2026-09-03: the great-people nerf
pass). The roster tables below mirror the data row for row, and the *Nerf
notes* column is the user's to write in — a number, a strike-through, a
sentence. Nothing here is folded into the data until the user says ready.
`test/sim/greatPeopleDocSync.test.ts` keeps the two sides honest: every live
row appears in its age's table, and every table row names a live row.

The *Legacy* column is the game's own printed words (`describeCard`, the one
describer every screen prints from), regenerated 2026-09-03 — never hand-written
prose about a number. A deferred half prints "— not built yet"; a revocation
prints as its own clause.

## The machinery

- **Renown** is one empire pool, banked in ONE place
  (`settleRenownWindfall`); `explainRenown` is its rule-5 fold. Sources:
  building trickles (a `renown` column on rows, tagged by family), wonder
  lumps + trickles, Triumphs, cards, lapis (family-less by construction).
- **Threshold** escalates like the settler ladder: `first + step × recruited`
  — **40**, then **+25** each time (`rules.renown`). Filling it opens a
  1-of-3 offer.
- **The draw** is weighted (base 1000 + the pool's family feed shares),
  never restricted; an empty family falls through. A short age pool
  **spills**: `[age, previous…, next…]` — "the forgotten", "ahead of their
  time". The offer shrinks before it fails.
- **Names are world-shared**, consumed on pick, resolved by log order.
  `chooseGreatPerson` is the reducer's one refusal that mutates (redraw on a
  taken name). A spent roster banks renown rather than blocking.
- **Purchases** (`OFFER_PURCHASES`): recruit with gold
  (`offerPriceGold` **300**, The Commonwealth) or faith
  (`offerPriceFaith` **150**, The Magisterium); The Academy's **scholar
  draft** (`scholarDraftFaith` **1000**🕯, scholar-only, no renown moved).
  All through the one draw path.

## The person — one charge, two verbs

Arrives as an agent with **one charge** (`units.json: greatPerson`,
`charges: 1`, `greatWork` marker + `Unit.person`, in the piece fingerprint).
Either verb spends the charge and the piece, and either verb leaves the
legacy.

| Family | Act (spend now) | Work (plant forever) |
|---|---|---|
| Scholar | `scholarShare` **0.5** × the aimed technology's full cost, as science | **Academy** — +3🔬 |
| Artist | `artistCulture` **40** culture · `artistHappiness` **+2** happiness in that city for `artistTurns` **10** turns | **Landmark** — +3🎵 |
| Engineer | `engineerHammers` **40** × the empire's age number, as hammers in that city (a wonder wants two) | **Manufactory** — +3⚙ |
| Merchant | `merchantGold` **60** × the empire's age number, as gold | **Customs House** — +3💰 |
| General | heals every unit within `generalRadius` **2** and grants them `generalCombat` **+3** combat for `generalTurns` **5** turns | **Citadel** — +2⚙, **+8** defence, claims its ring (`citadelClaimRadius` **1**) |

- **Every flat act figure ages with the tree**: ×(1 + `actPerTech` **0.05** ×
  technologies researched), composed once before anything banks
  (`agedActFactor`). The scholar's arm is deliberately un-aged — a share of the
  aimed technology's cost already grows with the tree.
- `AmplifierTarget greatPersonAct` (Leonardo, **+100%**) folds into the same
  figure before banking. It reaches what an act *pays*, never a duration or a
  radius.
- A **great general standing beside your units** is a separate, standing aura:
  `generalAuraStrength` **+3** within `generalAuraRange` **2**, a labelled
  strength line in `planCombat`.
- Works are improvement rows (`greatPerson: family`); a work stands anywhere
  but water/mountain and **opens the seam it covers** ("Iron · academy").

## Legacies

- Every person leaves a **legacy** on the empire when spent (either verb):
  ordinary card effects, `liveEffects`' sixth source, read only by
  `statecraft.ts`. Tiers per the Doctrine philosophy: ● game-defining with a
  malice · ◆ generic strong · ○ situational, no malice.
- **Revocation is marking, never deleting**: `LegacyRecord.revoked`,
  `revokeLegacies` the only writer; `GreatPersonDef.revokedWhen` names the
  occasion — `enemyEntersCapital` (Archimedes, hooked at `arriveOnTile`),
  `happinessNegative` (Hypatia), `ageAdvanced` (Boudica), the last two swept in
  `reviewLegacies`. History (`greatPeopleEarned`, the roll) never shrinks.
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
- A new name is a row here **and** a row in its age's table below — the sync
  test fails otherwise.

## The roster

81 names, four ages, five families. Tier is the row's own `tier` and is
bookkeeping only — nothing in the simulation switches on it.

### Æra II — The Age of Heroes

20 names — one row per name in the data's own order.

| Person | Family | Tier | Legacy, as built | Nerf notes |
|---|---|---|---|---|
| Imhotep | Scholar | ◆ strong | +1 production in every city with a Monument · +5% production toward wonders |  |
| Ahmes | Scholar | ○ situational | +2 science in every city on fresh water |  |
| Kidinnu | Scholar | ● defining | +30% science in your capital · -25% border expansion |  |
| Ptahhotep | Scholar | ○ situational | +1 authority capacity per Library |  |
| Enheduanna | Artist | ◆ strong | +3 culture in your capital · +1 culture in every city with a Shrine |  |
| Homer | Artist | ● defining | losing a unit grants +9 culture · your units do not heal outside your own borders |  |
| Sin-lēqi-unninni | Artist | ◆ strong | +2 culture in every city with an Amphitheater · +2 culture in every city with a Hall of Deeds — not built yet |  |
| Ilimilku | Artist | ○ situational | +2 culture in every coastal city |  |
| Senenmut | Engineer | ◆ strong | +10% production toward buildings |  |
| Hemiunu | Engineer | ● defining | +30% production toward wonders · while any city is building a wonder: -2 happiness |  |
| Amenhotep son of Hapu | Engineer | ○ situational | +20% production toward wonders, in your capital |  |
| Bezalel | Engineer | ○ situational | +1 production, +1 faith in every city with a Shrine · +1 production, +1 faith in every city with a Temple |  |
| Ea-nāṣir | Merchant | ● defining | +3 gold on every hex with a Mine carrying a bonus resource · every luxury you hold counts 1 fewer toward happiness |  |
| Kushim | Merchant | ◆ strong | +1 gold in every city with a Granary |  |
| Aššur-idī | Merchant | ○ situational | +2 gold in every city but your capital |  |
| Lamassī | Merchant | ○ situational | +1 gold on every hex with a Plantation · +1 gold on every hex with a Pasture |  |
| Ahmose son of Ebana | General | ◆ strong | +10% combat strength for melee units |  |
| Piyamaradu | General | ● defining | +3 combat strength outside your territory · -2 authority capacity |  |
| Sinuhe | General | ○ situational | all units: +5 healing per turn |  |
| Deborah | General | ○ situational | +4 combat strength within 2 hexes of one of your cities |  |

### Æra III — The Age of Empire

21 names — one row per name in the data's own order.

| Person | Family | Tier | Legacy, as built | Nerf notes |
|---|---|---|---|---|
| Archimedes | Scholar | ● defining | +6 combat strength for siege units against cities · lost the turn an enemy soldier enters your capital’s territory |  |
| Hypatia | Scholar | ● defining | +10% science in every city · lost the first turn your happiness goes negative |  |
| Zhang Heng | Scholar | ◆ strong | +2 science in every city with a Library |  |
| Eratosthenes | Scholar | ○ situational | +1 science per 50 hexes you have revealed |  |
| Sappho | Artist | ◆ strong | +2 culture in your capital · +1 happiness |  |
| Qu Yuan | Artist | ● defining | +30% culture in every city · -5 happiness in your capital |  |
| Sima Qian | Artist | ○ situational | +1 culture per age that has closed |  |
| Phidias | Artist | ○ situational | +3 culture per wonder you hold |  |
| Li Bing | Engineer | ○ situational | +1 food, +1 production on every hex with a Farm beside fresh water |  |
| Hero of Alexandria | Engineer | ◆ strong | +5 production in every city holding a wonder that supplies science |  |
| Vitruvius | Engineer | ◆ strong | +2 production in every city with an Aqueduct · +1 happiness in every city with an Aqueduct |  |
| Eupalinos | Engineer | ○ situational | +3 food, +2 production in every city beside a mountain |  |
| Zhang Qian | Merchant | ◆ strong | +2 gold per 50 hexes you have revealed |  |
| Nanaivandak | Merchant | ◆ strong | each connected city pays +2 gold · city connections pay +10% more |  |
| Hippalus | Merchant | ○ situational | +1 gold on every hex with a Fishing Boat · all units: +1 movement while embarked |  |
| Crassus | Merchant | ● defining | all units and buildings cost −30% to buy · buying anything costs your empire -1 happiness for 10 turns |  |
| Pytheas | Merchant | ○ situational | every coastal city: +1 city sight · scout units: +1 sight |  |
| Hannibal | General | ● defining | +5 combat strength outside your territory · -4 combat strength inside your territory |  |
| Han Xin | General | ◆ strong | +2 combat strength beside fresh water · +2 combat strength on the coast |  |
| Boudica | General | ○ situational | +4 combat strength inside your territory · lost when the age it was earned in closes |  |
| Spartacus | General | ○ situational | +3 combat strength against a stronger unit |  |

### Æra IV — The Age of Cathedrals

20 names — one row per name in the data's own order.

| Person | Family | Tier | Legacy, as built | Nerf notes |
|---|---|---|---|---|
| al-Khwārizmī | Scholar | ◆ strong | +3 science in every city with an University |  |
| Shen Kuo | Scholar | ○ situational | +1 science per improved strategic resource |  |
| Ibn Sīnā | Scholar | ◆ strong | +1 happiness in every city |  |
| Āryabhaṭa | Scholar | ○ situational | +2 science in every city with a Shrine |  |
| Murasaki Shikibu | Artist | ◆ strong | +2 culture per melee unit in the field |  |
| Snorri Sturluson | Artist | ● defining | losing a unit grants +3 culture · losing a unit grants +3 faith · -2 authority capacity |  |
| Rūmī | Artist | ○ situational | +2 culture in every city with a Temple · +1 happiness in every city with a Temple |  |
| Sei Shōnagon | Artist | ○ situational | +1 culture per unique luxury |  |
| al-Jazarī | Engineer | ◆ strong | +3 production in every city with a Workshop |  |
| Su Song | Engineer | ○ situational | +2 production, +2 science in your capital |  |
| Villard de Honnecourt | Engineer | ◆ strong | +15% production toward buildings · +15% production toward wonders |  |
| Li Jie | Engineer | ● defining | +20% production toward buildings · -25% border expansion |  |
| Benjamin of Tudela | Merchant | ◆ strong | +1 gold per city you hold |  |
| Ibn Baṭṭūṭa | Merchant | ○ situational | +1 gold per foreign city you have sighted |  |
| Marco Polo | Merchant | ○ situational | +3 gold per trade route to another empire |  |
| Francesco Datini | Merchant | ◆ strong | +2 gold in every city with a Market |  |
| Subutai | General | ● defining | mounted units: +1 movement · +25% combat strength for mounted units · every city: -5 city defence |  |
| Tomoe Gozen | General | ◆ strong | +15% combat strength for mounted units · +15% combat strength for ranged units |  |
| Jan Žižka | General | ○ situational | +5 combat strength while fortified |  |
| El Cid | General | ○ situational | +3 combat strength in a city you captured |  |

### Æra V — The Magister

20 names — one row per name in the data's own order.

| Person | Family | Tier | Legacy, as built | Nerf notes |
|---|---|---|---|---|
| Paracelsus | Scholar | ● defining | +25% science in every city · -1 happiness in every city |  |
| Tycho Brahe | Scholar | ○ situational | +3 science in every city beside a mountain · +3 science in every city on hills |  |
| John Dee | Scholar | ◆ strong | +1 card in every offer of every kind |  |
| Copernicus | Scholar | ◆ strong | +2 science in every city |  |
| Christine de Pizan | Artist | ◆ strong | +3 culture in your capital · +1 authority capacity |  |
| Dürer | Artist | ○ situational | +2 culture per wonder you hold |  |
| Bashō | Artist | ○ situational | +1 culture on every forest hex |  |
| Sor Juana | Artist | ○ situational | +2 culture in every city with an University |  |
| Leonardo | Engineer | ● defining | +30% production toward wonders · a great person's act pays +100% more · projects pay half as much — not built yet |  |
| Taqī al-Dīn | Engineer | ◆ strong | +15% science in your capital · +15% science in every capital city beside a mountain |  |
| Mimar Sinan | Engineer | ○ situational | +1 culture in every city with a Temple · +30% production toward Temples · cathedrals also cost less to build — not built yet |  |
| Vaucanson | Engineer | ○ situational | newly created worker units gain +1 charge |  |
| Jakob Fugger | Merchant | ● defining | +30% gold in every city · -1 authority capacity per 3 cities you hold · all units and buildings cost −20% to buy |  |
| Zheng He | Merchant | ◆ strong | +3 gold in every coastal city · all units: +2 movement while embarked |  |
| Gracia Mendes Nasi | Merchant | ◆ strong | new cities start 1 population larger |  |
| Cosimo de' Medici | Merchant | ○ situational | +1 culture per 50 gold in the treasury (at most +6 culture) |  |
| Gustavus Adolphus | General | ◆ strong | +15% combat strength for ranged units · siege units: +1 movement |  |
| Nzinga of Ndongo | General | ○ situational | +5 combat strength in forest · +5 combat strength in jungle |  |
| Yi Sun-sin | General | ○ situational | naval units +5 combat strength — not built yet |  |
| Lautaro | General | ○ situational | +3 combat strength against mounted units |  |

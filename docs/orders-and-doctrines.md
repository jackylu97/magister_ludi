# Orders and Doctrines — the master list

Every Order and government in one place, tables only. The tables ARE the balance
worksheet: edit a cell here, edit the matching field in `data/statecraft.json`, and
`test/sim/statecraftDocSync.test.ts` fails the build if the two ever disagree — every live
row appears in its own deck's table and every table row names a live row, retired rows
excluded from both sides. Every Effect cell — and every government's Signature cell — is
the row's own ratified `text`; bands, chairs, tiers and rarities are the data's. The
reasoning behind each pass lives in `docs/history/orders-and-doctrines-as-built.md`; the
pre-rework shelves, every row of them retired, are `docs/history/orders-and-doctrines-retired.md`.

**The decks rework** (branch `decks`, batch D1a — `docs/plans/decks-rework.md`, ruled
`docs/flags.md` (iiiiii); the design of record is `docs/six-decks-first-cut.md`, whose
structure paragraphs are sync-tested where they state a number):

- **Six decks.** Every Order row carries `decks` — one deck for a single-type card, two for
  a cross-type card (one row, one effect, either membership grants access), none for a
  generic card that belongs to every seat — and a `band`. A leader's row carries its two
  decks; Ibn Battuta's says `rainbow`; a seat under nobody holds all six. A seat's pool is
  its decks' single-type rows, the cross-types naming either, and the commons
  (`deckPoolOf`). No pool rotates away.
- **Four bands, two gates.** A card is dealt once the seat's regular draft count has reached
  its band's rung of the ladder **and** its research age (the highest age among its own
  technologies, floored at one) has reached the band's — both (`bandOpen`). The ladder is
  the table below.
- **Universal chairs.** A government supplies a chair count and no layout: 3 / 4 / 6 / 9 by
  its tier's rung, written on each row as `chairs`; the sixteen governments keep their
  signatures. A leader's extra chair and a card's are additive.
- **The draw is rarity-first.** A hand is three positions — one card from each of the
  seat's two decks, and a third by the regular-draft cadence *generic → cross → generic →
  single* (the single alternating between the two decks; a rainbow seat samples two distinct
  decks a hand, and a third deck on the single turn). In each position a rarity rung is
  drawn at the table's odds (`rarityOdds`, renormalised over the rungs present), then a card
  uniformly within it. Every position excludes the held and the hand; an empty category falls
  back to the eligible union; fewer eligible cards deal a smaller hand; a rider's extra cards
  come after the base hand from the union. Passing moves `skipPity` points out of common into
  uncommon and rare for the next hand; taking a card zeroes it. The faith reroll keeps the
  hand's positions. An exhausted pool charges nothing: the meter stays full and no draft is
  counted until there is a card to deal.
- **Reward hands.** At regular draft counts 4, 18 and 29 a rare-only hand is banked
  (`rewardHands`, absolute counts); it blocks nothing, is dealt when opened — one rare from
  each deck then one from the union — taken for nothing into the collection, or passed for
  nothing, and resolves as exhausted at no cost when every rare is held. A rare taken in
  either kind of hand is out of the other.
- **Charters.** A row with `charter` grants on the pick — a technology made researchable, a
  building made buildable, rites made learnable — and never sits in a chair. It grants no
  free technology and no free building.
- **Nothing deleted.** Every pre-rework Order and Doctrine row is `retired: true`: in the data
  and the Compendium, in no pool. A Doctrine is the reward hand now, not a card class. A row
  whose text needs a shape the vocabulary lacks is `deferred` in plain words, with no
  effects, and is in no pool either. Schema 119; a pre-rework save is refused.

**Rarity** — the mark in an Order's Rarity column **is** `OrderDef.rarity`: ● common ·
◆ uncommon · ○ rare, blank reads as common. The draw takes it as a *probability target,
never a per-card weight* — 60 · 30 · 10 (`rarityOdds`) — drawn first, then a card within the
rung. Passing a draft moves `skipPity` points out of common until a card is taken. Orders
are never upgraded: a card is what it prints, held once, and a draft is take one or pass.

**Role** — **E** an *engine*, a row whose subject is the deck or the board's *kind* (a
count of the chairs, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar). **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted (a
count, a conversion, a doubler taken last, a tally). **S** a *standalone*, everything
else (a flat, a rule, an occasion, a charter, a boon on the calendar). The mark is
**derived from the row's own effects** and pinned against that derivation, so a row that
changes shape changes its letter or fails the build.

**Band** — the number in an Order's Band column **is** `OrderDef.band`: 0 Early · 1 Middle ·
2 Late · 3 Final, the ladder's rungs.

A row with a struck half carries **†** in its line under Notes, where the words after the
dagger are what the row does *not* do.

## The ladder

| Rung | Band | Regular draft count | Chairs |
|---|---|---|---|
| Chiefdom | 0 | 0 | 3 |
| Government I | 1 | 4 | 4 |
| Government II | 2 | 18 | 6 |
| Government III | 3 | 29 | 9 |

A reward hand is banked at every rung but the first. A government is offered at its row's
own tier (4 · 10 · 18 · 29 · 45); a tier between two rungs takes the rung below it for its
chairs.

## Governments

| Tier | Government | Chairs | Signature |
|---|---|---|---|
| 0 | Chiefdom | 3 | Grants nothing of its own. |
| 4 | Council of Elders | 4 | +3 happiness. +1 renown per turn for each city you hold. |
|  | Priest-King | 4 | +2 faith in every city. |
|  | War Chief | 4 | +3 authority capacity. +4 combat strength. Killing a unit grants +5 science and +5 culture for each Order you have in a slot. |
| 10 | Republic | 4 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 4 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a fifth of the rate. |
|  | Tyranny | 4 | +5 authority capacity. +4 combat strength. Pillaging pays +50% and costs no movement. |
| 18 | Divine Mandate | 6 | +1 faith and +1 culture in your capital for each wildcard Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 6 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 6 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 29 | The Curia | 9 | +6 faith for each Cathedral. Faith buildings supply science equal to their faith. |
|  | The Estates | 9 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 9 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 9 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 9 | +6 authority capacity. +2 combat strength for each great general you have earned this game. |
|  | The Magisterium | 9 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

The signatures are untouched by D1a — the simplification to three forms is a later ruling
— so the three tier-18 signatures still count Orders by the old offices' flavour, which
every chair now shares.

## Decks

One table a deck, then the cross-types and the generic pool. **Empty in D1a**: every
pre-rework row is retired and the six decks' rows are D1b's, one agent a deck, entered
from the design doc's deck tables. A row lands here in the same edit that lands it in
`data/statecraft.json`, or the sync test fails.

### Dominion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Expansionist

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Commerce

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Devotion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Scientific

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Magisterial

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Cross-type

| Order | Decks | Band | Rarity | Role | Effect |
|---|---|---|---|---|---|

### Generic

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|

### Notes and deferred halves (from the data rows)

Nothing live yet. A row's `note` and `deferred` print here when D1b lands one.

## Themes (the archetype lines)

The `line` tag — presentation only, read by no draw; the decks are the card's home.

| Line | Playstyle | Ideas |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy |  |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates |  |
| 🌱 **The Green Belt** | tall growth |  |
| ⚒ **The Forge Levy** | wide production, war |  |
| ✶ **The Star Chart** | science |  |
| 🕯 **The Procession** | faith engine |  |
| 🧭 **The Wayfarers** | exploration |  |
| 🏛 **The Marble Court** | wonders, renown, great people |  |
| ⚓ **The Tide** | trade routes, the sea, coastal empire |  |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle |  |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work |  |
| ☽ **The Cloister** | spiritualism — faith + science |  |
| 📜 **The Charter** | expansionist — wide cities → authority → more settling |  |
| 🌾 **The Ploughshare** | agrarian — stacking yields on farms |  |
| ⛰ **The Highlands** | mountains — hills and mountain bonuses |  |

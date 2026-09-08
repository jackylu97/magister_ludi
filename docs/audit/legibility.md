# The legibility pass — cards and the tree (2026-09-08)

The user: *"lets do a legibility pass on the orders/doctrines and technology
tree. For the tech tree: keep the effects of bonuses straightforward, they're
very difficult to understand. For overly long descriptions that don't fit well
in the tech tree, give it a name and give it an entry in the compendium. For
orders/doctrines, the effects are also difficult to understand sometimes
because of the noun usage. Some doctrines read '+X in this city' which doesn't
make sense because they should apply to all cities. Look for other effects
that don't seem to make sense during the draft screen (in the draft screen,
you're reading these cards in the context of their effects across your
empire). There are also a few religious beliefs that also have this problem
('+X in this city' should probably be 'in cities that follow your religion')."*

User marginalia here are rulings. Batch **L1** builds it.

## 1. What was measured

`test/fixtures/cardText.json` is every card's printed face (`describeCard`,
the sentences the draft screen, the Reliquary, the star chart and the
Compendium all print). **No ratified row `text` says "this city"** — the
worksheets are clean; the fault is in the *generated* faces.

### 1a. "this city" on a card that reaches the whole realm — 32 faces

The generated count phrase says **"in this city"** whenever a count is taken
`within: 'city'` (`describers.ts`, the `here` clause beside `countNoun`), and
that is right for a **building**, a **rite**, a **consecration** or a great
person's **work** — each *is* one town — and wrong for every card read at the
draft, where the same shape pays in **every** city:

| Class | Faces | Examples (as printed today) |
|---|---|---|
| Order | 12 | Statute Labour "+1 production per 4 population in this city" · The Scribes' Hall "+1 science per 3 population in this city" · The Quiet Fields "+1 happiness per unimproved hex worked here" · The Long Watch "+1 happiness per combat unit standing in the city" · Garrison State · The Founding Oath (six clauses, "in your capital per building in this city") · The Guild Compact · five charters ("a rite performed in this city…", "everything this city buys…") |
| Doctrine | 2 | The Encyclopaedia "+1 science per building in this city" · The Natural Philosophers "+1 science in your capital per building in this city" |
| Government | 1 | Republic "+1 culture per 5 population in this city" |
| Belief | 4 | Choirs "+1 culture per 4 population in this city" · Tithe Houses · Pilgrimage "+1 faith per unique luxury in this city" · Temple Spires (the Wat's own line, inside the unlock clause) |
| Rite | 1 | Omen Reading — **correct**, a rite is one town's |
| Building | 9 | Amphitheater, Bazaar, Mausoleum, Wat, Angkor Wat, Alchemical Society… — **correct**, a building is one town's |
| Great person | 1 | Aryabhata "+1 faith per building here that supplies science" — a legacy reaches every town; **wrong** |
| Tech | 1 | The Silk Road "…for each luxury in the city it left or the city it reaches" — a route's two ends; **correct** |

### 1b. The subject a card is read against

The draft screen reads a card **as the empire**. A clause's subject must say
so. Today's subjects, and the ruling for each:

| Card class | The subject a per-city clause should name |
|---|---|
| Order · Doctrine · Government · tech card effect · bead | **"in every city"** — "+1 production in every city per 4 citizens there"; a scoped clause names the scope instead ("in every city with a Monument", "in every coastal city", "in your capital") |
| Follower belief | **"in every city that follows your religion"** |
| Enhancer belief · pantheon belief | the empire's ("in every city") — a pantheon is empire-wide; an enhancer counts the world |
| Great person legacy | "in every city" |
| Building · wonder · rite · consecration · a great person's *work* | **"in this city"** (unchanged) |
| Charter (an Order that unlocks a building) | the *building's* lines keep "this city" — they are the building's own description, printed inside the card's clause, and the building is one town's |

Nouns: **"citizens"** for population ("per 4 citizens" — the Compendium's
word), never "population"; "hexes this city works" → "hexes it works".

### 1c. Other draft-screen faces that do not read as a rule

From the longest faces (`legibility-length` measurement):

- **The Founding Oath** — six clauses (one per voice) of "+1 food in your
  capital per building in this city (at most +3 food)"; the row's ratified
  text is one sentence: *"Your capital pays +1 of every yield for each
  building standing in it, at most 3."* **Ruling: a `pays` line whose bag is
  the same figure on every voice prints "+1 of every yield"** — one clause.
- **The Laureate** — six clauses, one per great-person work. **Ruling:** a run
  of clauses that differ only in the building they name folds to one: "+3 on
  every hex carrying a great person's work — science on an Academy, culture on
  a Landmark, …" (the describer joins same-shape siblings).
- **The Compact of Chairs** — three clauses "the Order in your first military
  slot pays twice" ×3 → "the Order in your first military, economic and
  wildcard slot each pays twice" (the ratified text).
- **The Silk Exchange** — "every trade route you send pays +100% more science"
  → "+100% science and culture on every trade route you send".
- **Border Wardens** — "+1 combat strength per military Order you have in a
  slot (at most +3) inside your territory" → "…inside your territory, +1 more
  per military Order in a slot (at most +3)".
- **"pays +100% more"** / **"-100% the gold your units cost"** / **"-40% the
  movement one step along a road costs"** — negative-percent phrasing reads
  backwards. **Ruling:** "units cost no maintenance", "roads carry units 40%
  further", "+100%" never "pays +100% more".
- **"every city of 6+"** — say "every city of 6 or more citizens".
- **"+1 authority capacity"** — the Compendium's word for the meter is the
  right one; check it is one word everywhere (authority / writ).

Wherever a ratified `text` on the row already says the rule better than the
generated clause, **the generated clause should read like the ratified text**
— the describer's job is to word the shape the way the row's author did.

## 2. The technology tree

50 nodes; 23 carry a `note`, 17 carry card effects (every effect-bearing node
has a note). The star chart prints the **note** over the generated clauses
(the 2026-09-03 ruling), and a note is hard-rule-7 prose with **no numbers** —
which is the legibility problem the user names: *"every city joined to your
capital pays one more gold"* is prose where a player wants a rule.

**Rulings (the user's, 2026-09-08):**

- **A bonus prints as a rule, short and numbered**, the way a card prints:
  "+1 gold per city joined to your capital by road", "+10% science and
  production in cities joined to your capital by road". The star chart's node
  card prints the generated clauses, one per line, **not** the note — the
  note becomes the Compendium's prose paragraph beneath the rules, never the
  face. (This reverses half of the 2026-09-03 ruling: the *one-line-each*
  half stands; the *note-over-clauses* half goes, because the note has no
  numbers.)
- **A rule that does not fit the node gets a name and a Compendium entry.**
  A node whose generated clauses run past **two lines** (or two clauses) on
  the star chart prints instead **one named rule** as a keyword ref —
  `[[rule:theImperialPost|The Imperial Post]]` — and the Compendium gains a
  **Rules** shelf where that name's entry carries the full clauses and the
  note. Today's long ones: The Imperial Post (4 clauses), The Examination
  Hall (3), Epic Poetry (its deferred half), The Silk Road (2 long), Movable
  Type (2). The name is the tech's own name unless the row gives a
  `ruleName`; the entry's anchor is `rule:<techId>`.
- The star chart's card, the hover, and the Compendium's technology entry
  all ask **one function** (`techRuleClauses`) — that stays; what it returns
  changes.

## 3. Deliverables (batch L1)

1. `describeCard` takes the **subject** from the card's class
   (`anyCardDef` already knows it) and every per-city clause names it per
   §1b; buildings, rites, consecrations and works keep "this city"; a
   charter's inner building lines keep it.
2. The describer folds same-shape sibling clauses (§1c: one figure on every
   voice; a run over the great-person works; a run over the three slots) and
   re-words the negative percents and the "6+" forms.
3. `techRuleClauses` returns the generated rules; the note moves to the
   Compendium paragraph; nodes over the length bar print a named rule ref;
   the Compendium gains the Rules shelf (generated from the rows — never
   hand-written prose about a number); `keywords.test.ts`'s sweep admits
   `rule:` refs.
4. `test/fixtures/cardText.json` regenerated deliberately, and the diff
   **reviewed line by line** in the report: every changed face listed old →
   new. A face that changed for a reason not in this doc is a bug.
5. No data row moves except the tech `text`/`note` reshuffle if a node's
   note needs splitting; no schema; the doc sync tests unchanged.
6. `docs/audit/legibility.md` §4 *As built*: the table of every face changed.

## 4. As built

Batch **L1**, 2026-09-08. No schema, no data row moved, no arithmetic changed:
every line below is a describer decision. `test/fixtures/cardText.json`
regenerated deliberately — **81 cards, 86 clauses** — and every one of them is
grouped under the ruling that changed it.

### The mechanism

- `ClauseSubject` (`src/sim/statecraft/describers.ts`) is `'empire' |
  'follower' | 'here'`, decided once per card by `subjectOfCard(id)` — the
  cascade `anyCardDef` walks, so the class *is* the subject: a building, wonder,
  rite or consecration is `'here'`; a follower belief is `'follower'`; every
  other class (Order, Doctrine, government, technology, bead, legacy, pantheon
  and enhancer belief) is `'empire'`. It is threaded down through
  `describeEffects` → `describeEffect` → `describePays`, and into the nested
  recursions (`conditionRule`, `landfall`, a windfall rider's timed effects).
- Three places the subject becomes a word:
  1. `scopeWordsFor(subject, scope)` — the **absent** `CityScope`, which
     `cityScopeWords` always read as "every city". A row that names a scope is
     still printed in the scope's own words. Read by the flat, mirror and share
     arms of `describePays`, and by `percentYields`, `happiness`, `cityStat`,
     `cardYieldAmplifier`, `buildingYieldPercent`, `cityRenownPercent`.
  2. `countPlace(effect, subject)` — the counted clause's two towns: `paidIn`
     trails the payout ("+1 science **in every city**") and `counted` says where
     the count is taken ("per building **there**"). `where: 'city'` leads with
     the realm and trails "there"; `where: 'capital'` leads with the capital and
     trails "there"; `where: 'empire'` over a town-scoped count says "in your
     cities"; a `'here'` subject keeps today's trailing "in this city".
  3. `TOWN_COUNT_WORDS` — the eight town-scoped `CountKind`s with the place
     taken out of the noun and composed back where each sentence wants it
     ("building **there**", "combat unit standing **there**", "building
     **there** that supplies science"). A `'here'` subject never reaches it and
     keeps `COUNT_WORDS`' own wording, which is why a building still says
     "in this city".
- A charter's inner building lines are unchanged: `unlocksBuilding` calls
  `describeBuildingRow`, which calls `describeCard` on the **building**, whose
  subject is `'here'`. Temple Spires' Wat, the five Order charters, the four
  faith houses all keep "in this city".

### The folds (`describeFold`, tried in order before any effect is worded)

| Fold | Card | Why |
|---|---|---|
| `everyVoiceFold` | The Founding Oath | six `pays` rows identical but for `to`, covering all six voices → "+1 of every yield" |
| `greatWorkRunFold` | The Laureate | a run of ≥3 `where: 'hex'` rows, one voice each at the same figure, every `on` a great person's work |
| `slotPositionFold` | The Compact of Chairs | ≥2 `slotPosition` rows at the same position and factor, distinct slots |
| `scaledCombatFold` | Border Wardens | a flat `combatLine` followed by a scaled one on the same fight |
| `bagWords`' six-voice reading | The Charter of the Marches | one row whose bag is the same figure on all six voices |
| route `share` grouping | The Silk Exchange | shares at one percentage are one clause |

### The tech tree (§2)

- `techRuleClauses(id)` returns the **generated rules** again. The note is
  `techRuleNote(id)` and lands under them as the Compendium's italic paragraph —
  on every node that carries one, including the six that hand over no rule at
  all and had nowhere to print it before.
- The bar: **more than 2 clauses, or more than 96 plain characters over all of
  them** (`RULE_CLAUSE_BAR` / `RULE_CHARACTER_BAR`) — two lines of about
  forty-eight at the node card's width, measured on the `stripRefs` reading so a
  keyword's brackets do not count. Exactly the five the audit named go over:

  | Node | Clauses | Characters | Named rule |
  |---|---|---|---|
  | Epic Poetry | 2 | 190 | `rule:epicPoetry` |
  | The Imperial Post (Satrapies) | 4 | 270 | `rule:theImperialPost` |
  | The Examination Hall (The Civil Service) | 3 | 149 | `rule:theExaminationHall` |
  | The Silk Road (The Golden Roads) | 2 | 111 | `rule:theSilkRoad` |
  | Movable Type | 2 | 117 | `rule:movableType` |

  The twelve that stay under: Code of Laws (21), Chronology (60), State
  Workforce (60), Guildhalls (60), Daughter Cities (75), Divine Right (46),
  Horology (55), Geomancy (68), Raised Fields (50), Machinery (29), Castellany
  (39), Steel (24).
- `TechDef.ruleName` added (optional, docblocked). **No row carries one** — every
  named rule is its technology's own name; the field exists so a rule with a name
  of its own in the fiction needs no table of exceptions.
- `RefKind` gains `'rule'`; `CompendiumSectionId` gains `'rule'` (shelf
  **Rules**, eighteenth, sitting after Technologies) with a generated entry per
  named node: the whole of `techRuleFullClauses`, the note as prose, a "Comes
  from" row naming the technology, anchor `rule:<techId>`, and a lead page in
  `compendiumShelves.ts`. The star chart's node card prints the ref through
  `setDescriptorText`, so the name is bold and clickable on the sticky card.

### Every changed face, by ruling

#### §1b — "citizens", never "population" (20)

| Card | Was | Is |
|---|---|---|
| government.republic | +1 culture per 5 population in this city | +1 culture in every city per 5 citizens there |
| order.theTaxFarm | +1 gold per 3 population | +1 gold per 3 citizens |
| order.homesteadCharters | new cities start 1 population larger | new cities start 1 citizen larger |
| order.censusRolls | +1 happiness per 2 population in your capital | +1 happiness per 2 citizens in your capital |
| order.pilgrimRoads | +1 faith per population in your capital | +1 faith per citizen in your capital |
| order.censusOfSouls | +1 faith per population in your capital | +1 faith per citizen in your capital |
| order.fireKeepers | +1 faith in your capital per 2 population in your capital | +1 faith in your capital per 2 citizens there |
| order.statuteLabour | +1 production per 4 population in this city | +1 production in every city per 4 citizens there |
| order.theCensusEternal | +1 science per 2 population | +1 science per 2 citizens |
| order.universalSuffrage | +1 happiness per 3 population | +1 happiness per 3 citizens |
| order.theReevesBell | every 8 turns, 1 food for every population | every 8 turns, 1 food for every citizen |
| order.theJubilee | every 10 turns, 1 faith for every population | every 10 turns, 1 faith for every citizen |
| order.theScribesHall | +1 science per 3 population in this city | +1 science in every city per 3 citizens there |
| belief.choirs | +1 culture per 4 population in this city | +1 culture in every city that follows your religion per 4 citizens there |
| belief.titheHouses | +1 gold per 3 population in this city | +1 gold in every city that follows your religion per 3 citizens there |
| belief.templeSpires | …the Wat — +1 faith per 2 population in this city… | …the Wat — +1 faith per 2 citizens in this city… |
| belief.thePromisedLand | new cities start 1 population larger | new cities start 1 citizen larger |
| building.amphitheater | +1 culture per 2 population in this city | +1 culture per 2 citizens in this city |
| building.wat | +1 faith per 2 population in this city | +1 faith per 2 citizens in this city |
| greatPerson.graciaMendesNasi | new cities start 1 population larger | new cities start 1 citizen larger |

Fire Keepers loses a repeated "in your capital" as well: `where: 'capital'`
already names the town, and the ratified text says "for every 2 citizens living
there".

#### §1b — the realm named on a per-city clause (14)

| Card | Was | Is |
|---|---|---|
| government.imperium | +1 production per military Order you have in a slot | +1 production in every city per military Order you have in a slot |
| doctrine.divineInspiration | +1% science per 200 banked faith | +1% science in every city per 200 banked faith |
| doctrine.divineInspiration | +1% culture per 200 banked faith | +1% culture in every city per 200 banked faith |
| doctrine.theEncyclopaedia | +1 science per building in this city | +1 science in every city per building there |
| doctrine.theNaturalPhilosophers | +1 science in your capital per building in this city | +1 science in your capital per building there |
| order.theLongWatch | +1 happiness per combat unit standing in the city | +1 happiness per combat unit standing in your cities |
| order.theLongWatch | +1 happiness per fortification in this city | +1 happiness per fortification in your cities |
| order.garrisonState | +3 production per combat unit standing in the city (at most +6 production) | +3 production in every city per combat unit standing there (at most +6 production) |
| order.theQuietFields | +1 happiness per unimproved hex worked here | +1 happiness per unimproved hex worked in your cities |
| order.theGuildCompact | +3% production per production building in this city (at most +15% production) | +3% production in every city per production building there (at most +15% production) |
| belief.worldChurch | +15% culture per empire that follows you | +15% culture in every city per empire that follows you |
| greatPerson.simaQian | +1 culture per age that has closed | +1 culture in every city per age that has closed |
| greatPerson.aryabhata | +1 faith per building here that supplies science | +1 faith in every city per building there that supplies science |
| bead.theEncyclopaedia | +1 science per building in this city | +1 science in every city per building there |

Five of these (Imperium, Divine Inspiration ×2, World Church, Sima Qian) said no
town at all and are paid `where: 'city'` — town by town — which §1b's ruling
covers ("Every per-city clause … says 'in every city'") even though §1a's
"this city" measurement could not see them.

#### §1b — a follower belief names its congregation (1)

| Card | Was | Is |
|---|---|---|
| belief.pilgrimage | +1 faith per unique luxury in this city | +1 faith in every city that follows your religion per unique luxury there |

Choirs and Tithe Houses are in the citizens table above; they took the same
phrase.

#### §1b — a town-scoped card that was saying "every city" (2)

| Card | Was | Is |
|---|---|---|
| rite.blessingOfArms | every city: +5 city defence | this city: +5 city defence |
| building.greatWall | every city: +5 city defence | this city: +5 city defence |

A `cityStat` with no scope is read through `liveCityEffects`, so it stands only
in the town keeping the rite or holding the stones. The old face was a card that
promised the realm what one town gets.

#### §1c — the folds (6)

| Card | Was | Is |
|---|---|---|
| order.theFoundingOath | six clauses, "+1 *voice* in your capital per building in this city (at most +3 *voice*)" | +1 of every yield in your capital per building there (at most +3 of every yield) |
| order.theCharterOfTheMarches | +2 food, +2 production, +2 gold, +2 science, +2 culture, +2 faith in your newest city | +2 of every yield in your newest city |
| order.theLaureate | five clauses, "+3 *voice* on every hex with a *work*" | +3 on every hex carrying a great person's work — science on an Academy, culture on a Landmark, production on a Manufactory, gold on a Customs House and production on a Citadel |
| order.theCompactOfChairs | three clauses, "the Order in your first *flavour* slot pays twice" | the Order in your first military, economic and wildcard slot each pays twice |
| order.theSilkExchange | every trade route you send pays +100% more science · …+100% more culture | +100% science and culture on every trade route you send |
| order.borderWardens | +1 combat strength inside your territory · +1 combat strength per military Order you have in a slot (at most +3) inside your territory | +1 combat strength inside your territory, +1 more per military Order you have in a slot (at most +3) |

#### §1c — a signed percent never takes "more" (18)

| Card | Was | Is |
|---|---|---|
| government.merchantLeague | trade routes pay +50% more | trade routes pay +50% |
| government.theCommonwealth | the works on every hex carrying a great person's work pay +50% more | …pay +50% |
| doctrine.theSeaCharter | trade routes pay +50% more | trade routes pay +50% |
| order.theEscortedRoads | trade routes pay +30% more | trade routes pay +30% |
| order.theExchequer | trade routes pay +100% more | trade routes pay +100% |
| order.theSalon | the works on every hex carrying a great person's work pay +100% more | …pay +100% |
| order.theNetsBlessing | the works on every hex with a Fishing Boat pay +100% more | …pay +100% |
| order.theDeepSeams | the works on every hex with a Mine pay +100% more | …pay +100% |
| order.theBroadAcres | the works on every hex with a Farm pay +100% more | …pay +100% |
| order.theSynod | your buildings that supply faith pay +50% more, counted after every other bonus on them | …pay +50%, counted after… |
| order.theConsistory | your buildings that supply faith pay +100% more, counted after… | …pay +100%, counted after… |
| order.theExchangeCharter | your buildings that supply gold pay +50% more, counted after… | …pay +50%, counted after… |
| order.theCollegesRule | your buildings that supply science pay +100% more, counted after… | …pay +100%, counted after… |
| order.theScriveners | your buildings that supply science pay +50% more | …pay +50% |
| order.theCountingHouses | your buildings that supply gold pay +50% more | …pay +50% |
| order.theWorkshopsRule | your buildings that supply production pay +50% more | …pay +50% |
| greatPerson.leonardo | a great person's act pays +100% more | a great person's act pays +100% |
| building.heroicEpic | every city with a Heroic Epic earns +50% more renown | +50% renown in every city with a Heroic Epic |

The Heroic Epic is the one that could not simply drop the word: "earns +50%
renown" reads as *half the* renown, so the figure was moved to the front, which
is the shape every other percentage clause on a card already has.

**Left alone, deliberately**: `cardYieldAmplifier`'s "what your other Orders pay
in a yield is +50% more" (the ruling names the *"pays +N% more"* shape; this one
is a comparative on a named figure and re-shaping it would have needed a new
sentence, not a deletion), `founderTrickle`'s "is +100% higher", and
`riteDuration`'s "last +N% longer". `templeForeignPercent` prints its percent
unsigned and keeps "more".

#### §1c — a negative percent on a price, said as the saving (10)

`RULE_WORDS` became formatters. Four of the nine `CardRule`s name a price and now
say what the player gets; the other five keep their exact words.

| Card | Was | Is |
|---|---|---|
| government.tyranny | -30% the gold your units cost in maintenance | your units cost 30% less gold in maintenance |
| doctrine.theStandingArmy | -100% the gold your units cost in maintenance | your units cost no gold in maintenance |
| bead.theStandingArmy | -100% the gold your units cost in maintenance | your units cost no gold in maintenance |
| tech.machinery | -40% the movement one step along a road costs | roads carry units 40% further |
| doctrine.manifestOfTheSteppe | -40% the production a settler costs | settlers cost 40% less production |
| tech.colonialCharters | -33% the production a settler costs | settlers cost 33% less production |
| order.landGrants | -25% the price of buying a hex | a hex costs 25% less to buy |
| order.royalSurveyors | -25% the price of buying a hex | a hex costs 25% less to buy |
| order.charteredCompanies | -15% the price of buying a hex | a hex costs 15% less to buy |
| building.angkorWat | -25% the price of buying a hex | a hex costs 25% less to buy |

#### §1c — "every city of 6+" (15)

| Card | Was | Is |
|---|---|---|
| government.divineMandate | +10% faith in every city of 6+ | …of 6 or more citizens |
| government.theEstates | +2 culture in every city of 8+ | …of 8 or more citizens |
| doctrine.breadAndCircuses | …+2 happiness in every city of 6+ | …of 6 or more citizens |
| doctrine.paxImperia | +3 happiness in every city of 8+ | …of 8 or more citizens |
| doctrine.paxImperia | +10% culture in every city of 8+ | …of 8 or more citizens |
| doctrine.theYeomanry | -1 happiness in every city of 10+ | …of 10 or more citizens |
| doctrine.paxMagistri | +5 science, +5 culture in every city of 12+ | …of 12 or more citizens |
| order.scholarsStipend | +3 science in every city of 5+ with a Library | …of 5 or more citizens with a Library |
| order.scholarsStipend | +3 science in every city of 5+ with a University | …of 5 or more citizens with a University |
| order.theGrainDole | +2 happiness in every city of 6+ | …of 6 or more citizens |
| order.theMasonsLodge | +10% production toward buildings, in every city of 6+ | …of 6 or more citizens |
| order.theGranaryLaws | 20% of the food in every city of 8+ is gained again as science | …of 8 or more citizens… |
| belief.ancestorWorship | +1 culture in every city of 4+ | …of 4 or more citizens |
| belief.ancestorWorship | +5% culture in every city of 10+ | …of 10 or more citizens |
| order.hearthSongs | +2 culture in every city of 4 or less | +2 culture in every city of 4 or fewer citizens |

Hearth Songs is `populationAtMost`, changed with its twin so the two thresholds
read as one pair; the ruling names only the `+` form.

### Checked and left alone

- **"+1 authority capacity"** (§1c's last bullet) is already one word on every
  surface — 42 faces carry it (3 governments, 5 Doctrines, 8 Orders, a belief,
  13 buildings, 5 great people, 2 technologies, 5 beads) and every one says
  "capacity". The nine faces that say bare "authority" all mean the **meter**
  ("while your authority is positive", "the authority a captured city costs"),
  which is the right word for the reading rather than the ceiling. "Writ"
  appears nowhere on a face. No change.
- **"hexes this city works"** (§1b's noun ruling) appears on no generated face.
  The nearest is `workedTilesInCity`, which now reads "hexes worked there" on a
  card and keeps "hexes worked here" on Angkor Wat, where it is right. The one
  literal "the farms this city works" is the Cistern's `irrigates` line — a
  building's, so it stays.
- **`where: 'city'` counts on a building** (Assembly Hall, Smithy) still name no
  town: the clause is printed on the building's own page and beside its own
  town, and §1b's ruling for that class is "in this city (unchanged)". Adding it
  would have made three correct faces longer, not clearer.
- No luxury signature moved (`resource` group of the fixture is byte-identical).

### Gates

- `npx tsc --noEmit -p .` — clean.
- `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`, then the
  diff read face by face — the table above.
- `test/sim` (in halves), `test/ui` — 4450 core tests green.
- Test pins re-aimed, each with a note naming the ruling it answers: 26 ratified
  strings across ten `it`s in `test/sim/statecraft.test.ts` (three of them folds,
  so the array shrank), 2 in `test/sim/greatPeople.test.ts`, 1 in
  `test/sim/religion.test.ts`, and in `test/ui/compendium.test.ts` the shelf
  count (17 → 18) plus the whole of the "a technology says its rules once" block,
  which now pins the rules-not-the-note contract, the note's place *under* them,
  and the five named rules by name. `test/ui/keywords.test.ts` needed no change:
  `techRuleWords.ts` composes and prints nothing, and the star chart's rule row
  goes through `setDescriptorText` like every other descriptor.

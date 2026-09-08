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

*(the batch writes this)*

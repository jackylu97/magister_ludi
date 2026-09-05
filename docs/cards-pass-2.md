# Cards pass 2 — cuts, modifications, holes, and card power over base yields (2026-09-05)

A row-by-row read of the built pools (Chiefdom 11 · Gov I 31 · Gov II 44 ·
Gov III 43 · Doctrines I–V) with the loop-review's synergy pass assumed
landed. Three questions from the user: what to cut or modify, what holes
want cards, and how to emphasize card power over base yields so the draft
loop carries the game. Plus the breadth audit's conclusion on trade.

Marks: **CUT** · **MODIFY** · **KEEP** (unstated = keep). Everything rides
existing vocabulary unless it says NEW.

---

## A. Cuts — rows that are dead weight, duplicates, or invisible

| Row | Pool | Why |
|---|---|---|
| Militia Levies (+4 defence, +1 sight) | Chiefdom | Invisible in play; the wild's pressure is answered by units, not a flat. **CUT.** |
| Horse Lords (+1 mounted movement) | Gov I | Too narrow for a slot; the mounted line has one unit an age. **CUT** (The Legion covers melee tempo; mounted tempo can ride a doctrine). |
| The Muster Roll (+10 max hp, born) | Gov I | Same shape as Drums of War (+2 strength, born) one pool later. **CUT**; Drums stays. |
| Land Grants (hex −25%, +40% borders) | Gov I | Near-duplicate of Royal Surveyors (Gov II). **CUT**; Royal Surveyors stays. |
| The Shield Wall (+3 on hills) | Gov II | Hill Forts (Gov I) already owns hills and adds the authority clause. **CUT.** |
| The Quartermasters (−1 upkeep) | Gov II | The War Chest (−3, Gov III) and The Wintering Grounds make three upkeep cards. **CUT.** |
| The Common Purse (overflow doubled) | Gov II | "Neutral", invisible, never a decision. **CUT.** |
| Public Granaries (keep 15% on growth) | Gov I | Invisible at 15%. **CUT** — or raise to 30% and make it the Green Belt's tall floor. Your call. |

Eight cuts, all marked "neutral" or duplicates. Pools after: Chiefdom 10 ·
Gov I 28 · Gov II 41 · Gov III 43 — still generous.

## B. Modifications — rows that are right in spirit, wrong in shape

| Row | Today | Becomes | Why |
|---|---|---|---|
| Far Runners | Scouts +1 move/sight; civilians +2 embarked | **+1 sight for every unit; each ruin you claim pays +10🎵** | [isn't this already a separate card in the game (your proposal)] the Wayfarers' opener should pay for exploring, not just move faster; ruins are the early game's only discovery reward |
| River Wardens | +1🌾 on freshwater farms in cities with a stationed unit | **+1🌾 on every farm beside fresh water** | the garrison clause is a hidden tax on a Ploughshare card; the plain version is the line's floor |
| The Great Warring Tribes (doctrine II) | three clauses | **+10% production toward units while your authority is negative · captured cities pay +5🔬 +5🎵** | one readable identity; the "negative authority no longer slows units" clause is a rule players can't see |
| Spoils of the Wild | camps pay +100% | keep, but **note in the compendium that it stacks with Camp Followers** (the doc's aside says not to print it — it should print, the stack is the fun) | legibility |
| Conscription (+50% units, −2😊) | | **+50% units, −1😊 per city over 4** | the flat −2 stops biting at empire scale; the per-city cost keeps it a wide-vs-tall decision |
| Village Fairs (+1😊 per duplicate luxury) | | keep, **rarity ● → ◆** | it is a real decision (duplicates), not a floor |
| Bread and Circuses (doctrine II) | +3😊 in 6+ cities while authority positive · −2💰 always | **+2😊** (the user's earlier rework note) | the strongest early doctrine still |
| The Scattered Hearths (doctrine II) | first 3 citizens free · −4😊 capital | **first 2 free** (the user's earlier note) | same |

## C. Holes — cards the pools want

The pools' gaps, read against the lines and against the draft's texture:

1. **Early rares.** Chiefdom has no ○ and Gov I has exactly one (The
   Laureate). A rare is the card that warps a game; the opening drafts —
   the ones that teach a player what a draft *is* — never show one. Two
   proposals: *The Founding Oath* (Chiefdom W ○): "your capital's first
   three buildings each pay +1 of every yield forever" (a capital-scoped
   count on buildings — existing shapes); *The Long Roads* (Gov I E ○):
   "every road hex inside your borders pays +1💰 to its nearest city" (a
   count on roads — `roadsBuiltBy` exists; a tile line on roads is one
   small shape — NEW, flag it). [move to age 2, where traders are unlocked]
2. **Risk cards in the early pools.** Balatro's texture is upside with a
   catch; ours lives only in doctrines (Gentle Yoke, Scattered Hearths,
   Wandering Court). Orders need two or three: *The Reckless Levy* (Gov I
   M ◆): "+50% production toward units · units cost double upkeep";
   *The Tithe of Iron* (Gov II E ◆): "+2⚒ on every mine · −1🌾 in every
   city with one"; *Bread Alone* (Gov II W ◆): "+3🌾 in every city · −1🎵
   in every city".
3. **A Procession payoff that reads followers.** Nothing pays for
   *spreading* the faith: *The Congregation* (Gov III W ○): "+1🎵 and +1🔬
   for each city in the world following your religion" (the `following…`
   CountKind family exists).
4. **A Green Belt engine besides The Old Ways**: *The Granary Laws* (Gov
   III E ◆): "cities of 8 or more pay 10% of their food again as science"
   (conversion, pop-scoped).
5. **Mounted identity**, if Horse Lords is cut: *The Horse-Tribes*
   (doctrine II ⚒): "mounted units +1 movement and +1 strength on flat
   ground · every stable pays +1🌾" — one doctrine, not an order slot.
6. **Pools IV and V are hollow at the top.** Six of fourteen doctrine rows
   there are †deferred (Sea Charter, Renaissance Court, Absolutism, Blitz,
   Philosopher's Stone, Pax Magistri). A player reaching tier 29 draws from
   a pool a third of which cannot pay. Before playtest reaches Æra IV:
   build the buildable halves (Sea Charter's "+50% routes" half is stock;
   Renaissance Court's "one more card" half is stock — `offerRider`) and
   retire the rest to the proposed tables rather than leave dead rows in
   live pools.

---

## D. The breadth audit's conclusion — should trade be reworked?

**No — reframe it through the deck; do not rebuild it.** Trade as built is
a passive yield pipe: a caravan runs a route, the route pays five voices,
cards count routes (Silk Roads, Wayhouses, Provisioners) and Thalassocracy
converts coastal food. Its weakness in the audit was that *no card changes
what a route is*. That is a two-card fix, not a system rework:

- **The Far Charts** (landing in the synergy pass) changes reach.
- **The Murmuration** (doctrine, pitched in `doctrine-ideas.md`): your
  religion spreads along your routes — a route becomes a faith vector,
  which makes the Procession and the Tide one build. NEW shape (pressure
  via routes), a real design decision, but small.
- **The Tide-Reckoning** (Gov II E ◆): "sea routes pay +50%" — stock.

With those three the trade system has three cards that make a *route* a
deck decision, plus the counters it already has. A structural rework (trade
as a resource, trade posts, route contracts) would be a first-cut expansion
of scope for a system the audit rates "feeds, weakly" — not "beside". And
the bot now prices routes honestly (batch 8 + `caravanScale`), so any
rework would also have to be re-priced. Recommendation: the three cards,
then judge in playtest.

---

## E. Card power over base yields — how to make the draft loop carry the game

The user's instinct: emphasize card power over the base yields of the
eleven systems that feed the loop. Six moves, in the order I'd take them.
None is a new mechanic.

1. **Quiet the base.** The balance turn as already agreed: ordinary
   building flats −25%, and Entry LIV's trim (happiness/authority relief
   leaves buildings for cards). A quieter base is the cheapest way to make
   cards louder — the stamp's number is the same, the empire behind it is
   smaller, so the card's *share* rises. This is the single biggest lever
   and it is a data pass.
2. **Percents over flats from Gov II up.** A flat +2 is the same at turn 30
   and turn 200; a percent compounds with the empire and is what makes a
   late stamp read "+41🔬" instead of "+2". The synergy pass already moves
   several rows to conversions; the rule going forward: Gov II and III
   rows pay percents or counts, flats stay in Chiefdom and Gov I where the
   base is small enough for a flat to matter. (The bot's shadow prices make
   percent cards appraise honestly, so no bot cost.)
3. **More drafts, smaller cards.** Balatro's density comes from many small
   choices. Entry XV's target was ~5 turns per draft; the pacing harness
   measured 9.3 after the happiness pass. Re-tune the culture ladder toward
   the target (`orderDraftCost` curve in data) and let individual rows be a
   little weaker — the deck's power comes from the count of decisions, not
   the size of each. This also fixes the "draft cliff" finding for free.
4. **Slots are the hand — make them scarce and felt.** Governments already
   differ in M/E/W slots; the tension is only real if a player *wants* more
   cards than chairs by the second draft. With cuts and holes filled, verify
   in playtest that Gov I's five chairs are contested by turn 40; if not,
   tighten the opening layout by one. Seals are the cost of changing your
   mind; the 5-turn seal is right for the cadence above.
5. **Every feeding system gets a reader in every pool it touches.** The
   audit's eleven systems each have at least one counter card somewhere;
   the pass is to make sure each *pool* offers one — a player who went
   religion-heavy in Æra I should find a follower-count card in Gov II, a
   wonder-builder a wonder-count card in Gov III, and so on. The current
   distribution is lumpy (great people have four cards in Gov III and none
   in Gov I; routes have three in three pools; camps two in the opening
   and one late). A grid — lines × pools — with one reader per cell is the
   worksheet; the holes list above fills the worst empties.
6. **Rare = rule-changer.** The ○ mark should mean "this card changes how
   you play", never "a bigger number": Cistern Works, Skirmishers' Creed,
   The Old Ways, Emergency Powers, The Auspicious Seal are the model. Audit
   the ○ rows against that sentence and demote any that are only large
   (Mandate of Heaven and The Common Purse read as ◆ at best); promote the
   rule-changers marked lower (Cistern Works is ●, and it is the best
   rule-changer in Gov II).

**What this does to the loop, in one sentence:** more frequent, smaller,
percent-shaped decisions over a quieter base, where every pool answers the
systems you've invested in and the rare card is the one that changes the
rules — which is the Balatro loop wearing Civ's systems, rather than Civ
with a card menu beside it.

---

## RULED 2026-09-05 — "let's make these changes" + the late pools for today's playthrough

The user's marginalia absorbed, and one addition: **"Please implement the
deferred age 4/5 orders, i want to start my full game playthrough today."**

- **Section A** — all eight cuts stand (Public Granaries: cut; the
  30%-tall-floor alternative was not taken). Retired per the standing
  pattern: rows kept for saves, out of every pool and table.
- **Section B** — every modification stands. Far Runners: the user asked
  whether a ruins-pay card already exists — it does not (the earlier
  "Wayfarers' Book" was a proposal in `doctrine-ideas.md`, never built), so
  the modification is the first such card and proceeds.
- **Section C** — every hole is built: The Founding Oath (Chiefdom ○), The
  Long Roads **at Government II** (the user: "where traders are unlocked";
  the road tile line is the one small NEW shape, approved), The Reckless
  Levy, The Tithe of Iron, Bread Alone, The Congregation, The Granary Laws,
  The Horse-Tribes (doctrine II, replacing Horse Lords' identity).
- **Section D** — The Tide-Reckoning (Gov II E ◆) builds; The Murmuration
  stays a proposal (a new pressure shape is a design decision for a calmer
  day).
- **Pools IV and V (doctrines)** — the six deferred rows: build every
  STOCK half (Sea Charter's "+50% routes"; Renaissance Court's "one more
  card" via `offerRider`; Philosopher's Stone's "Opus −25%" via the
  Master Builders' shape; Pax Magistri's "+3😊 everywhere · +5🔬+5🎵 in
  12+ cities" is entirely stock — its deferral was the "forswear war"
  clause, which is dropped; Absolutism's "+6 authority" half). Halves that
  need a new system (Sea Charter's founded-with-Harbour, Renaissance
  Court's stronger legacies, Absolutism's longer seal, Blitz's both halves,
  Philosopher's Stone's Distillery) are STRUCK from the row text — a card
  prints only what it pays. Blitz has no stock half: retired to proposed.
- **THE LATE ORDER POOLS — Government IV (tier 29) and V (tier 45) are
  BUILT** from the proposed tables, so a full game has drafts to the end:
  the enum + `poolOfGovernment` wiring for the tier-29 and tier-45
  governments; every proposed row that rides existing vocabulary builds
  with its rarity mark; rows waiting on unbuilt content (Æra V rows, the
  Bombards…) stay proposed; name clashes renamed (the Gov IV Synod →
  **The Consistory**; Gov V Guild Charters → **The Guild Compact**); Levies
  stays retired. Rows whose one clause needs a new shape ship the stock
  clause and strike the other, annotated. Government VI: no rung — skip.
- Schema bump; doc tables promoted from PROPOSED to built (the sync test
  reads them); the compendium renders every row.

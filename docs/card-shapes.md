# The card-shapes pass — making the deck the identity (2026-09-04)

The brief (user, 2026-09-04): the Reckoning is out for the first cut — no new
mechanics. Change the game's identity through the shape of the cards alone,
working with the existing pools in `docs/orders-and-doctrines.md`. This doc is
suggestions in three shapes; every row below is audited against the effect
vocabulary the game ALREADY has — a row that would need a new `CardEffect`
shape says so and is a design decision, not a freebie.

The design claim: additive yield cards can be balanced perfectly and will
never change the identity, because no two of them are better together than
apart. Identity comes from rows whose value depends on **what else you
drafted** — then a draft is a deck decision, not a shopping trip.

## What already exists (the vocabulary this pass rides)

- **Conversions** — Thalassocracy (coastal food → gold), Cuius Regio
  (faith → science), The Tithe / The Great Litany / Lamplighters (faith-rate
  → gold/culture). The `yieldConversion` shape: {from, to, percent, scope}.
- **Deck-readers** — The Archives (+1🎵 per slotted level), The Annals of Law
  (+2🎵 per benched order), and the user's own Senatus (+1🔬+1🎵 per slotted
  wildcard) and Smithy (+1⚒ per slotted military card). Counting slotted
  cards by a property is one `CountKind`.
- **Empire conditions** — "While you hold at most 4 cities" (Hermit Crown),
  "While your authority is positive" (Bread and Circuses, Emergency Powers).
  The condition harness exists; what it tests can grow by small honest steps.
- **Payoff build-arounds** — The Old Ways ("this is the payoff card" — the
  user's own words), The Encyclopaedia, Grand Bazaar, Mare Nostrum. Big,
  conditional, deck-warping — ordinary vocabulary at payoff scale.

## Shape A — deck-readers (the Senatus shape, made a family)

The cheapest identity win in the game: rows that count your slotted cards.
One per slot flavour makes every draft ask "what does my government read?"

| Row | Slot | Pool | Effect | Vocabulary |
|---|---|---|---|---|
| The War Council (NEW) | M | Gov II | +1 combat strength for every military card slotted (at most +3). | slotted-count × strength line |
| The Guild Charter (NEW) | E | Gov II | +2 gold and +1 production for every economic card slotted. | slotted-count |
| The Synod (NEW) | W | Gov II | +1 faith and +1 culture for every wildcard slotted. | Senatus, empire-wide and smaller |
| The Standing Orders (NEW) | E | Gov III | +1% to every yield for each slotted card at level 3. | slotted-count over deepen level; rewards the deepening system nobody builds around |

And the two that make **composition itself** a strategy — a matched pair, both
riding the existing condition harness plus a slotted-card test:

| Row | Slot | Pool | Effect |
|---|---|---|---|
| The Perfect Court (NEW, ○) | W | Gov III | While every slot is filled and no two slotted cards share a line: +5% to every yield. |
| The Single Purpose (NEW, ○) | W | Gov III | While three or more slotted cards share one line: +8% science and +8% culture. |

These two are the identity move of this pass. The line glyphs (🏹 🐫 🌱 ⚒ …)
stop being flavour and become the thing you draft toward or away from; the
same hand of three reads differently to a rainbow court and a mono court.
Needs: a slotted-card line test in the condition vocabulary — one small shape,
the biggest return in the doc.

## Shape B — conversions (fill the missing pairs)

The existing conversions are faith-centred. The missing pairs, some as
reworks of flat ● rows at equal power so the pool doesn't grow:

| Row | Slot | Pool | Effect | Rework of |
|---|---|---|---|---|
| The Drafting Halls (NEW) | E | Gov II | Cities with a Library pay 10% of their production again as science. | — (⚒→🔬, the missing pair) |
| The Golden Scales (NEW) | E | Gov III | 10% of your gold yield pays again as science. | could REPLACE The Salt Road (flat) |
| The Harvest Songs (REWORK) | W | Gov I | Each city pays 15% of its food surplus again as culture. | replaces Hearth Songs (+2🎵 small towns — same tall-early niche, now a decision: growth or songs, the same food twice) |
| The Salting Houses (NEW) | E | Gov II | Coastal cities pay 10% of their food again as production. | the ⚓ Tide's working half; pairs with Thalassocracy — both want the same coastal food, drafting both is a build |

Conversions create decisions because they chain: Thalassocracy + Salting
Houses + Harvest Songs all read the same food figure, and a player who sees
the chain builds a food empire that pays four currencies. That is a combo the
current pools cannot express.

## Shape C — payoff build-arounds (one per line, audit first)

Audit of the Themes table against the existing pools — most lines already
hold a payoff; the gap is narrower than it feels:

| Line | Existing payoff | Verdict |
|---|---|---|
| 🌱 Green Belt | The Old Ways · Pax Imperia | covered |
| ✶ Star Chart | The Encyclopaedia | covered |
| 🐫 Long Caravan | The Grand Bazaar · Mare Nostrum | covered |
| ⚓ Tide | Thalassocracy · Mare Nostrum | covered |
| 🏛 Marble Court | The Master's Presence · The Laureate | covered |
| 🕯 Procession | Divine Inspiration · Mandate of Heaven | covered |
| 🏹 Wild Hunt | Wolf-Mother's Pact (doctrine) | **no order payoff** |
| ⚒ Forge Levy | Conscription, Drums of War (engines, not payoffs) | **gap** |
| 🧭 Wayfarers | Master of Maps (a trade, not a payoff) | **gap** |
| 📜 Charter | Homestead/Charter Towns (openers, not payoffs) | **gap** |

The four missing payoffs, each in existing vocabulary:

| Row | Slot | Pool | Effect | Vocabulary |
|---|---|---|---|---|
| The Skin-Tribute (NEW, ○) | M | Gov II | 🏹 Every barbarian kill pays +10 gold and +5 science; camps you clear pay their windfall twice. | kill-windfall riders + amplifier (Academy of Deeds' shape) |
| The Arsenal Law (NEW, ○) | M | Gov III | ⚒ Cities with a Barracks pay 15% of their production again as gold while you are at war. | conversion + condition (war state is testable — Publicani's harness) |
| The Grand Survey (NEW, ○) | W | Gov III | 🧭 +1% science for every 30 hexes you have revealed (at most +10%). | Cartographers' count, percent instead of flat |
| The Charter of the Marches (NEW, ○) | E | Gov III | 📜 Your newest city pays +2 of every yield; founding a city grants +30🎵. | needs a "newest town" scope — one small shape; the windfall half is stock |

## Rework list (the same pool, sharper — for your row-by-row ruling)

Flat ● rows that could carry a decision at the same power. Marked so you can
strike any line; unstruck = I build it in the data pass:

- **Hearth Songs → The Harvest Songs** (above): surplus conversion.
- **The Salt Road → The Golden Scales** (above): flat strategic gold →
  gold-to-science conversion.
- **Weights & Measures, Festival Days, Wayside Shrines — keep as-is.** A pool
  needs vanilla floors; the fix is never converting everything.
- **The Last Hunt** (🏹, +2🎵 per camp cleared): raise to "+2🎵 and +2🔬 per
  camp" and mark ○ — it is already the Wild Hunt's counter card; let it pay
  like one.
- **The Archives / The Annals of Law**: unchanged, but move both UP a rarity
  (◆→○) once the deck-reader family lands — they become its anchors.

## Notes for the cut

- Nothing here needs the Reckoning, curses, rarity, or the phase-2 counter
  schema. Two small vocabulary additions carry the whole doc: a
  slotted-card-line condition test (Perfect Court / Single Purpose) and a
  newest-town scope (Charter of the Marches). Everything else is rows.
- Deck-readers before conversions before payoffs, if sequenced: the readers
  change drafting the day they land, and they're the cheapest.
- Balance guardrail: a deck-reader's ceiling is the slot count (5–9 by
  tier), so the caps write themselves; conversions ride whatever the base
  yield already survived, so they inherit balance rather than needing it.
- The stamp system makes all of this legible for free — a Senatus-shaped
  card's number visibly jumps when you slot a wildcard beside it, which is
  the Balatro moment: the deck talking to itself, on camera.

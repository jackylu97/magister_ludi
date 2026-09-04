# Doctrine, order & great-people ideas (brainstorm, 2026-09-03)

Three pitch sheets: early-game doctrines, pool orders, and great people —
each added on your ask, each pitched "interesting, not very strong".

## Part I — Doctrine ideas, the early game

A pitch sheet, not a spec: candidates for tiers 0–18, safe through wild, for
your cut. Numbers are placeholders to argue with. Each row notes its **shape**:
✔ = the effect vocabulary already says it (a JSON row, no design decision);
NEW = needs a new effect shape (a design decision — per the house rule these
defer rather than bend a near-fit).

Inspirations drawn on: Civ IV civics / V policies / VI pantheons & dark ages,
Old World laws, Humankind civics, Endless Legend, Frostpunk & Against the
Storm laws, CK-style court drama, Pharaoh/Caesar city-builders.

## Safe — fills a hole, plays like what's already in the pools

| Doctrine | Line | Pitch | Shape |
|---|---|---|---|
| The Salted Granaries | green | Food kept when a city grows: +25% of the growth bucket carries over (a bigger overflow). Cities −1 gold. | NEW (growth-overflow knob) |
| The Corvée | forge | Each city of 4+ population: +10% production toward buildings, −1 food. | ✔ |
| Bright Waters | green | +1 food on every worked lake and oasis hex; fishing boats +1 gold. | ✔ |
| The Toll Gates | caravan | +1 gold for every road hex a trade route crosses in your land. Routes to you pay their owner −25%. | NEW (route-hex count) |
| The Beacon Fires | forge | Your cities and units heal +10 hp per turn inside your borders. −1 happiness. | ✔ (cityStat/unitStat) |
| The Census Rolls | none | See every empire's city count, score and yields in the ledger. +1 science per 2 cities you have met. | half-NEW (espionage reading) |
| Ancestor Shrines | procession | Your capital's faith is +1 for each age your empire has entered; shrines +1 culture. | ✔ |

## Spicy — a real identity, one sharp trade

| Doctrine | Line | Pitch | Shape |
|---|---|---|---|
| The Potlatch | green | Once per era, a command: burn 200 banked gold → +3 happiness in every city for 15 turns and +30 culture. (Civ VI golden-age spending, Pacific-Northwest flavour.) | NEW (a doctrine granting a verb) |
| The Bride Price | caravan | Meeting a new empire pays +50 gold; your first deal with each empire needs no clock (instant one-shot trades). | NEW (on-meet occasion) |
| Sky Burial | procession | Your units dying pays +10 faith each (the dead feed the vultures); no faith from shrines. | ✔ windfallRider + NEW (suppress a building yield cleanly) |
| The Long Portage | wayfarers | Your traders and workers treat rivers as roads. Embarking costs nothing. | NEW (a per-terrain MoveProfile clause) |
| The Winter Count | none | Each triumph you record also pays +20 culture; your triumphs are visible to everyone (they know your deeds). | ✔ first half; NEW (visibility) |
| The Hearth Tax | green | +1 gold per citizen in your capital; your capital's borders never grow (buy only). | ✔ + NEW (border freeze scoped to one city) |
| Trial by Ordeal | forge | Your units win ties (equal-strength combats favour you); −10% science empire-wide. | NEW (tie-break clause) |
| The Grain Fleet | caravan | Sea routes between your own cities also carry +2 food to the destination. Land routes pay −1 gold. | ✔ if routeYields grows a mode term; else NEW |

## Wild — changes how a game feels; each wants its own playtest

| Doctrine | Line | Pitch | Shape |
|---|---|---|---|
| The Exodus | none | Once ever: abandon your capital (city razes over 3 turns) and every other city gains +3 to all yields permanently. The palace moves. (Frostpunk-grade commitment; anti-tall.) | NEW |
| The Oracle Bones | procession | Each era's first tech is revealed-cost: research the era's cheapest column at half price, but your research plan is public. | NEW |
| Hostage Princes | none | Peace deals may include a hostage: while a deal stands, neither side may declare on the other (a real non-aggression pact, the missing deal line). | NEW (deal vocabulary) |
| The Wandering Year | wayfarers | Every 20 turns, your lowest-population city gets +50% yields for 5 turns (the court arrives). The capital counts. | NEW (rotating scope) |
| Salt the Fields | forge | Razing pays double windfalls and razed ground can never be settled by anyone. The wild hates you (barbarians always target you). | NEW |
| The Debt Bondage | caravan | You may purchase with gold you do not have, down to −300; while below zero, −25% culture (Old World's debt, a real lever). | NEW (negative treasury floor) |
| The Twin Thrones | none | Your empire has two capitals (second-founded city gains palace lines at half strength); both must fall for your elimination. | NEW |
| The Murmuration | procession | Your religion spreads along trade routes instead of adjacency — each route carries pressure both ways. (Makes caravan/faith a combo.) | NEW (pressure via routes) |

## Reworks of what's on the table

- **Wolf-Mother's Pact** → the tribute cut: "Barbarians never attack you.
  Each camp standing in explored land pays you +2 gold per turn. You can no
  longer clear camps." The no-clearing clause flips from tax to feature;
  nothing to micromanage. (Alternative kept from the session report: keep
  kill-conversion, drop no-clearing, converted units upkeep-free.)
- **Bread and Circuses** → +2/city, or keep +3 but "in cities of 6+" (pays
  the tall half, stops scaling with raw city count).
- **The Scattered Hearths** → first **2** citizens free (was 3).

## Notes for the cut

- The strongest existing early doctrines are all *unconditional empire-wide
  numbers* (the thing being nerfed). The safest new designs above are
  conditional or scoped; the wild ones trade a number for a rule. More rules,
  fewer flat numbers, is the direction that keeps drafts interesting after
  the nerf round.
- Anything marked NEW is a design decision first — say which ones earn it and
  they get specced properly before any agent flies.
- Lines are guesses; rebalance freely. Nothing here is wired to data.

## Part II — Order ideas (deliberately modest)

The brief: fill the holes in the pools without adding another "+big number"
row. The current set's gaps, read off the live pools: almost nothing
**naval/coastal**, no **unit quality-of-life** (healing, sight, march),
nothing that touches **ruins/discoveries after the opening**, little
**border/culture utility**, no **defensive-war economy**, and very few
orders that reward *doing* something rather than *having* something.
Numbers pitched low on purpose; every row could carry an upgrade ladder
later (the deepening vocabulary: a printed number moves per level).

Same shape key: ✔ = existing effect vocabulary; NEW = new shape, a design
decision first.

### Chiefdom (the opening pool)

| Order | Slot | Pitch | Shape |
|---|---|---|---|
| The Fordmasters | economic | Your units cross rivers without the crossing toll. | NEW (a MoveProfile clause — small, and the vocabulary wants it eventually) |
| Tally Sticks | economic | +1 gold for every 2 improvements your workers have built (max +5). | ✔ countScaled, capped |
| The Night Watch | military | Your cities see 1 hex further; barbarian camps within that sight are always marked. | half-✔ (sight stat) / NEW (the marking) |
| First Fruits | wildcard | The first citizen born in each city pays +10 faith once. | ✔ windfallRider on growth |

### Government I

| Order | Slot | Pitch | Shape |
|---|---|---|---|
| The Ferrymen | economic | Embarking and disembarking cost no movement. | NEW (same MoveProfile family as the Fordmasters) |
| Boundary Stones | economic | Border growth +10% in every city; +1 culture in cities that own 12+ hexes. | ✔ (border accrual % + countScaled-ish city line) |
| The Remount Yards | military | Mounted units heal +5 extra per turn inside your borders. | ✔ unitStat-family if a heal stat exists; else NEW (small) |
| The Bone-Setters | military | A unit that survives a combat heals 10 at once. | ✔ windfallRider (occasion: survived combat — check the kill occasion's sibling) |
| Foundling Homes | wildcard | Every city of 4+ population: +1 faith. −1 gold in your capital. | ✔ |

### Government II

| Order | Slot | Pitch | Shape |
|---|---|---|---|
| The Coast Guard | military | +5 combat strength for units fighting on or beside your own coast hexes. | NEW (a combat `when` clause — coastal-adjacency) |
| Harbour Dues | economic | +1 gold on every worked coast hex, but only in cities with a Lighthouse. | ✔ tileYield scoped hasBuilding |
| The Surveyors' Guild | economic | Workers +1 movement; roads cost your workers nothing extra on hills. | ✔ unitStat / NEW (the hills half — cut it if not worth a shape) |
| The Relic Roads | wildcard | Ruins claimed pay +15 faith extra; your explorers may still find ruins others have claimed once per era. | ✔ rider / NEW (the second half is probably too much machinery — cut to the rider alone) |
| The Mourning Feasts | wildcard | Losing a unit pays +10 culture (grief made memory). | ✔ windfallRider (occasion: your unit dies — the kill occasion's mirror) |

### Government III

| Order | Slot | Pitch | Shape |
|---|---|---|---|
| The Sea Lanes | economic | Sea trade routes pay +2 gold; land routes +1 culture. | ✔ if routeYields carries mode terms (it does, post the land/sea batch) |
| The Levelled Ways | economic | Roads through forest and jungle cost no maintenance. | NEW-ish (a maintenance filter — small) |
| The Widows' Levy | military | When a war is declared ON you: +25% production toward units for 10 turns. | ✔ timed effect + NEW trigger (war-declared occasion — the war system wants this occasion anyway) |
| The Chroniclers | wildcard | Each triumph you record pays +10 science. | ✔ (the Winter Count's smaller cousin; triumphs are hooked already) |

### Notes for the cut

- The three MoveProfile pitches (Fordmasters, Ferrymen, Surveyors) are one
  design decision wearing three hats — if the clause family earns its place,
  all three are cheap rows; if not, cut all three.
- The two death/survival riders (Bone-Setters, Mourning Feasts) reuse the
  kill occasion's machinery from the other side; check `windfallRider`'s
  occasion list before pricing them as ✔.
- Deliberately absent: anything paying happiness (the nerf round is going
  the other way), anything empire-wide-per-city flat (the shape being
  nerfed), and espionage (a system, not an order).

## Part IV — Charter orders & growing cards (2026-09-03, the deckbuilder thread)

### Charters — the card is temporary, the building is forever

Mechanism already shipped (`cardUnlocksBuilding`, the Gilded Court's). A
charter unlocks its building WHILE SLOTTED; built copies stand forever;
unslot = can't build more. One per slot flavour, few and loud:

| Charter (slot) | Unlocks | The building |
|---|---|---|
| The Drill Charter (M) | **Drill Yard** (over Barracks) | new soldiers trained here start with +15 hp of experience scars (a veteran mark); +1⚒ per garrisoned unit |
| The Scriveners' Charter (W) | **Scriptorium** (over Library) | +2🔬; each adjacent worked hex with a great work or academy +1🔬 |
| The Silo Charter (E) | **Great Silo** (over Granary) | growth overflow past the threshold banks instead of vanishing; +1🌾 |
| The Coin Charter (E) | **Assay House** (over Market) | +2💰; the town's gold purchases cost 5% less (a city-scoped price line) |
| The Vigil Charter (M) | **Beacon Keep** (over walls) | +25 city hp; adjacent friendly units heal +5 |
| The Rites Charter (W) | **Processional Way** (over Shrine) | +1🕯; each rite performed in this town pays +5🎵 (a growing building — see below) |

### Growing cards — `scalingYield`: an occasion, a step, a counter

The card's stamp grows as you play toward it. Counter on the owned order
(phase-2 schema field, shared with the lifetime tally). All numbers
placeholder:

| Order | Grows on | Step |
|---|---|---|
| The Ballad-Weavers | a barbarian unit killed | +1🎵 per turn, forever |
| The Surveyors' Rolls | an improvement built | +1💰 per 3 improvements |
| The Pilgrim Count | a city converted to your faith | +2🕯 |
| The Annalists | a technology finished | +1🔬 per 2 techs |
| The Mustering Rolls | a unit trained | +1⚒ in the capital per 3 units |
| The Feast Calendar | a city grows | +1😊 per 4 growths (capped, say +3) |
| The Toll Ledger | a trade route completes its run | +1💰 |
| The War Stones | a war you declared ends in peace | +3🎵 +3🔬 (rare, huge steps) |
| The Reliquary Rolls | a great person spent | +2🕯 +2🎵 |

Design rule carried over: a growing card is WEAK on draft day — the floor
is low, the ceiling is the player's own play. The counter prints on the
card ("×7") and the stamp reads the counter, so the growth is legible.

### The card as the universal draw (user's pitch 2026-09-03, proposed)

- **Every draw reads as cards** — discoveries, order/doctrine drafts, great
  people — one tarot face, one deal-and-flip choreography (the mockup's).
  Great people and statecraft already wear the tarot face; discoveries are
  the odd one out (the "plain card" face). Ceremony scales with the
  moment: full flip ritual for adoptions/great people/doctrines, a quick
  fan at `--offer-scale` for a ruin's three options.
- **The discard — a legacies gallery**: every recruited great person as a
  tarot card in one screen, each carrying the two registers — the stamp
  (the legacy's current per-turn ghost-diff, the orders' own evaluator)
  and the tally (lifetime, phase 2) — with revoked legacies greyed/torn
  (the `LegacyRecord.revoked` marking already exists). Fixes a real gap:
  legacies are invisible today outside the folds; players forget what
  their honored dead still pay. Naming open (the Reliquary / the Annals /
  the user's call).

### The card stamp — DESIGN OF RECORD (approved 2026-09-03: "it looks
great -- please have this be the design moving forward")

The mock at https://claude.ai/code/artifact/9f7a3d6c-8a69-43ac-80f1-274d873cb290
is canonical. The binding points:

- **Boxless.** The number is bare mono digits sitting CLOSE under the
  clauses (tight leading — no dead band between the description and the
  digits; the empty air lives above the flavour rule instead). Never a
  bordered or filled box. Digits and their unit words share ONE baseline
  (`align-items: baseline`), no wrapping; the per-occasion form keeps the
  same digit size as the per-turn form, only the words after it are
  small.
- **Undrafted/benched, the number's seat is a flourish** in the card's
  line ink (— · ✶ · —, serif, ~55% opacity, centred). Digits replace the
  flourish on reveal.
- **The landing flash is a soft radial glow** behind the digits in
  currentColor, never a ring or border flash. Land pop ~1.2 scale with a
  degree of rotation.
- **NO popup, ever** (final ruling 2026-09-03 — it reserved space it
  rarely used and made the hand ragged): the number stands alone;
  everything about where a number came from, cascades and tier flips
  included, lives in the hover breakdown's rule-5 lines. The evaluator
  still labels cascade entries distinctly so the hover can show them
  with emphasis — the emphasis just never leaves the hover.
- **Happiness and authority are figures on the stamp** (ruled 2026-09-03:
  "we should have happiness and authority be yields that appear in the
  preview numbers, its confusing when they aren't shown"). A card's OWN
  meter line counts up in the meter's own mark (`☺`/`⚜`), beside the six
  voices and after them; the boxless/one-baseline rules apply to it
  identically. The distinction holds: the points the card pays are a
  figure, and the yield a tier those points crossed unlocked stays a
  knock-on — hover only, per the no-popup ruling.
- **A hand sits level**: card texts are budgeted so no card outgrows its
  siblings (the prose-budget discipline the pamphlet pinned; card clauses
  get the same treatment).
- **Two card sizes, two jobs** (ruled direction, 2026-09-03): the full
  tarot face appears only at MOMENTS — the draft ceremony and the slot
  ceremony (the card zooms to centre, plays its reveal, shrinks into its
  slot). The STANDING statecraft screen uses compact cards — the existing
  `.sc-card` thumbnail scale: emblem, name, rarity mark, and the bare
  stamp number (or the flourish when benched); hovering a compact card
  raises the full tarot face as the hover card. Slots are a row of
  compacts; the collection is a grid of them.
- **The reveal choreography**: numbers never show during selection; the
  pick reveals (count-up or thunk), the card flips out; bench = flourish;
  slotting replays the count with the true number.
- **The quiet register reads "has produced"** — never "banked".

#### As built (phase 1, derived only — no schema)

- **The evaluator is `explainCardImpact`** (`src/sim/cardImpact.ts`): a
  **ghost-diff**, `explainBuildingPreview`'s discipline one scale out. Two
  shallow copies of the seat — the realm without the card and the realm with
  it — dropped into shallow copies of the state, and the difference between
  the evaluators the turn resolution banks from (`cityYields` per town,
  `explainEmpireCardYields`, `empireResourceYields`, `explainEmpireGold`).
  Nothing in state is touched; no rule is reimplemented.
- **It reads both ways round.** A card not held is priced forward (what
  slotting it is worth); a card already in force is priced backward (what
  taking it out would cost). Same figure, same sign — which is why the draft's
  face and the office's line print one number. Subjects: order (with `level`,
  so a deepening prices the *step*), doctrine, government (the amnesty
  included), belief, great-person legacy.
- **Rule 5**: the impact is an ordered labelled list — the towns' named lines,
  the ground's, one reconciliation line named for the card (Entry XVII's two
  multiplications, a `yieldConversion`'s share, every floor), the realm's
  lines, then the **cascade** lines. `foldCardImpact` is the stamp's figure.
- **Meter lines** (`kind: 'meter'`, carrying the meter and the points) are a
  diff of `happinessOf`/`authorityOf` across the same two ghosts, rounded to
  the tenth the chips are read at. They pay in none of the six voices —
  `foldCardImpact` is untouched — and `stampReading` prints them as figures
  after the yields. `figures.ts` owns `METER_GLYPH` now (it moved out of
  `topBar.ts`, which kept it privately while a meter mark never had to be
  composed into a sentence), and `yieldMark.ts`'s one walk swaps both kinds
  of glyph for their drawings.
- **The count writes digits, never nodes** (the "still feels a little bit
  clunky" follow-up). `setYieldText` rebuilds an element's children and each
  mark it builds carries a `data:` URI of the best part of a kilobyte in an
  inline custom property; forty of those inside one count dirtied the layout of an
  animating card every frame. `yieldTextWriter` builds the row once and moves
  text nodes afterwards. The stamp's seat is also height-stable now — one
  line-height in pixels shared by the flourish and the figure, `min-height`
  equal to it — so the reveal no longer nudged the flavour rule down.
- **Cascades are labelled apart** (`kind: 'knockOn'`, carrying the meter) by a
  cumulative ladder — happiness, then authority, then arrears — so a tier the
  card flipped is its own entry. Per the no-popup ruling nothing draws it on
  the card; `stampCascadeText` carries it for the hover breakdown.
- **Occasion form**: a `windfallRider` is reported as its grant plus the
  occasion's own words (`occasionWords`, the same table the clause uses), never
  as a per-turn zero. A card that is both gets both; a card that is neither
  (a combat line, a movement clause) reports **nothing**, and the flourish
  stands.
- **The component is `src/ui/cardStamp.ts`** — flourish / count-up / thunk,
  `prefers-reduced-motion` arriving already landed. `stampReading` is the one
  adapter; `offerCard.ts` still crosses its boundary with numbers and strings.
- **Surfaces**: every tarot-face offer (`main.ts` — order, deepen, charter,
  doctrine, belief, great-person legacy), and the Statecraft screen's hand
  (flourish on the bench, the figure at rest in an office, the count replayed
  on the slot). The pick's **dispatch is not delayed** — only the sheet's exit.
- **Not built here**: the two-card-sizes ruling's ceremony half (the tarot face
  zooming to centre for a slot, and a compact card raising the full face on
  hover); the lifetime tally, which is phase 2 and needs schema.

#### As built (phase 1b — the great person's ceremony half)

- **The great-person draft carries no stamp at all** (the uniformity ruling,
  below). `main.ts`'s `cardStamp` spread now covers five offer paths, not six;
  the absence is pinned in `test/ui/offerFlow.test.ts` so a later pass adding a
  stamp to a new offer does not read the gap as an oversight.
- The **ceremony** is the first surface to raise the full tarot face at a
  MOMENT (`src/ui/greatPersonCeremony.ts`) — the two-card-sizes ruling's other
  half, for a *spend* rather than a slot. It draws in the offer card's own
  classes (`offer-option` inside an `offer-options[data-face='tarot']` host),
  so the card dealt and the card spent are the same card; the two things a
  standing card must not do (a pointer, a hover rise) are one small block in
  `style.css`.
- **Still not built**: the slot ceremony, the compact card raising the full face
  on hover, and the lifetime tally (phase 2, needs schema).

### The great person's three beats (proposed 2026-09-03, mocked, awaiting ruling)

The mechanics already say it: a legacy reaches `liveEffects` only once the
person is SPENT — so act, work, and legacy all pay at the spend, and the
draft only decides who joins the court. The flow (mocked on the ceremony
artifact, "A great person, spent"):

1. **Recruit is a promise** — the GP draft deals tarot faces with the
   flourish on EVERY card (no number is true yet; the epigram sells).
   Dissolves the current asymmetry where some people show legacy stamps.
2. **The spend, INVERTED** (re-ruled 2026-09-03): the LEGACY is the
   card's prominent content and the animated reveal — "Forever: …" as the
   main clause, its ghost-diff figure counting up. The act/work payout is
   a SMALL subheading that simply appears beneath, no animation ("her act
   paid +184🔬 · eight turns of your science"). The permanent effect is
   the identity; the one-shot deed is the footnote. Fires immediately on
   the command.
3. **The pile remembers** — if a legacy exists, a second quieter beat:
   the legacy line fades in and counts its ghost-diff figure ("and
   forever: …"), then the card descends into the Reliquary.

**The Reliquary is a SCREEN** (re-ruled 2026-09-03) — lighter than the
Statecraft/Religion sheets but in that family: a narrow parchment sheet
(≈30rem), its own header + close, Esc closes, joining the capped-overlay
CSS rule as the seventh id. Inside: the flip-through browser — one full
tarot face over a visible stack, ‹ › arrows, "N of M · the legacies in
force". Each card: the legacy in words (the headline), the stamp's
current per-turn figure, the deed as a small footnote line, and "has
produced" ticking. A revoked legacy stays greyed with a vermilion
REVOKED band — history, not deletion (`LegacyRecord.revoked`). A freshly
spent person lands at the front with their tally at zero.

**Access** (proposed): the renown chip on the top bar opens it (renown →
great people → their legacies is the natural path, and the chip's hover
already talks about great people); plus the ceremony's descending card
lands "into" it. Alternative if a button is preferred: a fourth, smaller
hud-dock glyph. The orchestrator recommends the renown chip — no new
chrome, discoverable exactly when a player starts caring.

#### As built (2026-09-03, derived only — no schema)

**Beat 1 — recruit is a promise.** The GP draft passes no stamp; every card in
the hand wears the flourish and the words sell the name (epigram, kernel, the
legacy's clauses). See the card-stamp section's *As built (phase 1b)*.

**Beats 2 and 3 — the ceremony** (`src/ui/greatPersonCeremony.ts`), raised from
`controls.ts`'s new `onGreatPersonSpent` the instant a `greatPersonAct` or
`greatPersonWork` command comes back **accepted** — the refusal returns before
the line, so a refused command plays nothing. Presentation only: no command, no
result read, no clock the reducer keeps.

- The card rises to centre over a dimmed, blurred scrim as the full tarot face
  in the tier's accent.
- **Headline is the legacy** — `describeCard`'s clauses with `Forever:` on the
  first live one, through `setDescriptorText` — with the ghost-diff figure
  counting up. The figure is `explainCardImpact` + the `cardStamp` component,
  reused whole: boxless, flourish-when-empty and the landing glow all come free.
- **Subheading is the deed**, a small mono line that simply appears — no count,
  no thunk. Its figure is the **preview** (`greatPersonActPreview` /
  `greatPersonWorkPreview`), taken before the command: `greatPeople.ts` composes
  an act's payout once before anything banks (Entry XVIII.5 — "the preview and
  the payout are one number"), and the piece is gone by the time the result
  returns. `CommandResult` carries no payout and gained none here.
- A person whose legacy this build does not keep (`legacyIsSilent` — every
  clause deferred, or none: Hero of Alexandria, Yi Sun-sin) gets the deed
  **promoted into the headline**, arriving where the number would have been
  weighed rather than at the deed's late beat. Deferred clauses still print
  under it, struck through. The card is never empty.
- Then the card descends toward the renown chip and the overlay closes.
- **The beats** are `CEREMONY_TIMING` (ms, from the mock): rise 500 · stamp 550
  · deed 1900 · descend 3600 (+600 to travel) · close 4300. The stylesheet owns
  only the two *durations*, read back and pinned against the constant.
- A click anywhere dismisses early. `prefers-reduced-motion` arrives **already
  landed** — figure written, deed shown, nothing rises or descends — held
  1600ms, then down. Every per-game listener goes into `gameDisposers`.

**The Reliquary** (`src/ui/reliquaryScreen.ts`) is the seventh id on the
capped-overlay rule and then narrows to ~30rem: no split, no scrolling pane,
one card at a time. The roll is `Player.legacies` read **newest first**, each
row through `greatPersonFace` — family + Æra eyebrow, tier mark (● ◆ ○), the
emblem, the legacy as headline, the stamp's figure written **at rest**
(`landCardStamp`, never replayed), the deed as a footnote, the flavour at the
foot. `‹ ›` and the arrow keys walk the pile and wrap; Esc closes; "N of M ·
the legacies in force" sits beneath. Empty state is one sentence, no numbers.

- **The revoked decorator is built and dormant**: greyed card, vermilion REVOKED
  band, and the stamp back to a dimmed **flourish** rather than a figure — a
  revoked record contributes nothing, so `explainCardImpact` prices it as a card
  *not held*, and printing that would print what it would pay if it came back.
  No live row reaches a revocation today; a save can carry one, and a source
  test pins the branch.
- **No "has produced" line at all** — phase 2 needs the schema field, and a dash
  standing in for it is a number printed as though the screen had it.
- **Access**: the renown chip is a button in the strip's existing idiom (class,
  role, click, Enter/Space), and the strip hands the chip out by name
  (`CivYieldStrip.renownChip`) so the ceremony can aim its descent at it. The
  chip's own card gains one manicule line, shown only once the empire has spent
  somebody.
- The three face tables (tier accent, tier name, family emblem) left `main.ts`'s
  boot closure for `src/ui/greatPersonFace.ts`, which three surfaces now share.

### The skip-for-rarity fork (user's pitch, under discussion)

"Instead of deepening: a skip, and consecutive skips raise rare odds next
draft." Recorded; see the session discussion — the open question is
whether growing cards replace deepening's role before deepening retires.

## Part V — Combo grammar, curses, and the balance turn (2026-09-03)

### `slottedCondition` cards — the combo grammar (shape NEW, one shape)

Cards that read the slot row. The shape: `{when: {slotted: <selector>}}`
where the selector names a slot type, a line, or a specific card. Examples:

| Order | Slot | Pitch |
|---|---|---|
| The War Chest | E | +2💰 per military order slotted |
| The Quiet Court | W | while NO military order is slotted: +2😊 in every city |
| The Twin Pillars | W | while a 🕯 order and an economic order are both slotted: +2🔬 +2🎵 |
| The Standard-Bearers | M | your military orders' printed numbers each count +1 (a deepen-echo — maybe too wild) |
| The Echo Chamber | W | the order slotted beside this one (same row, next slot) pays its yields +25% (position matters — very Balatro, needs slot ORDER to be real) |

### Curse cards — war leaves marks in the deck (all NEW, playtest-later)

- **Grief** — injected into a free slot when you lose a city; −1🎵 per city
  while slotted; spend a draft's pick to discard it. (The draft-pick cost
  is the StS remove-at-shop, without a shop.)
- **War Weariness** — injected at year N of any war; −1😊 per city; leaves
  by itself at peace + 10 (a timed curse, absolute turn).
- **The Pretender** — injected when your capital is besieged; occupies a
  slot doing nothing; discarding it costs a draft pick. Pure slot tax.

### More charters / growing cards (round two)

- **The Mint Charter** (E) — unlocks the Mint: a market variant; the town's
  gold yield also pays 10% as culture (a conversion building — the
  Thalassocracy shape on a row).
- **The Gatehouse Charter** (M) — unlocks the Gatehouse: walls variant;
  enemy units adjacent to the city lose 1 movement (a zoc-adjacent NEW).
- **The Almshouse Charter** (W) — unlocks the Almshouse: happiness building
  that grows +1😊 per 5 turns of the city being content (growing building).
- **The Cartographers' Rolls** (growing, W) — +1🔬 per 40 hexes revealed
  (reads the existing revealed count — Cartographers' cousin that grows).

### More charters / growing cards (round three, 2026-09-04)

Charters, keeping the grammar (a building variant unlocked WHILE SLOTTED;
built copies stand forever; one loud idea per building):

- **The Harbourmasters' Charter** (E) — unlocks the **Bonded Wharf** (over
  Harbour): +1💰; sea routes from this town pay +2💰 (a route hook — the
  luxury shapes already know this seam).
- **The Founders' Charter** (W) — unlocks the **Assembly Hall** (over
  Monument): +1🎵; +1🎵 per doctrine your empire has adopted (countScaled,
  an existing shape — the building that keeps score of your ideas).
- **The Toolmakers' Charter** (E) — unlocks the **Pattern Shop** (over
  Workshop): +1⚒; worked hexes with a mine or quarry +1⚒ (tile lines, the
  Lighthouse shape).
- **The Waterwrights' Charter** (E) — unlocks the **Cistern Gardens** (over
  Aqueduct): keeps `waters`; +1🌾 per adjacent freshwater hex (adjacency).
- **The Stargazers' Charter** (W) — unlocks the **Observatory** (over
  Library): +1🔬; +1🔬 per adjacent mountain (the classic — mountains
  finally pay something).
- **The Provosts' Charter** (M) — unlocks the **Armoury** (over Barracks,
  rival to the Drill Yard so the M slot has a fork): soldiers built here
  cost 25% fewer hammers (a city-scoped price line, the Assay House shape
  pointed at units).
- **The Justices' Charter** (M) — unlocks the **Assize Court** (over the
  authority building of its era): +1 authority; the town's crowding counts
  one citizen fewer (a cityStat line — quiet, wide-empire tech).

Growing cards, round three — new OCCASIONS more than new numbers; every
one is an event the sim already announces (a windfall, an arrival, a
command), so the counter has a hook to live on:

| Order | Grows on | Step |
|---|---|---|
| The Groundbreakers' Rolls (E) | a forest or jungle chopped | +1⚒ per 2 chops (capped ~+6) |
| The Wayfarers' Book (W) | a ruin claimed | +2🔬 |
| The Torchbearers' Count (M) | a camp burnt | +1 authority per 2 camps |
| The Landsmen's Ledger (E) | a hex joins your borders (bought or grown) | +1🌾 per 6 hexes |
| The Prospectors' Register (E) | a vein surfaced | +2💰 +1⚒ |
| The Masons' Rolls (E) | a building finished anywhere in your empire | +1⚒ per 4 buildings |
| The Almoners' Book (W) | 500💰 spent on purchases, cumulative | +1😊 (capped ~+3) |
| The Salvage Rolls (M) | a plunder or pillage you commit | +2💰 each |
| The Rite Calendar (W) | a rite performed | +1🕯 per 2 rites |
| The Chroniclers of the Fallen (M) | one of YOUR units dies | +1⚒ per 2 losses |
| The Bell-Founders (W) | ANY empire finishes a wonder | +2🎵 (jealousy pays) |
| The Landing Books (E) | your first arrival on a landmass new to you | +2🌾 +2🔬 (rare, big steps) |

Notes for the cut, round three:

- The Chroniclers of the Fallen is the interesting one — the first card
  that pays on your own losses. It reads as a curse-adjacent CHOICE (draft
  it and your dead work for you) and previews the curse grammar without
  committing to it. Warmonger bait that also comforts a defender.
- The Bell-Founders is the first WORLD occasion (someone else's wonder).
  Worth one card exactly — it makes the world's progress legible in your
  own hand — but only one; a deck of world-watchers plays itself.
- The Landing Books wants `firstLandings` (a per-player landmass set) —
  cheap, derived at arrival, but it is a schema field; defer to the same
  phase-2 counter decision the whole growing family already waits on.
- Shape inventory this round stays at ONE: everything above is
  occasion + step + counter (`scalingYield`), some capped. No decay, no
  multipliers, no per-turn conditions — the round-one design rule holds
  (weak on draft day, ceiling is the player's own play), and caps do the
  balancing where an occasion is spammable (chops, purchases).

### The balance turn (thinking, 2026-09-03 — the user: "nerf other areas
and lean harder on the orders")

The target state: base play makes chips, statecraft multiplies them, and
statecraft's SHARE of an empire's power rises while its absolute numbers
stay roughly where the nerf pass put them. The cut list, in order of how
much power-share each currently holds outside the card system:

1. **Buildings** — the biggest non-card power block. Direction: flat
   yields down ~25% across the ordinary rows (a granary feeds less), while
   UNLOCK/utility buildings (walls, harbours, the charters when they land)
   keep their roles. Buildings become the things cards point at, not
   rivals to cards.
2. **Great people** — the user's 8×-rate act pass (in flight) already cuts
   the biggest spikes. Legacies should stay modest (they're free jokers).
3. **Luxuries** — already flattened twice; leave until the next playtest.
4. **Tech** — the tree's power is mostly unlocks already (good); the few
   flat-pay techs (paysBead, card-effect techs) are fine as rare spice.
5. **Do NOT cut**: tiles/terrain (the chips must stay worth multiplying),
   and the early game before the first draft — the floor of the game is
   base play and it has to carry the first ~15 turns alone.

Guardrails: the no-draft-bot test (a bot that never drafts should be
irrelevant by mid-Æra III, NOT by turn 30); and every cut is a data pass,
measured by the pacing harnesses before/after. Sequencing: land the
stamps (visibility first — see what cards actually pay), then the
buildings pass, then re-measure the ages.

## Part III — Great-people ideas (interesting, deliberately modest)

Where the design space actually is: a person is one charge spent on an act
or a work, so the *legacy* is the whole personality. The nerf pass is
cutting numbers; these pitches trade numbers for texture — conditional,
one-time, informational, or place-bound legacies. Names are placeholders in
the roster's register (rename freely); the worksheet doc stays data-only,
so these live here until drafted. Shape key as before: ✔ = the legacy is an
ordinary effect row; NEW = a new shape, design decision first.

### New people on existing families

| Person (age) | Family | Legacy pitch | Shape |
|---|---|---|---|
| Pytheas (II) | scholar | The whole coastline of your continent is revealed the day he is called. Legacy: +1 sight on ships. | NEW (one-time reveal) / ✔ the sight |
| Deborah (II) | general | Legacy: your units defending inside your own borders heal +5 per turn. No aura, no citadel change. | ✔ |
| Ea-nāṣir's Rival (II) | merchant | Legacy: each trade route's *origin* city gains +1 gold. The act pays standard merchant gold. | ✔ countScaled-ish per route |
| Lady Murasaki (III) | artist | Legacy: +1 culture in every city with a Library (writing begets writing). | ✔ scoped line |
| Zhang Heng (III) | scholar | Legacy: veins and buried bonuses within your borders are revealed (the seismograph reads the ground; access still needs the improvement). | NEW (a reveal rule, close to prospect) |
| Apollodorus (III) | engineer | Legacy: your roads through hills cost no maintenance; workers pave hills one third cheaper. | NEW-ish (maintenance filter) |
| Benedict of Nursia (IV) | scholar | Legacy: a city with a Temple AND a Library gains +2 faith (ora et labora — the pairing is the point). | ✔ (needs an AND scope or two scoped lines — check vocabulary) |
| Margery Kempe (IV) | artist | Legacy: completing a rite pays +10 culture (the account of the thing outlives the thing). | ✔ windfallRider if rites are an occasion |
| Ibn Battuta (IV) | merchant | Legacy: your traders may path through foreign land at peace even without open borders (they alone). | NEW (a MoveProfile carve-out) |
| Trotula (IV) | scholar | Legacy: growth surplus +5% in every city (a small number on the least-fed channel). | ✔ rulePercent growthSurplus |
| The Winged Hussar (V) | general | Legacy: your mounted units ignore zone-of-control tolls. | NEW (a zoc exemption class) |
| Aldus Manutius (V) | artist | Legacy: adopting an order refunds 15 culture (the pamphlet spreads the law). | ✔ windfallRider on adoption |

### One structural pitch — the modest work

A second, cheaper verb shared by every family: **the Memorial** — the
person may found a *lesser* work (+1 of their yield, no seam opened, no
resource access) anywhere including inside a city's first ring. The full
work stays what it is; the memorial is what you spend a person on when the
map has no good seam — it converts "this draw is useless here" into "this
draw is small but placeable". NEW (one verb, all families), and it is a
*buff to flexibility while nerfing numbers elsewhere* — which is exactly
the trade the nerf pass wants.

### A possible sixth family (only if the draw wants more variety)

**The Navigator** — acts: reveal a radius of coast + the nearest island
chain; work: the Beacon (+2 gold on its hex, ships passing adjacent gain
+1 movement that turn — NEW). Weak on land maps by construction, strong
exactly where the new pangaea islands are. If a sixth family is too much,
fold the navigator acts into merchant rows.

### Notes for the cut

- Nothing above touches renown prices, offer sizes, or the ladder — those
  are the nerf worksheet's dials, kept separate on purpose.
- The two reveal legacies (Pytheas, Zhang Heng) are one NEW mechanism
  (a seeded, one-time map reveal scoped to a predicate) wearing two hats —
  same rule as the movement clauses in Part II: take the mechanism or cut
  both.
- Benedict's AND-scope: check `cityScopeAdmits` before pricing it ✔ — if
  scopes don't compose, two single-building lines at +1 each say nearly
  the same thing and need nothing new.

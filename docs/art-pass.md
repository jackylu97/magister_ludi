# The art pass — the court magister's game

Working doc (2026-08-26). Companion to `docs/design-notes.md` Entry VII (the study,
hermetic not spooky; **light theme wins**; the flourish set), Entry X (the naming bible),
`docs/tech-tree.md` (the tone arc, the canon-myth spine) and
`docs/design-specimen.html` (the type ramp and palette). Nothing here is scheduled until
the Revisions section says so.

## Where we stand

Two things are settled and this doc does not reopen them:

- **The two-layer fiction** (Entry VII). The *world* is innocent — the warm sage/wheat toon
  diorama, no textures, no board flourishes. The *interface* is the magister's apparatus:
  ink, parchment, gilt, engraved type, the instruments through which the world is read.
- **The register**: hermetic, cabinet-of-curiosities, courtly. Never grimdark. Mechanics
  keep plain names; ceremony copy carries the theme.

What has actually shipped of that programme: the chart-table fog (Terra Incognita draws
itself in), the star-chart tech tree, tarot Statecraft cards with drawn emblems, the
Abacus, the sky-lens research dial, Roman-numeral ages, the wax-seal turn stamp, manicule
notices, class-model units with parchment badges, the drawn icon family (yields, meters,
resources, sites, lines). **Not yet shipped from the approved set:** corner stars,
card-back weave, gold double-frames on announcement surfaces, the "hic svnt dracones"
marginalia, letterspaced small-cap inscriptions, Magister's Dice as astragali.

## The thesis

The vibe the user is after — *a court magister playing the game of the world* — is not
mostly a rendering problem. The board already looks right and the chrome already has the
bones. What is thin is the **fiction of the player**: nothing yet makes you feel you are a
learned person at a table, reading a world through instruments, whose deeds are being
written down. Three levers, in order of leverage per hour:

1. **What the game says** — every sentence it speaks is a chance to be in character, and
   most of them currently are not.
2. **What the game remembers** — mythic-sciences' own principle: *the game retells your
   run as legend*. The chronicle, epithets, named agents, age plates.
3. **What the game shows** — finishing the apparatus, and the few things the *world* may
   do without breaking its innocence (cities that age, marvels, heraldry).

Ideas below are tagged by lever and layer, with a rough cost. A ✎ in Revisions
overrides anything here.

---

## I. Voice — what the game says

**V1. A voice guide, and a copy audit against it.** `docs/voice.md`, four registers, each
with three example lines and a "never" list:

| register | speaks where | sound |
|---|---|---|
| **the Chamberlain** | turn card, End Turn blockers, notices, rejections | addresses *Magister*; courteous, brief, always names the rule ("The settler cannot found here, Magister — Uruk stands three hexes off.") |
| **the Annalist** | the chronicle, age plates, the Abacus | past tense, proper nouns, years not turns ("In the twelfth year Uruk raised its palisade.") |
| **the Instrument** | breakdowns, hover cards, tile readout | no adjectives, no address; tabular, signed lines, a total under a double rule |
| **the Epigram** | cards, techs, beliefs | one line, italic, never carries rules information (naming bible) |

Then a pass over every `announce` / `guide` / `reject` string in `src/ui` and `src/sim`
(the reducer's error sentences are user-facing through `reject`) to put each in its
register. Mechanics stay plain — "Production", "Happiness" — the naming bible holds.
*Cost: small. Layer: voice. This is the single cheapest large change.*

**V2. Years, not turns, where a person would say years.** The chronicle and plates count
"the ninth year of Uruk"; the HUD and every mechanical surface keep **T 41**. One
`yearOf(turn)` helper, and the rule that *only the Annalist uses it*.
*Cost: trivial.*

## II. Legend — what the game remembers

**L1. The chronicle becomes the Annals.** The ❧ notification log already holds every
line; restructure it as an annal: an Æra heading per age ("Æra I — the Age of Omens"),
entries grouped by year, written in the Annalist's register from the same data the toasts
carry (they stay as they are — the toast is the Chamberlain's whisper, the annal is the
record). Click-to-pan stays. *Cost: small–medium. Layer: chrome.*

**L2. Named agents.** The augur (and every future agent — prophet, great person) is drawn
from a per-seat name pool the way cities already are, and the annal names them: "the
augur Sennet read the sky at Ur and Ur took the Hearth as its god." A `Unit.name` on
agents only (schema bump), assigned in `createUnit` from the seat's pool by the seeded
RNG. *Cost: small. Layer: sim + voice.* Warriors stay nameless — a named army is a
promotion system, which is parked.

**L3. City epithets, derived.** `cityDisplayName` gains a suffix computed from state,
never stored, in a fixed precedence — the capital's ✶ is the precedent:
*the Great* (pop ≥ 10) · *the Walled* (palisade/walls) · *the Taken* (captured) ·
*the Unbowed* (repelled an assault — this one needs a stored fact, `City.assaulted`,
written by the combat reducer) · *of the Fords* (river) · *of the Harbour* (coastal) ·
*the Elder* (first-founded, non-capital). Shown on the banner, the city sheet and the
annal; the tile readout stays plain. *Cost: small–medium. Layer: sim + chrome.*

**L4. Age plates.** On an age advance, a full-screen illuminated page — "The Age of Omens
closes" — with the age's deeds derived from state and log: cities founded, the largest,
the first technology, battles won and lost, the gods named, the orders adopted. Drawn
with the existing mark families (city frame, unit badges, belief glyphs) laid out as a
woodcut tableau, with the Annalist's summary beneath. Dismiss to continue; it also lives
in the Annals as that age's frontispiece. *Cost: medium. Layer: chrome. High vibe per
hour — it is the moment the game visibly retells your run.*

**L5. The mechanics that mythologize.** Two items belong to the tree passes, not here,
but they are the same programme: **Epic Poetry** (the fallen become verse — unit deaths
pay culture) and **The King List** (capital yields scale with the age of the line). The
art pass should leave hooks for the annal to *announce* them in register.

## III. Apparatus — the interface as instruments

**A1. Finish the approved flourish set.** Corner stars on panels, card-back weave on
face-down cards, gold double-frames on the announcement surfaces (turn card, age plate,
victory), the "hic svnt dracones" marginalia on the chart with a sea-serpent drawn as path
data in the site/line mark family, letterspaced small-cap inscriptions for panel titles
and the Æra numerals. All CSS and path data; nothing new is *designed*, it is Entry VII's
own list. *Cost: small. Layer: chrome.*

**A2. The frontispiece.** The landing screen as a title page: engraved caps, the printer's
device (a small drawn emblem — the abacus or an astrolabe), an epigraph beneath the title
that changes per visit from a short pool ("*Non omnis moriar*"; a Hesse line if licensing
allows; otherwise our own), "Resume the game in progress" over "Continue". The first thing
anyone sees; currently the plainest surface in the game. *Cost: small.*

**A3. The instrument rack.** The lens strip becomes a rack of named instruments with drawn
icons in the mark family: the **Augury** (settler lens — Entry VII already named it), the
**Surveyor's Chain** (yields), the **Luopan** (resources — the eastern mainline, and it
foreshadows the Age III tech), the **Perspective Glass** (explorer), the **Writ**
(territory). Same toggles, same hotkeys; the rack has a label in inscription caps.
*Cost: small. Layer: chrome.*

**A4. Breakdowns as a ledger.** Every rule-5 breakdown (tile yield, unit cost, purchase
price, meters) rendered with ruled lines, signed figures in tabular mono (already), and the
accountant's **double rule under the total** — the one convention that says "this is a
sum, and it is closed." The Instrument register's visual half. *Cost: trivial.*

**A5. The pantheon as a wheel.** The religion screen's belief slots drawn as houses on a
horoscope wheel, the belief glyphs as the signs, the open slot as an empty house; the
augur's purchase and the rites in a column beside it. The axis names are gone (this
week) — the wheel is how the axes come back as *geometry* rather than words: beliefs of
one axis sit in adjacent houses, so synergy is visible without being labelled.
*Cost: medium. Layer: chrome.*

**A6. Magister's Dice as astragali.** Waits on the reroll economy (Entry V/VI). Listed so
the flourish set is complete; not for this pass.

## IV. The world — what the innocent layer may still do

Entry VII's rule holds: no textures, no hatching, no candle, no dust, no seasons. What the
world *may* do is draw more of the story as **objects**, which is what Civ's board has
always done best.

**W1. Cities that age.** Today a city is `min(pop, houseCap)` houses and a flag, in every
age. Give the sculpt tiers: Æra I huts; Æra II walls when a palisade stands and a shrine
silhouette when one does; Æra III a temple or ziggurat when a temple stands; the
**capital gets a palace** — the ✶ has no world counterpart yet. All procedural, keyed off
`highestAge` and the building list, added to the city fingerprint. The largest single
"the world tells you what happened" lever available. *Cost: medium–large. Layer: world,
within the rule.*

**W2. Heraldry.** Each seat carries a *charge* — a small drawn mark from a pool of twelve
(a crescent, a stag, a key, a wheel…) — printed on the city flag and inside the unit badge
rim, beside the colour. Seats stop being "the blue one". Chosen at setup, stored in
`PlayerConfig`, purely presentational. *Cost: small–medium. Layer: world + chrome.*

**W3. Marvels.** When wonders arrive (Age 2 pass), they are the world's one permitted
spectacle: the only outsized objects on the board, a gilt tip, a marker on the chart, and
an Annalist line at completion ("A Mirabile rises" is allowed splash flavour by the naming
bible). Designed with the wonder system, not before it.

**W4. Standing Stones.** The canon-myth culture improvement — monoliths on open ground,
"the first thing a people builds that isn't food." A tree-pass mechanic that is also a
world object; noted here so its sculpt is planned with W1's tiers.

**W5. Sites.** Ruins as toppled megaliths, villages with a totem, camps under a black
banner — check what `sites3d` draws today against this and adjust the props only where
they read as generic.

## V. Sound (optional, procedural)

Six sounds synthesised in WebAudio, no assets, off by a toggle: pen scratch (End Turn),
seal thump (turn card), bead click (Abacus), page turn (opening a screen), a low bell
(age advance), a tap (select). The rule that everything visual is procedural extends
naturally; taste risk is real and this should be tried as a spike before it is committed.
*Cost: medium. Not in the first pass.*

## VI. Portraits and leaders

Entry III's half-remembered characters and their portraits are the user's art (Midjourney
is the standee path's real home). A leader plate at setup and on the turn card would carry
the register enormously and is entirely gated on that art existing. Backlog until it does.

---

## Recommended sequencing

**Pass one — voice and memory (one Opus batch):** V1 voice guide + copy audit · V2 years ·
L1 the Annals · L2 named augurs · A1 flourish completion · A2 frontispiece · A3 instrument
rack · A4 ledger rule. Almost all chrome and copy; one small schema bump (agent names).
This is the pass that makes the frame *felt* without touching the world.

**Pass two — the world remembers:** L3 epithets · L4 age plates · W1 cities that age ·
W2 heraldry · A5 the wheel.

**With the tree passes:** L5 Epic Poetry / King List · W3 marvels · W4 standing stones.

**Later, gated:** A6 dice · sound spike · portraits.

## Refused, on purpose (so nobody re-proposes them)

Board textures or woodcut hatching on terrain · candle flicker, dust, vignette · blackletter
· seasons or time of day · a dark theme (tested, lost) · flavour text that carries rules ·
renaming mechanics (the naming bible is ratified).

## Revisions

*(yours — edit away; ✎ marks what changed)*

**✎ 2026-08-27 — the badge icons are Tabler's now, and there are ten of them.** The nine
hand-drawn unit badges under `public/sprites/icons/` were replaced with **Tabler Icons**
(MIT, pinned at 3.46.0), and a tenth was added for religious pieces. Lucide was preferred
first — it is already in the project for the six yield voices — and lost on coverage: it has
no bow, no horse, no laurel and no candle, four of the ten. Tabler has all four, so the whole
roster moved to one family rather than splitting six/four across two hands. Weighted from
upstream's 2/24 stroke to **2.75**, which is `yieldMarks.ts`'s number arrived at for the same
problem and lands almost exactly on the weight the hand-drawn set was printed at — the badges
did not get heavier, they stopped being drawn by us. Two shapes neither family has are the
exceptions and are marked as such in the files: the horse-archer is Tabler's `horse` and `bow`
composed, and the catapult is drawn here in Tabler's geometry rather than borrowed from a
filled-silhouette family, for the reason `public/sprites/CREDITS.md` has always given about
Kenney's board-game icons — a badge set has one job, which is to be one family. The tenth
badge is a **candle** for `BadgeClass.religious`: an augur is sculpted as a worker, and
"worker" over the only piece in the game that spends faith is an invitation to march it at a
hill and build a mine. Deliberately not the faith yield's flame — the flame is a number's
voice, the candle is a piece's name, and one mark doing both would read as "this tile makes
faith". All ten are on `flair.html`.

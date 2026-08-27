# Wonders — a proposed list, cut for synergy

Working doc (2026-08-27). The framework ships separately (one per world; a wonder is a
building row with `wonder: true` whose effects are cards read by `liveCityEffects`; beaten
→ hammers refunded as gold at 1💰/⚙; production category `wonder`; never purchasable).
This is the list to fill it. **Nothing here is scheduled until the Revisions section says
so.** Companions: `docs/tech-tree-ages-2-5.md` (the homes), `docs/great-people.md` (renown
+10 on completion, the Triumph *A Marvel Raised*), `docs/art-pass.md` W3 (the world's one
permitted spectacle), design-notes Entry VI (the Bead Race — a wonder is a feat).

## The rule for what makes the list

A wonder earns its row by **playing with a system that already exists**, not by adding
one. Every effect below is written in the current card vocabulary (the twenty-four
shapes in `statecraftData.ts` plus the building fields `happiness` / `cityStat` /
`authorityCapacity`), and the three that would need a new shape are marked **(new shape)**
and argued for individually. Register: real kernels, the eastern mainline as mainline, the
name a player already half-knows.

The synergies the game has today, which the list is built around:

| system | what a wonder can plug into |
|---|---|
| **Statecraft** | draft size (`offerRider`) · a free draft (`settleCultureWindfall`) · seals · government tier |
| **Religion** | pantheon slots · augur price · rites' duration (`effectAmplifier` on timed effects) · faith yields |
| **Meters** | `happiness` supply · authority capacity · the tiers (+10%/+20%) |
| **Luxuries** | `perCopy` (silver/gold) · the empire-wide count · reveal |
| **Improvements** | worker charges (`unitStat`) · the chop windfall (`windfallRider`) · fishing boats · quarries · farms beside water |
| **Growth** | the `growthPercent` channel · the granary's water line · the settler ladder |
| **Borders** | the `borderPercent` channel · tile-purchase price (`tilePurchase`) |
| **Combat** | `combatLine` (garrison, terrain, vs-type) · city defense (`cityStat`) · ZOC · heal |
| **Fog / sight** | `sightSources` · scouts · embarkation |
| **Projects & purchase** | Tithes / Scholarship rates (`rateConversion`) · purchase price lines |
| **Windfalls** | free tech (`settleResearchWindfall`) · a free unit (`realiseItem`) · a free citizen (`settlePopulationWindfall`) |

Costs are a first guess on the **wonder band = 5–7× the age's best building**; the pacing
test rules. Yields are what the wonder pays on its own tile-less row; the *effect* is the
reason to build it. Each row names its synergy.

---

## Æra I / II — the Age of Omens and of Heroes (homed on shipped Age I techs until the Heroes nodes exist)

| wonder | home (now → tree) | ⚙ | yields | effect (card vocabulary) | plays with |
|---|---|---|---|---|---|
| **The Oracle** | Divination → Epic Poetry | 120 | +2🎵 +2🕯 | **every Statecraft draft shows one more card** (`offerRider`) · *(dice later)* | the draft-size evaluator — the first wonder to use it, and the reason it exists |
| **Stonehenge** | Stonecraft → Standing Stones | 130 | +3🕯 | **+1 pantheon slot** **(new shape: a slot grant on a card — one field, `pantheonSlots: 1`, read where Divination's two are)** · stone-resource tiles +1🕯, gives one free augur | religion's anti-spam structure; quarries |
| **The Pyramids** | Stonecraft → Ancestor Rites | 150 | +2⚙ | **workers +1 charge** (`unitStat`)  | charge workers |
| **The Hanging Gardens** | Calendar → Irrigation | 150 | +3🌾 | **+25% growth surplus in every city** (`growthPercent` channel) · farms beside fresh water +1🌾 in this city (`tileYield` water condition) | the growth channel, the freshwater farm line |
| **The Walls of Uruk** | Bronzeworking → Kingship | 140 | +2🎵 | **capital +10 defense** (`cityStat`) · units within the capital's borders +2 combat (`combatLine`) · +2 authority capacity | palisade, the garrison line, authority |
| **The Great Ziggurat** | Letters → The High Temple | 160 | +2🔬 +2🕯 | **religious units cost −25%** **(new shape: a purchase-price line — `purchaseRider`, one line in `explainPurchaseCost`'s bank; the same line the M9 gold discounts would use)** · shrines +1🔬 | the augur ladder, the shrine's science |
| **The Great Lighthouse** | Sailing → Wayfinding | 130 | +2🪙 | coastal city only · **embarked units +1 movement** (`unitStat`) · fishing boats +1🪙 (`tileYield` improvement condition) · +1 sight in coastal cities (`sightSources`) | embarkation, fishing boats, the fog |
| **The Temple of Artemis** | Husbandry → Wayfinding | 140 | +2🌾 +1🕯 | **camps and pastures +1🌾** · +1 happiness per improved *bonus* resource in this city, max +4 (`countScaled`) | the improvement-resource rows, happiness supply |

Eight; the Heroes age wants six — the two I would cut first are Artemis and the Lighthouse
(the Lighthouse's effect is Wayfinding's own package).

## Æra III — the Age of Empire (homed on the shipped Æra II techs)

| wonder | home | ⚙ | yields | effect | plays with |
|---|---|---|---|---|---|
| **The Great Library** | Philosophy | 300 | +3🔬 | **a free technology of the current age** on completion (`settleResearchWindfall`) · libraries +1🔬 | the research windfall seam |
| **The Colossus** | Currency | 280 | +3🪙 | coastal only · **sea resource tiles +1🪙 +1⚙** · *(trade routes later: +1 route)* | fishing boats, the sea luxuries |
| **Petra** | Mathematics | 280 | +2🪙 | desert city only · **desert tiles +1🌾 +1⚙**, floodplains +1🪙 (`tileYield` terrain) | the oasis/floodplain mapgen line |
| **The Circus Maximus** | Construction | 300 | — | **+4 happiness** (`happiness`) · +1 happiness per barracks (`countScaled`) | Funeral Games' supply side, the tier at +5/+10 |
| **The Terracotta Army** | Iron Working | 320 | +2⚙ | **units built in this city +1 combat** (`unitProductionBonus`) · garrisoned units +3 defense (`combatLine`) · +2 authority capacity | barracks, the garrison line |
| **The Great Wall** | Engineering | 340 | +2⚙ | **every border hex exerts zone of control** **(new shape: `zocRule` — the ZOC field treats owned frontier tiles as a combat unit's touch; one clause in `zocField`)** · cities +5 defense | ZOC (Entry XXV), the palisade line |
| **The Theatre of Dionysus** | Drama | 320 | +3🎵 | **a free Doctrine draft** on completion (`settleCultureWindfall` fills the basket) · amphitheaters +1🎵 | the culture bucket |
| **The Mausoleum** | Currency | 300 | +2🪙 | **+1🪙 per building in this city** (`countScaled`) · +2 authority capacity · quarries +1🪙 | building count, the authority meter |
| **The Statue of Zeus** | Bronzeworking → Bronze Panoply | 260 | +1🎵 | **+15% combat attacking cities** (`combatLine`) · one free melee unit of your best type | the melee line, `realiseItem` |

Nine; six ship — cut Zeus, Mausoleum and one of Petra/Colossus (both map-conditional).

## Æra IV — the Age of Cathedrals (homed on the shipped Æra III techs)

| wonder | home | ⚙ | yields | effect | plays with |
|---|---|---|---|---|---|
| **Chichen Itza** | Theology | 450 | +2🎵 +2🕯 | **timed effects last 50% longer** (`effectAmplifier` on `TimedEffect` durations — the rites) · +1 happiness | rites, the timed-effect broom |
| **Hagia Sophia** | Theology | 480 | +3🕯 | **a free prophet** on completion (`realiseItem`) · temples +1🕯 +1🎵 | the augur ladder (a free one skips a rung) |
| **The House of Wisdom** | Education | 500 | +4🔬 | **+50% 🔬 in this city** (city-stage percent) · a free technology | Entry XVII's city stage, the science tier |
| **Angkor Wat** | Theology | 480 | +2🕯 | **+1🕯 per two tiles worked in this city** (`countScaled`) · tile-purchase price −25% (`tilePurchase`) | worked-tile count, the purchase ladder |
| **The Alhambra** | Chivalry | 460 | +3🎵 | **mounted units +2 combat** (`combatLine`) · +1 happiness · units built here start with the garrison bonus | the mounted line, Tourney Ground |
| **Machu Picchu** | Physics | 470 | +2🪙 | mountain-adjacent city only · **+25% 🪙 in this city** · *(trade routes later: +2🪙 per route)* | the mountain adjacency (Eupalinos, Taqī al-Dīn), gold stage |
| **The Great Mosque of Djenné** | Theology | 460 | +3🕯 | **religious units +1 rite charge** (`unitStat` on the augur's `chargesLeft` at creation) · +1 pantheon slot **(new shape, shared with Stonehenge)** | rites, slots |
| **The Water Clock of Su Song** | Machinery | 440 | +3🔬 | **Scholarship 20⚙ → 8🔬** (`rateConversion`) · +1 authority capacity | the projects |
| **Notre-Dame** | Theology | 470 | +2🎵 | **+1 happiness per temple** (`countScaled`) · cathedrals +2🎵 | happiness supply, the temple count |
| **The Forbidden City** | Education | 500 | +2🎵 | **+5 authority capacity** · Statecraft: one more Order office **(new shape: an office grant — the government layout plus one slot of a stated kind)** | the authority meter, the offices |

Ten; six ship. Djenné and Notre-Dame overlap Theology; the Forbidden City's office grant
is the one new shape here worth the design decision (it is the Statecraft equivalent of a
pantheon slot).

## Æra V — the Age of the Magister

| wonder | home | ⚙ | yields | effect | plays with |
|---|---|---|---|---|---|
| **The Porcelain Tower** | The White Gold | 650 | +3🎵 | **every luxury counts as one more copy** (the `perCopy` reading — silver's and gold's exception made general for one turn of the design) · +2 happiness | luxuries.md's per-copy tiers |
| **The Astronomical Bureau** | The Perspective Glass | 680 | +6🔬 | **the final age's objectives are shown a turn early** *(needs the Bead Race)* · until then: +1 sight in every city, every resource on explored land revealed | the fog, the reveal |
| **The Sistine Chapel** | Movable Type → Magister | 620 | +5🎵 | **+25% 🎵 empire-wide** (the *global* stage — the only non-meter global percent in the game; Entry XVII's register must admit it explicitly) · +1 happiness | Entry XVII's two stages |
| **The Leaning Tower** | The Calculating Engine | 640 | +3🔬 | **every draft of every kind shows one more card** (`offerRider`, all kinds) | the draft-size evaluator, once more |
| **The Great Bell** *(the Tsar Kolokol — never rung)* | Fire Medicine | 600 | +2🕯 | **the Magnum Opus costs −20%** *(needs Entry VI)* · until then: +3 happiness | the victory project |

Five; three ship, and only after the Age V nodes exist.

---

## Counts and the first pass

Thirty-two proposed; **a first pass of eighteen** (6 / 6 / 6 across Heroes, Empire and
Cathedrals) is the Civ-shaped number, with the Magister five waiting on the Bead Race and
the Age V nodes. The four **new shapes** the list asks for, in order of value:

1. **a slot grant** (Stonehenge, Djenné — pantheon slots; the Forbidden City — an office):
   one field read where the slot counts are read today;
2. **a purchase-price line** (the Ziggurat — augurs −25%): a `purchaseRider` line in
   `explainPurchaseCost`'s bank, which the gold purchases will want anyway;
3. **`zocRule`** (the Great Wall): one clause in `zocField`;
4. the **global** culture percent (the Sistine): not a shape but a register decision.

Everything else is a data row the day the framework lands.

## Refused, on purpose

Wonders that are a bank statement (accumulate X); wonders whose effect is a unit with no
system behind it (naval, trade before routes exist); a wonder that grants a *great person*
directly (renown pays for those — a wonder already pays renown); more than one wonder per
tech where it can be helped, so the tree stays legible.

## Revisions

*(yours — edit away; ✎ marks what changed)*

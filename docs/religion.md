# Religion — Augurs, Pantheons, Prophets (working doc, first pass)

Faith is the **third draft currency**: culture drafts Orders (slottable posture), science
will draft masteries (permanent things), **faith drafts beliefs** (permanent identity) and
buys the agents who do the drafting. One draft machinery, three profiles. Designed before
the Age 2–5 tree because the tree is built around it. Edit under **Revisions**.

Doctrines this obeys: offers from `state.rng`, pick = command (Entry XV); rites are
Entry XVIII windfalls (instant, modifier-immune, one printed number); beliefs pay science
AND culture, never culture alone (the tech-doc religion rule); cards modify behaviors,
masteries things — beliefs sit with Doctrines on the permanent side.

## The agents

| Unit | Unlock | Cost | Charges | Verbs |
|---|---|---|---|---|
| **Augur** | Divination | 40🕯 + 15 per augur purchased (settler-style escalation) | 3 | **Consecrate** (found/expand the pantheon — consumes the unit, opens a 1-of-3 belief offer, only when a belief slot is open) · **Rite** (one charge, a windfall) |
| **Prophet** | The High Temple (Age 2) | 150🕯 escalating | 1 | **Found the religion** (first prophet: name it, draft 2 beliefs — founder + follower pools) · **Enhance** (later prophets: draft from the enhancer pool) — each consumes the unit |

Faith purchase is a currency-agnostic `purchaseUnit(city, type, currency)` — the M9 gold
purchases share it. Augurs and prophets are the ONLY faith purchases in v1 (religious
buildings faith-purchasable later, maybe never — keep faith legible).

## Belief slots (the anti-spam structure)

An augur is either three rites or one belief. Consecrate is offered only while a slot is
open, so "always draft a belief" cannot be optimal, and *when* to spend an augur on a god
is a tempo decision against the escalating price.

| Source | Slots |
|---|---|
| Divination | 2 pantheon slots (two, so early synergy exists) |
| The High Temple | +1 pantheon slot · unlocks prophets |
| First prophet (founding) | +1 founder · +1 follower |
| Later prophets (enhance) | +2 enhancer (one prophet each) |

~7 beliefs by the late game, accreted — a religion you built.

## Rites (windfalls; unlocked as tech *abilities*, shown on tech hovers via techGifts)

| Rite | Tech home | Effect |
|---|---|---|
| Rite of the Harvest | Divination | +20🌾 to the city on/adjacent (settles growth) |
| Omen Reading | Letters | +20🔬 (settles research) |
| Consecration of the Bounds | Stonecraft | +15🎵 to that city's border basket |
| Blessing of Arms | Bronzeworking | one unit heals fully and gains +5 combat for a turn |
| Rite of Plenty | Calendar | +15💰 |
| Funeral Rites | The High Temple | +2 happiness for 10 turns in that city (a timed line — new small hook: `timedEffect`) |

## Pantheon pool (~14, drawn 3 at a time, without replacement; designed in synergy AXES)

Axis tags make synergy findable: a second belief on your axis should read as the obvious
pick — or you gamble on a new one.

| Belief | Axis | Effect |
|---|---|---|
| Goddess of the Harvest | 🌾 hearth | +1🌾 in every city with a granary |
| Keeper of the Hearth | 🌾 hearth | granary cities +1🕯 · +1 happiness in the capital |
| Star Readers | ✶ sky | +1🔬 per shrine |
| Keeper of the Calendar | ✶ sky | +5🔬 whenever a discovery is claimed · +1🔬 in the capital |
| The Standing Stones | ⛰ stone | monuments +1🎵 +1🕯 |
| Ancestor Cult | ⛰ stone | +1🎵 per city of 4+ population |
| Lady of the Hunt | 🌲 wild | camps +1🌾 · clearing a barbarian camp pays +10🕯 |
| Spirits of the Wood | 🌲 wild | chops pay +5🕯 · forest tiles +1🎵 for cities working them |
| River Mother | 🌊 water | freshwater cities +1🌾 +1🕯 |
| Lord of the Deep | 🌊 water | coastal cities +1💰 +1🕯 |
| God of the Forge | ⚒ war | +1⚙ in cities with a barracks · units +1 combat vs barbarians |
| Rites of Blood | ⚒ war | combat kills pay +3🕯 |
| Oracle of the Crossroads | 🧭 road | +2🕯 per discovery claimed · scouts +1 sight |
| Sacred Fire | — | +1🕯 in every city (the neutral pick) |

## Founder pool (2 drafted at founding — one founder, one follower)

Founder beliefs are the **amplifiers** — a coherent pantheon is what a strong religion is
made of:

| Founder belief | Effect |
|---|---|
| The Great Rite | your pantheon beliefs' numeric effects ×2 |
| Syncretism | +1 to every effect of beliefs sharing an axis with another you hold |
| Divine Right | +2 authority capacity · +1 per belief held |
| Tithe of the Faithful | +1💰 per belief held, per city |

Follower beliefs are city-scoped identity: **Cathedrals of the Sky** (+2🔬 +2🎵 per temple),
**Pilgrimage** (+1🕯 per city per luxury it holds), **Warrior Monks** (units start with +10 hp
in cities with a temple), **Feast Days** (+2 happiness per temple).

## Enhancer pool (later prophets)

**Holy Order** (a faith-purchasable warrior-monk unit line), **Reliquaries** (faith → +🎵
conversion, the Litany at religion scale), **Inquisition** (spread defense — v2),
**Missionary Zeal** (spread — v2), **Theocratic Mandate** (the Religious Mandate doctrine's
partner: activates its deferred half).

## Scope: pantheons are native, religions spread (user ruling 2026-08-26 — the Civ VI split)

- **Pantheon beliefs apply to every city you own, always** — even after a religion is
  founded, and they can never be converted away. The pantheon is your civilization's
  native cults; no spread machinery is needed to ship augurs, slots and the synergy pool.
- **A religion is the exported faith, and spread is its defining feature**: cities carry a
  majority religion; pressure, missionaries, conversion. Its beliefs split the Civ way —
  the **founder** belief pays the founding empire everywhere (the reward for founding,
  immune to how the missionary war goes); **follower** beliefs pay only in cities where the
  religion is the majority, yours or anyone's — the reason to spread; **enhancer** beliefs
  are mostly about spreading better or resisting it.
- Sequencing: **augurs + pantheons ship with the Age 1–2 tree pass; prophets + religions
  + spread ship together in the Age 2–3 pass.** Religious Mandate activates with the
  latter.

## What the tech tree must host (input to the Age 2–3 pass)

Divination (augur, 2 slots, Harvest rite) · Letters (Omen) · Stonecraft (Consecration) ·
Bronzeworking (Blessing) · Calendar (Plenty) · **The High Temple** (Age 2: prophets,
+1 slot, Funeral Rites, the temple building's true home) · **Theology / The Cloister**
(Age 3–4: enhancement, faith-purchasable religious buildings, Holy Order) — and the
Procession line's Statecraft cards (Great Litany, The Tithe, Divine Inspiration at its
true scale once faith income is real).

## Open numbers

Augur 40🕯 +15; prophet 150🕯 escalating; rite amounts; belief numbers — all data, all
playtest. Faith income today is ~2–5/turn from shrines/temples/luxuries/cards; the augur
price implies the first augur ~turn 15–20 after Divination, which feels right.

## Revisions

*(yours — edit away)*

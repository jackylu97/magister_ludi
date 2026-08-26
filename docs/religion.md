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
| Rite of the Harvest | Divination | city gains 1 population |
| Omen Reading | Letters | +15🔬 (settles research), city's buildings that supply science gain +1 science for 20 turns |
| Consecration of the Bounds | Stonecraft | +15 culture, city gains 30% increased border growth for 20 turns |
| Blessing of Arms | Bronzeworking | one unit heals fully and gains +5 combat for 5 turns |
| Rite of Plenty | Calendar | +25 gold, city's worked resource tiles gain 1 gold for 20 turns |
| Funeral Rites | The High Temple | +2 happiness for 20 turns in that city (a timed line — new small hook: `timedEffect`) |

## Pantheon pool (18, drawn 3 at a time, without replacement; designed in synergy AXES)

Axis tags make synergy findable: a second belief on your axis should read as the obvious
pick — or you gamble on a new one.

| Belief | Axis | Effect |
|---|---|---|
| Goddess of the Harvest | 🌾 hearth | +1🌾 on bonus resources that provide food |
| Keeper of the Hearth | 🌾 hearth | granaries gain +1 faith · +1 happiness in the capital |
| Star Readers | ✶ sky | cities adjacent to a mountain gain +3 science |
| Keeper of the Calendar | ✶ sky | every 20 turns, claim a discovery. bonuses from discoveries are multiplied by the current age. |
| The Standing Stones | ⛰ stone | monuments +1🎵 +1🕯 |
| Ancestor Worship | ⛰ stone | +1🎵 per city of 4+ population +5% culture per city of 10+ population|
| Lady of the Hunt | 🌲 wild | camps +1🌾 · clearing a barbarian camp pays +10🕯 |
| Spirits of the Wood | 🌲 wild | chops pay +15🕯 · forest tiles +1🎵 for cities working them |
| River Mother | 🌊 water | cities adjacent to river gain +2 food, shrines in these cities supply +1 happiness |
| Lord of the Sea ✎ | 🌊 water | fishing boats +1⚙ +1💰 *(deferred: water milestone)* |
| God of the Forge | ⚒ war | barracks gain +1 prod · units +1 combat |
| Rites of Blood | ⚒ war | combat kills pay +15🕯 multiplied by current age |
| Oracle of the Crossroads | 🧭 road | +3🕯 per discovery claimed · scouts +1 sight |
| Sacred Fire | — | +1🕯 in every city (the neutral pick) |
| Desert Fathers ✎ | ☀ sun | desert tiles +1🕯 |
| Winter Mother ✎ | ❄ frost | tundra tiles +1🌾 · tundra forests +1🕯 |
| Lord of the Hoard ✎ | ⛰ stone | mines on luxury resources +1🎵 +1🕯 |
| Court Augurs ✎ | — | an augur with ≥1 rite charge stationed in a city gives it +5% 🔬 and 🎵 (the reason to keep an augur home) |

*(Lord of the Sea depends on fishing boats — deferred with the water milestone. Doctrine
note: beliefs MAY modify tiles — religion is the Civ-canonical home for tile-yield
identity, and beliefs are a third stream beside cards (behaviors) and masteries (things);
the line is that beliefs express geography-and-piety, masteries express building classes.)*

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

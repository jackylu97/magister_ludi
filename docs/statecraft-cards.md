# Statecraft — the card pools and governments (working doc)

The content half of ledger Entry XV (the mechanics are ratified there: tier = draft count,
3-new+1-upgrade offers, governments at tiers 3/7/15 as fixed triples, entry-seals, adoption
amnesty, pools stepping per government). Edit under **Revisions**; nothing here is code.

**Mechanism** column: `vocab` = a one-line reuse of the existing effect vocabulary
(perCityYields, percentYields at Entry XVII's city/empire stages, productionBonus,
extraHappiness, authoritySupply, the rulePercent channels, happinessTierBoost);
`hook:<name>` = a small named extension the implementation adds once and future cards reuse.
Doctrine reminders: cards modify *behaviors* (rates, actions, meter levers), masteries will
modify *things*; sidegrades over upgrades; upgrade faces are the same effect at ~1.5–2×.

## Governments (fixed triples — deterministic spine)

| Tier | Choice of three | Slots (M/E/W) | Signature passive |
|---|---|---|---|
| 0 | **Chiefdom** (start) | 1/1/0 | — |
| 3 | **Council of Elders** | 1/2/1 | +1 happiness |
| | **War Chief** | 2/1/1 | +10% ⚙ toward units, all cities |
| | **Priest-King** | 1/1/2 | +1🕯 per city |
| 7 | **Republic** | 1/3/2 | +10% border culture, all cities |
| | **Tyranny** | 3/1/2 | +2 authority capacity |
| | **Theocracy** | 1/2/3 | +1🕯 and +1🎵 per city |
| 15 | **Merchant League** | 2/4/3 | +5% 💰 empire |
| | **Imperium** | 4/2/3 | +2 authority capacity, −10% ⚙ cost toward units |
| | **Divine Mandate** | 2/3/4 | happiness bonus tiers +5pp (amber's mechanism) |

(No diplomatic slot type until diplomacy exists — Entry II's sparse rule; W = wildcard takes
any card.)

## Chiefdom pool (~8 — drafts 1–2, humble by design)

| Card | Type | Effect | Mechanism |
|---|---|---|---|
| War Drums | M | +15% ⚙ toward units in the capital | vocab |
| Blooded Spears | M | +2 combat strength vs barbarians | hook:combatCardLine (the +2-vs-barbs precedent) |
| Far Runners | M | scouts +1 movement | hook:unitStatCard |
| Camp Followers | M | +25🌾 (not 💰) rider when clearing a camp | hook:windfallRider |
| Common Granary | E | capital +1🌾 | vocab |
| Corvée Labour | E | +15% ⚙ toward buildings in the capital | vocab |
| Boundary Stones | E | +20% border culture, all cities | vocab (borders channel) |
| Hearth Tales | W | capital +1🎵 | vocab |

## Government I pool (~12 — tiers 3–6)

| Card | Type | Effect | Mechanism |
|---|---|---|---|
| Levy Muster | M | +10% ⚙ toward units, all cities | vocab |
| Border Wardens | M | +2 combat on your own territory | hook:combatCardLine (terrain-conditional) |
| Spoils of the Wild | M | camp-clear bounty +100% | hook:windfallRider |
| Weights & Measures | E | +1💰 per city | vocab |
| Terrace Fields | E | +10% 🌾, all cities | vocab |
| Quarry Gangs | E | +10% ⚙ toward buildings, all cities | vocab |
| Land Grants | E | tile purchases −20% 💰 | vocab (borderCost channel) |
| Census Rolls | E | +1 authority capacity | vocab |
| Festival Days | W | +2 happiness | vocab |
| Icons of the Hearth | W | +1🕯 per city | vocab |
| Scribal Schools | W | +5% 🔬, all cities | vocab |
| Wandering Players | W | +5% 🎵, all cities | vocab |

## Government II pool (~12 — tiers 7–14)

| Card | Type | Effect | Mechanism |
|---|---|---|---|
| Standing Army | M | +15% ⚙ toward units, all cities | vocab |
| Siege Trains | M | +25% ⚙ toward units in cities with a barracks | hook:buildingConditional (deferred class tag — same hook tea/coffee wait on) |
| March Discipline | M | all combat units +1 movement | hook:unitStatCard |
| The King's Peace | M | +1 happiness per city at peace… (no war state yet) — placeholder: +2 happiness | vocab |
| Coin Mints | E | +10% 💰, all cities | vocab |
| Three-Field Rotation | E | +15% 🌾, all cities | vocab |
| Guild Charters | E | +15% ⚙ toward buildings, all cities | vocab |
| Royal Surveyors | E | +30% border culture + tile purchases −10% | vocab |
| Provincial Governors | E | +2 authority capacity | vocab |
| Pilgrim Roads | W | +2🕯 per city | vocab |
| Court Astronomers | W | +10% 🔬, all cities | vocab |
| Patronage of the Arts | W | +10% 🎵, all cities | vocab |

## Government III pool (~12 — tier 15+, run-defining)

| Card | Type | Effect | Mechanism |
|---|---|---|---|
| Professional Legions | M | +25% ⚙ toward units + units heal +5 in territory | hook:unitStatCard (heal) |
| Terror of the Steppe | M | +4 combat vs barbarians, camps pay double | hook:combatCardLine + windfallRider |
| The Arsenal | M | one free unit of your best melee type per new city founded… — placeholder until spawn hooks: +30% ⚙ toward units in the capital | vocab |
| Imperial Tax | E | +20% 💰, all cities | vocab |
| Breadbasket Edicts | E | +20% 🌾, all cities + growth carryover +10% | vocab (growthCarryover) |
| The Great Works | E | +25% ⚙ toward buildings, all cities | vocab |
| Client Kings | E | +3 authority capacity | vocab |
| Mandate of Heaven | W | happiness bonus tiers +5pp | vocab (happinessTierBoost) |
| The Academy | W | +15% 🔬, all cities | vocab |
| The Grand Stage | W | +15% 🎵, all cities | vocab |
| Relic Processions | W | +2🕯 per city and +1 happiness | vocab |
| Toleration Edicts | W | happiness demand −10% | vocab (happinessDemand) |

## Implementation notes (for the eventual dispatch, not for editing)

- ~44 cards; ≥80% are pure vocabulary reuses — the implementation's real work is the draft
  state machine (Entry XV), seals, governments, and THREE small hooks: `combatCardLine`
  (a labeled combat-preview line from a slotted card — the vs-barbarian precedent),
  `unitStatCard` (movement/heal adjustments read at the one evaluator per stat),
  `windfallRider` (a card scaling/adding to Entry XVIII windfall payouts).
- Two cards are honest placeholders pending systems (war state, spawn hooks) — marked inline.
- Culture cost curve, seal length (v0 5), cadence: rules.json per Entry XV.
- The offer UI is the discoveries' offerCard with the Statecraft parchment dress; the
  collection/slots screen is new (the Orders screen — naming bible).

## Revisions

*(yours — edit away)*

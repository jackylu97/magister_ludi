# The power bar

Measured from 5 bot games of 200 turns, 6 seats each (`docs/plans/card-measurements-2026-10-13.md`), on the tree before the midgame buff and before "only the current band is dealt". Bots are not humans, the sample is small, and per-turn readings cannot see combat, rule or percentage-rider value. Treat these as orders of magnitude. Re-measure after large changes.

## The game in each age

Research age is the highest age among an empire's technologies. A band opens when both its ladder rung (drafts 0 / 4 / 18 / 29 / 45) and its age (band + 1, capped at 4) are reached.

| Age | Turns (bots) | Band dealt | Chairs | Towns | Seat yield / turn | Production per town | A military unit costs (hammers) | Unit strength |
|---|---|---|---|---|---|---|---|---|
| 1 | 1–55 | 0 | 3 | 1–4 | 20–100 (median 44) | ~5 | 15–51 | 15–33 |
| 2 | 55–90 | 1, from about turn 55 | 5 | 4–6 | 200–400 (median 225) | ~10 | 46–61 | 30–35 |
| 3 | 90–160 | 1, then 2 from about turn 114 | 5 → 8 | 6–10 | 400–1,200 (median 543) | ~15 | 81–174 | 42–50 |
| 4 | 135–200 | 2, then 3 from about turn 159 | 8 → 11 | 10–15 | 1,200–3,200 (median 2,450) | ~35 | 181–583 | 45–80 |

Median seat yields by age (food / production / gold / science / culture / faith):
- Age 1: 17 / 11 / 5 / 4 / 4 / 0
- Age 2: 72 / 48 / 19 / 30 / 25 / 14
- Age 3: 144 / 107 / 47 / 106 / 83 / 36
- Age 4: 452 / 476 / 298 / 494 / 442 / 128

Culture per turn in age 1 is about 3 for a typical seat, and the first drafts cost 12 / 18 / 26 / 38 culture. Culture is the draft currency, so early culture is worth far more than its face value.

Unit costs (hammers), from `unitRosterCost`: Warrior 15, Archer 15, Spearman 27, War Chariot 51; Phalanx 46, Swordsman 46, Bowman 61; Legionary 81, Spear Wall 81, Horseman 151, War Elephant 151, Catapult 174; Crossbowman 181, Pikeman 238, Longswordsman 340, Trebuchet 391, Knight 445, Fire Lance 583. A Settler costs 28 and a Worker 10.

## What seated cards pay (yield per turn, summed over the six yields)

| Turns | Chairs | Median seated card | Best seated card |
|---|---|---|---|
| 1–25 | 3 | 1 | 1 |
| 26–50 | 5 | 1 | 7 |
| 51–75 | 5 | 7 | 19 |
| 76–100 | 5 | 12 | 29 |
| 101–125 | 5 | 18 | 47 |
| 126–150 | 8 | 25 | 77 |
| 151–175 | 8 | 40 | 124 |
| 176–200 | 11 | 62 | 194 |

The weakest seated card pays zero in every window, because rule and combat cards are always among the seated. A seated card pays about 3 to 4% of its seat's yield on average.

## Targets for a newly drafted card

| Band | Regular card (yield / turn) | Headline card | One-off lump that registers | Combat line, regular / strong |
|---|---|---|---|---|
| 0 | 4–8 by turn 40 | 10–15 | 50–100 | +2–3 / +4 |
| 1 | 15–25 | 40–50 | 200–400 | +3 / +6 |
| 2 | 35–60 | 100+ | 500–900 | +5 / +8 |
| 3 | 60–120 | 200+ | 1,000+ | +6 / +12 |

- A lump of about 10 to 15 turns of the band's regular card registers. A lump that repeats (on every unit trained, every kill) is sized by how often its moment comes.
- A combat line is about 10% of that age's unit strength for a regular card and 15 to 20% for a strong one.
- A war card's value is the war it shortens. A captured town of five or six citizens is worth 40 to 80 yield a turn in age 3.
- Dominion seats were at war on 32% of their turns in age 2, 45% in age 3 and 37% in age 4 (bots).

## Other measured facts worth designing around

- One-effect cards paid 3.8% of seat yield per seated card, two-effect cards 2.9%, three or more 2.3%.
- One-off grants paid 0.39 yield per seat per turn in total: far too small to notice.
- A card seated in the midgame paid less than the cards already seated (2.9% against 4.0%) before the buff: midgame cards were not upgrades.
- Combat-only, war-only and rule cards were 69% of the Dominion cards offered at band 0 and 56% at band 1, so peaceful hands were about half dead.
- The user's playtest (Mithridates, 2026-10-12): Sword and Plough's +2 culture felt too small; Muster Rites felt bad; Levy of the Land felt great; Six Gardens was weak; a Barracks production rare came too early; the midgame options did not feel impactful.

## How to re-measure

The measuring harness used `explainCardImpact` (`src/sim/cardImpact.ts`), a ghost diff of a seat's yields with and without each seated card, every 5 turns. A full 200-turn six-seat bot game takes about two hours, so for a quick check run fewer seats or fewer turns. Ask the orchestrator before running long games.

# Citizen tile assignment

Base commit `e09c6a35`, save version 256. This proposal applies to human and bot towns. The local playtest still uses the original rules.

## What the current game does

- All four focus settings rank available tiles by food, production and gold. On otherwise equal ground they choose the lower map index. A later-index Academy loses its four science, a Landmark its four culture and a Stone Circle its two faith and one culture.
- The worker compares an improved tile against the weakest worked tile with the same scoring function. On those three fixtures it predicts that nobody will work the improvement. The bot's focus valuation can price all six yields, but it considers only the allocations that the four sheets choose.
- Manual locks take priority over automatic decisions.

## Candidate

Give science, culture and faith one point each in every focus setting. Keep the existing food, production and gold coefficients. Border growth uses its own table with a zero value for each of the added yields. Add a food check when an unlocked tile with one of the new yields can displace a better source of food. If the city cannot meet upkeep, try the lowest-cost food swap until it does. Keep all manual locks.

A three-citizen test town with two upgraded desert Academies and four grassland alternatives shows why the food check matters. Upkeep is six food per turn.

| Rule | Food | Science |
|---|---:|---:|
| Current | 8 | 1.75 |
| One-point weights | 4 | 17.75 |
| One-point weights plus food check | 6 | 9.75 |

Testing all twenty three-tile assignments confirmed that the guarded choice had the highest weighted yield among those that fed the town.

## Four matched maps

Play four two-seat duels to turn 100 with barbarians. Seeds 617 and 719 use Harun al-Rashid and Sejong. Seeds 212 and 1204 use Justinian and Cleopatra. Every ten turns, copy the position and compare assignments at the same population, borders, infrastructure and research. The repeated samples comprise 191 city positions. Each delta below is the sum of changes in the immediate per-turn rates across the 191 positions. These totals do not measure earned income across the games.

| Points per additional yield | Changed positions | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 12 (6.3%) | +12 | −10.7 | +3 | +2.2 | +8.4 | +14 |
| 2 | 26 (13.6%) | +7 | −9.8 | −9 | +7.4 | +19 | +21 |

No sampled city crossed from meeting upkeep to a food deficit. The guarded and unguarded variants gave the same results on these maps. The constructed desert town exercised the food safeguard.

## Two paired 100-turn games

Both seats used the current rules for the first game on each seed and the one-point guarded rule for the second. This measures game outcomes as the towns develop. Each yield total sums the six per-turn rates on the final turn.

| Seed | Leader | Official score | Technologies | Culture drafts | Total yield per turn |
|---:|---|---:|---:|---:|---:|
| 212 | Justinian | 661 → 567 | 26 → 19 | 13 → 11 | 533.2 → 517.8 |
| 212 | Cleopatra | 727 → 791 | 27 → 28 | 15 → 15 | 572.9 → 663.1 |
| 617 | Harun al-Rashid | 451 → 538 | 20 → 22 | 12 → 12 | 202.5 → 281.0 |
| 617 | Sejong the Great | 269 → 418 | 16 → 18 | 10 → 13 | 125.7 → 232.9 |

Across the four seats, official score totaled 2108 under the original rules and 2314 under the candidate. The runs finished without a stall or rejected command. The sample is too small to establish a general strength gain.

## Validation and reproduction

Typechecking passed. All 212 checks in the focused city, city state-update and new fixture files passed. Another 27 worker and focus checks passed. On the original rules, the twelve regression cases for the newly scored yields fail and the manual-lock control passes.

Apply `guarded-citizen-weights.patch` to an isolated checkout of the base commit. The shorter `candidate-only.patch` contains the game logic and regression tests. The complete patch includes the diagnostic scripts.

```sh
git apply /path/to/guarded-citizen-weights.patch
npm run typecheck
npx vitest run test/sim/citizenSixYields.test.ts test/sim/cities.test.ts test/sim/slateRegister.test.ts
npx vitest run test/sim/aiWorkerClaims.test.ts test/sim/aiEndCheckLoops.test.ts -t 'focus|worker.s choice shares|four sheets'
npx vite-node scripts/checkCitizenFood.ts
for seed in 617 719 212 1204; do npx vite-node scripts/checkCitizenWeights.ts "$seed" 100; done
for seed in 212 617; do npx vite-node scripts/checkCitizenPlay.ts "$seed" 100; done
```

Before release, decide whether the rule belongs in the next replay version, and measure it on more maps. It changes automatic assignments during deterministic simulation. The worker's estimate ranks one prospective tile at a time. The arithmetic for focus and worker estimates should also cover the rare cases in which the new city food check chooses a different allocation.

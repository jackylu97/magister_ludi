# Fresh water and coastal access on v257

Two paired, 80-turn self-play comparisons used the combined bots and current citizen rules at commit `ccaa2f8b`. Both games on each seed used the same three leaders, starting positions and barbarians on a duel map. One game process ran at a time. The trial recorded each town when its founding command succeeded. No other bot settings changed between the arms.

The control lens gave fresh water 6 and adjacent coast 4. Its bot used 6 and 0 as flat bonuses, plus the value of potential fishing improvements. The candidate gives the lens and bot 16 and 8. It also counts known coast within two hexes if the town could claim it. Both Arena sliders inherit the shared rules by default. A seat can set either slider to zero. The lens and the other seats retain the shared values.

## Sites at founding

The expansion rows exclude each leader's first town. Fresh, salt only, coast in reach only and inland are exclusive. Immediately coastal counts all cities owning a coast tile at founding, including fresh-water cities. A site with coast in reach only did not yet qualify as a coastal city. Only fresh water avoids the usual growth penalty. The raw events also record when a card gave the town fresh water for growth.

| Map | Rules | Set | Towns | Fresh | Salt only | Coast in reach only | Inland | Immediately coastal | Fresh or coastal |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 314 | control | all | 19 | 5 | 3 | 2 | 9 | 5 | 8 |
| 314 | control | expansions | 16 | 3 | 3 | 2 | 8 | 4 | 6 |
| 314 | candidate | all | 19 | 7 | 4 | 2 | 6 | 8 | 11 |
| 314 | candidate | expansions | 16 | 5 | 4 | 2 | 5 | 7 | 9 |
| 2026 | control | all | 15 | 8 | 2 | 1 | 4 | 3 | 10 |
| 2026 | control | expansions | 12 | 6 | 2 | 1 | 3 | 2 | 8 |
| 2026 | candidate | all | 13 | 9 | 2 | 0 | 2 | 6 | 11 |
| 2026 | candidate | expansions | 10 | 6 | 2 | 0 | 2 | 4 | 8 |
| Total | control | all | 34 | 13 | 5 | 3 | 13 | 8 | 18 |
| Total | control | expansions | 28 | 9 | 5 | 3 | 11 | 6 | 14 |
| Total | candidate | all | 32 | 16 | 6 | 2 | 8 | 14 | 22 |
| Total | candidate | expansions | 26 | 11 | 6 | 2 | 7 | 11 | 17 |

## Growth, score and yields

The population result includes all cities. Expansion growth is the net population gained between founding and turn 80 among the expansions that still exist at turn 80. The founding dates and city counts can differ between arms. The two games do not follow the same city or control for time spent growing.

| Map | Rules | Cities | Population | Expansion growth | Score | Total yield per turn | Technologies | Drafts | Captures |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 314 | control | 19 | 65 | +27 | 1,443 | 819.2 | 55 | 36 | 0 |
| 314 | candidate | 19 | 68 | +28 | 1,555 | 1,173.4 | 50 | 38 | 0 |
| 2026 | control | 15 | 74 | +41 | 1,471 | 782.2 | 59 | 38 | 0 |
| 2026 | candidate | 13 | 60 | +31 | 1,112 | 604.7 | 53 | 34 | 0 |
| Total | control | 34 | 139 | +68 | 2,914 | 1,601.5 | 114 | 74 | 0 |
| Total | candidate | 32 | 128 | +59 | 2,667 | 1,778.1 | 103 | 72 | 0 |

| Pooled yield per turn | Control | 16 / 8 |
|---|---:|---:|
| Food | 343.0 | 342.0 |
| Production | 545.5 | 645.8 |
| Gold | 104.0 | 163.0 |
| Science | 308.4 | 266.4 |
| Culture | 237.0 | 334.8 |
| Faith | 63.5 | 26.0 |

## Recommendation

Use 16 / 8 if the goal is more new cities with fresh water or immediate coastal access. The two maps gained three such expansion sites, from 14 of 28 to 17 of 26. Both maps increased the share. Only seed 314 increased the count of expansions with either type of water. Seed 2026 kept eight of those sites while founding two fewer towns.

The yield result depends on the map. Seed 314 gained 354.2 per turn while seed 2026 lost 177.5. Across the pair, score fell 8.5%, eleven fewer technologies finished, and expansion towns added nine fewer people. The data support the requested site preference. A bot-strength claim would need a larger test, including games with conquest.

## Reproduction

1. Create two copies of commit `ccaa2f8b20f63dfc7a777a7aee016fddb9a7b390` with its dependencies.
2. Apply `site-water-16-8.patch` to the candidate with `git apply`. Put `siteWaterAudit.ts` in each copy's `scripts/` directory.
3. In each copy run the following commands. The patch sets 16 / 8 in the shared game data and exposes both bot overrides through the Arena.

```sh
node_modules/.bin/vite-node scripts/siteWaterAudit.ts combined 314 80 result-314.json
node_modules/.bin/vite-node scripts/siteWaterAudit.ts combined 2026 80 result-2026.json
```

The raw results include the terminal metrics for every seat and every founded city. Starting positions and leader lineups were fixed within each pair. Two maps cannot establish win rate.

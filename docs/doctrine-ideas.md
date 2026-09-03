# Doctrine ideas — the early game (brainstorm, 2026-09-03)

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

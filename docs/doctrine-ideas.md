# Doctrine & order ideas (brainstorm, 2026-09-03)

Two pitch sheets: early-game doctrines (first half) and pool orders (second
half, added same day on your ask — "interesting / holes in our current set,
but not very strong").

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

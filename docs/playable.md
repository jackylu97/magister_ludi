# The Playable Loop — near-term plan (2026-08-23)

Goal: a game the user can play start-to-long-game and feel the balance. AI is PUNTED until
all major systems exist (it is its own campaign); win conditions wait (conquest's `winnerId`
exists silently); netcode after AI. Tackled one at a time, in order — each step leaves the
game more playtestable than the last.

## 1. Mapgen, starts & luxury variety — **BUILT** (2026-08-23; ledger Entry IX.b)
- Start-location scoring: a site is its ground plus the **best six** workable tiles in rings
  1–2, freshwater and coast bonuses (Entry I.b), five hard rejections (no desert/tundra/snow
  site, cold/arid rings, water-majority rings, food and production floors), spacing scaled to
  the **map** so a short roster's starts are a prefix of a full one's. Deterministic from the
  map seed; scored on a *ground view* so the fairness passes cannot move the starts they serve.
- Luxury variety: ten luxuries — incense, jade, marble, furs, dyes joining gems/silk/wine/
  spices/salt. Base +4 per unique stays; each adds a SIGNATURE from a four-shape vocabulary
  (`cityYields`, `empireYields`, `extraHappiness`, `productionBonus`) read by ONE evaluator,
  `src/sim/resourceEffects.ts`, and surfaced as labelled lines everywhere it lands. Incense is
  revealed by Divination. The barracks' unit-only bonus was generalised into the same
  `{ category, percent }` shape rather than given a sibling.
- Fairness: every possible start gets a bonus food and 2 distinct luxury kinds in reach (bounded
  only by what its ground can physically host); kinds are dealt per land region, so variety is
  geographic and trade will matter.
- A resource row is now **entirely data**: `ResourceId` derives from the JSON, props and icons
  fall back for anything undrawn, and a runtime-invented luxury places, pays and explains with
  no TypeScript. The fuller resource list can land as data only.
- Also: new games default to a **single seat**; the multi-seat sandbox stays selectable.

## 2. Territory & gold (M9 folded in)
- Doctrine: happiness owns the vertical (population), authority owns the horizontal (land).
- Border expansion rate = culture × authority factor; borders FREEZE at negative authority.
- Tile purchase with gold, only at positive authority — the flagship gold sink. Possibly
  unit/building purchase and light unit upkeep with it.

## 3. Barbarians
- Roaming hostiles from fog camps; Age-of-Omens military pressure. Deterministic spawns
  from state.rng; camps as fog-of-war content.

## 4. Save / load UI
- Saves are already `{config, log}` replays; expose them in the interface (save slot,
  load from landing page) so long playtests can park overnight.

## 5. Culture payoff — Statecraft drafting (Entry XV)
- Tier = draft count, 3-new+1-upgrade offers, governments at 3/7/15, seals, adoption
  amnesty, Magister's Dice. Tech masteries ride the same machinery after.

## 6. Faith payoff — religion (last, biggest)
- Faith yield, shrines/temples feeding it, religious unlocks through the draft machinery.
  Designed after Statecraft proves the plumbing.

## Punted (explicitly)
- **AI** — after every major system above exists.
- **Win conditions / beads (M11)** — conquest suffices for playtests.
- Netcode, promotions/XP, indirect fire, chop, Sailing/water, trade routes, wonders &
  great people (Age-of-Heroes content), the five-age re-banding (docs/ages.md holds it).

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
  `src/sim/resourceEffects.ts`, and surfaced as labelled lines everywhere it lands. The barracks'
  unit-only bonus was generalised into the same
  `{ category, percent }` shape rather than given a sibling.
- Fairness: every possible start gets a bonus food and 2 distinct luxury kinds in reach (bounded
  only by what its ground can physically host); kinds are dealt per land region, so variety is
  geographic and trade will matter.
- A resource row is now **entirely data**: `ResourceId` derives from the JSON, props and icons
  fall back for anything undrawn, and a runtime-invented luxury places, pays and explains with
  no TypeScript. The fuller resource list can land as data only.
- Also: new games default to a **single seat**; the multi-seat sandbox stays selectable.

## 2. Territory & gold — **BUILT** (2026-08-23; ledger Entry XIV.F)
- Doctrine delivered: happiness owns the vertical (population), authority owns the horizontal
  (land), and it owns *both* ways land is acquired.
- Border growth refitted to Civ 6's pacing — the per-city culture basket was already the right
  machinery, so only the curve moved: `base + mult · n ^ exp` at 10 · 6 · 1.3 in `rules.json`.
  The best-tile chooser and the radius are untouched.
- Authority factor rides the standard percent pipeline through a third `MeterEffect` channel
  (`borders`), because border culture is not a yield — the same culture also fills the empire's
  pool, and only the half that buys ground answers to the writ. At *any* authority deficit
  borders FREEZE: no accrual, no expansion from a full basket, no purchases. Its own ladder
  (`meters.borderFreeze`), a labelled state everywhere it shows.
- `purchaseTile` is the first gold sink: unowned land, inside the work radius, touching the
  player's territory, writ solvent, price covered. Price = ring base × era scaling (rounded to
  5) + 5 per prior purchase, less furs' −10%, all from `rules.json`, all through one evaluator
  the overlay and the reducer share. `Player.tilesPurchased` is the per-player ladder (schema 14).
- Tuning, measured in `test/territory.test.ts`: a monument capital takes tiles on turns
  4 / 9 / 17 / 29; building the monument first slides that ~5 turns later. Both land 3–4 tiles
  inside turns 25–30.
- Buy Tiles mode on the city screen paints a price tag on every frontier hex; barred ones are
  struck through with the reducer's own reason.

### Still open from here (M9 remainder)
- **Unit and building gold purchase** — deliberately out of scope for item 2. The price
  machinery (`explainTilePurchase` / one-evaluator + labelled lines) is the shape to copy.
- **Unit upkeep** — still unbuilt. Nothing spends gold per turn.
- **The faucet.** Building the sink showed there is barely a source: a capital with no
  gold-paying luxury in its rings earns *zero* gold for forty turns. Roads and trade routes are
  parked, markets are late, so tile purchase is currently unaffordable on a poor start. This is
  the first thing to argue about when item 2 is played.

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
- **Non-standard map-size mapgen tuning** (user, 2026-08-24): the game balances around
  STANDARD for now. Known deferred items: duel maps collapse to a single continent under
  `minContinentTiles: 155` (fix: ≤150), and `continentTargetTiles: 200` leaves 28 hand
  slots for 25 luxury kinds (~7 continents × 4; amber/silver/furs miss ~half of maps —
  candidate fix: `luxuryKindsPerContinent: 5`). Revisit when small/large sizes matter.
- **AI** — after every major system above exists.
- **Win conditions / beads (M11)** — conquest suffices for playtests.
- Netcode, promotions/XP, indirect fire, chop, Sailing/water, trade routes, wonders &
  great people (Age-of-Heroes content), the five-age re-banding (docs/ages.md holds it).

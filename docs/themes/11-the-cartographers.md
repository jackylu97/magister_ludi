# 11 · The Cartographers
The unknown as a resource — and the map keeps secrets in LAYERS (each placed at mapgen,
revealed later, so the "generate once" rule holds): ruins (I) → veins (III) → the deep
sea (IV). Wins by: circumnavigation · discovery counts per layer.

**Tech:** Wayfinding (II); Prospecting *(proposed Æra III node — traditional format: unlocks the prospecting verb and the veins layer)*; The Astrolabe (IV) opens the ocean layer.

## Æra I
- Orders:
  - Far Runners — Scouts +1 movement and +1 sight. Civilians +2 movement while embarked.
  - Wolf-Runners — Scouts gain +1 movement, and claiming a ruin grants +10 gold.
  - The Cartographers — +1 science for each 40 hexes you have revealed.
  - Curious Elders — +5 science whenever you claim a ruin.
- Religion:
  - Oracle of the Crossroads — +3 faith for each ruin you claim. Scouts see one hex further.
- Deeds: ▢ ________ (first to claim N ruins?)

## Æra II
- Tech:
  - Wayfinding — unlocks Bireme, War Galley, Harbour, Sea Legs
- Doctrines:
  - Master of Maps — All units +1 sight and +1 movement · all units −2 combat strength.
  - Athenaeum of the Road — A ruin you claim pays every option instead of one.
- Deeds: ▢ ________ (reveal a share of the world?)

## Æra III
- Tech: Prospecting *(ratified 2026-09-02 — the vein spec)* — an Æra III node, traditional format: unlocks the *prospect* act (a worker or explorer spends a turn on a hill to survey it). Veins are seeded under hills at map generation, invisible until surveyed; a failed survey marks the hex **barren** — the map fills in with certainty either way. Every strike also pays a one-time **assay** windfall (+15 gold). Hit rate ~1 in 3. Three kinds, ascending rarity:
  - **Ore veins** (common) — the hill's mine becomes a rich mine: +2 production and +1 gold on top of the surface yield. Strictly better than any other use of the worker-turn, when it hits.
  - **Strategic veins** (uncommon) — a buried copy of iron (later, the age's gate metal). Map-luck insurance: a seat the surface shortchanged can dig its sword line free, and a surplus vein is a trade good when diplomacy lands.
  - **Deep luxuries** (rare) — gems, silver or gold underground. The wide player's happiness supply under Entry LIV's scarcity: the one luxury source that scales with effort instead of the map roll, and every copy feeds the per-copy engines (Provincial Mints, The Grand Bazaar).
  - Antiquities *(user's node, named)* — reveals a second wave of discoveries, claimable only by empires holding this tech. *(Implementation ruling recommended: baked into the map at generation and veiled until the tech — the ad-hoc spawn variant breaks the map-is-generated-once rule; drop any baked site a city has since covered.)*
- Orders: 
- Map: named places *(DEFERRED — user ruling: these are natural wonders, essentially; wait for a natural-wonders pass)*.
- Deeds: ▢ ________
Great people:
- Eratosthenes (scholar) — legacy: +1 science per 50 tiles revealed *(user retune, 20→50, applied to data)*.
- Zhang Qian (merchant) — legacy: +2 gold per 50 tiles revealed *(user retune, 20→50, applied to data)*.
(The map itself pays their pensions — every layer proposal below makes both better.)

## Æra IV
- Tech: Ocean-Going opens *(planned)* ocean discoveries — derelicts and drowned temples on deep water (Tile.discovery already does all of it)
  - Niter *(user)* — a new strategic resource, required by the gunpowder units late in the age *(forward hook: the roster has no gunpowder rows yet; niter ships with them)*.
- Orders: *(planned)* sea charts sold for gold (🐫 crossover)
- Deeds: *(planned)* circumnavigation (feat) · Opus: ▢ ________

## Gaps
Everything after II is planned; auto-explore is already the bot's and the player's shared
verb, so every layer lands for both at once.

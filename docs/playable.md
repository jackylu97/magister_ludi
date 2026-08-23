# The Playable Loop — near-term plan (2026-08-23)

Goal: a game the user can play start-to-long-game and feel the balance. AI is PUNTED until
all major systems exist (it is its own campaign); win conditions wait (conquest's `winnerId`
exists silently); netcode after AI. Tackled one at a time, in order — each step leaves the
game more playtestable than the last.

## 1. Mapgen, starts & luxury variety — IN FLIGHT
- Start-location scoring: guaranteed workable food + production in rings 1–2, freshwater or
  coast bias (site-bonus design, Entry I.b), no tundra/desert starts, minimum capital
  distance scaled to map size. Deterministic from the map seed.
- Luxury variety: new luxuries (incense, jade, marble, furs, dyes) joining gems/silk/wine/
  spices/salt; base +4 happiness per unique stays; each luxury adds a SIGNATURE effect —
  empire-wide or powerfully local — from a small data-driven vocabulary (local city yields,
  empire yields, extra happiness, per-category production bonus). All through the breakdown
  machinery (rule 5). Incense revealed by Divination (the user's own revision note).
- Fairness: every start near 2+ luxury kinds; kinds clustered regionally so trade matters
  later.

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

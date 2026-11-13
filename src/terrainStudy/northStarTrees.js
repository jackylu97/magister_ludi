// Which authored tree set the renderer loads. `true` is the round trees of
// `scripts/terrain-study/build_soft_trees.py` (the visual test of 2026-11-12,
// docs/flags.md (nnnnnnn)); `false` is the study's sculpts. A plain module with
// no imports, because the bundle builder runs `vegetation.js` in Node and
// cannot load the typed look sheet. Keep it equal to `visualTest.northStar` in
// data/view3d.json.
export const NORTH_STAR_TREES = true;
// The tint of mountain rock under the same look: the stone's own lilac times
// this, which gives a warm slate. `null` leaves the stone as authored.
export const NORTH_STAR_ROCK = NORTH_STAR_TREES ? [.82, .74, .6] : null;

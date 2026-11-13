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
// Mountains in the hills' language (the user, 2026-11-13): the mountain's rock
// keeps its own light and dark and takes this colour in place of its lilac. It
// is the hills' cliff rock (`visualTest.hills.soft.cliffs.rock`, #c4b59c) in
// linear light, lifted by half. `null` leaves the stone as it was. A constant
// here and not in the look sheet, for the reason given above.
export const NORTH_STAR_MOUNTAIN_ROCK = NORTH_STAR_TREES ? [.83, .69, .5] : null;
// Which mountain models the renderer loads. `true` is the crags of
// `scripts/terrain-study/build_crag_mountains.py` (the user, 2026-11-13: broad
// rock that steps up through level shelves, with the ground's green or snow on
// the shelves). `false` gives back the study's escarpments. The crags come only
// with the round trees, because each set of models has its own prepared bundle.
export const NORTH_STAR_CRAGS = NORTH_STAR_TREES && true;

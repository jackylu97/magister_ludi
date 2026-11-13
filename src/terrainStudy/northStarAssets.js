// The models of the north-star look (the visual test of 2026-11-12,
// docs/flags.md (nnnnnnn), "Towns and works in the test scene"). They are
// authored by `scripts/terrain-study/build_northstar_assets.py` and sit beside
// the study's kit in public/terrain-study/settlements. The renderer loads them
// only when `visualTest.northStar` in data/view3d.json is true. A plain module
// with no imports, so Node scripts can read it.
export const NORTH_STAR_HOUSES=['ns-house-1a','ns-house-1b','ns-house-1c','ns-house-2a','ns-house-2b','ns-house-2c','ns-house-3a','ns-house-3b','ns-house-3c'];
export const NORTH_STAR_TOWN_ASSETS=[...NORTH_STAR_HOUSES,'ns-hall'];
export const NORTH_STAR_WORK_ASSETS=['ns-mine','ns-quarry','ns-barn','ns-haystack'];

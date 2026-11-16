// The models of the north-star look (the visual test of 2026-11-12,
// docs/flags.md (nnnnnnn), "Towns and works in the test scene"). They are
// authored by `scripts/terrain-study/build_northstar_assets.py` and sit beside
// the study's kit in public/terrain-study/settlements. The renderer loads them
// only when `visualTest.northStar` in data/view3d.json is true. A plain module
// with no imports, so Node scripts can read it.
export const NORTH_STAR_HOUSES=['ns-house-1a','ns-house-1b','ns-house-1c','ns-house-2a','ns-house-2b','ns-house-2c','ns-house-3a','ns-house-3b','ns-house-3c'];
export const NORTH_STAR_TOWN_ASSETS=[...NORTH_STAR_HOUSES,'ns-hall'];
// The animals of the north-star look (the user, 2026-11-13: the horses "seem a
// bit too simple"). `true` draws the models of
// `scripts/terrain-study/build_northstar_animals.py`; `false` gives back the
// study's animals. Each herd names two or three models, and the code that
// places a herd takes them in turn. A resource with no entry (furs) keeps the
// study's animal.
export const NORTH_STAR_ANIMALS=true;
export const NORTH_STAR_HERDS=NORTH_STAR_ANIMALS?{
 horses:['ns-horse-a','ns-horse-b','ns-horse-c'],cattle:['ns-cattle-a','ns-cattle-b'],deer:['ns-deer-a','ns-deer-b'],
 bison:['ns-bison-a','ns-bison-b'],camels:['ns-camel-a','ns-camel-b'],ivory:['ns-elephant-a','ns-elephant-b'],
}:{};
// A north-star animal is drawn this much larger than the study's, so its legs,
// neck and mane still show at the board's usual distance.
export const NORTH_STAR_HERD_SCALE=1.25;
export const NORTH_STAR_ANIMAL_ASSETS=Object.values(NORTH_STAR_HERDS).flat();
// The six works a great person leaves on a hex (the user, 2026-11-14: "make them
// more monumental and larger in stature, they should look and feel
// important"). `true` draws the models of
// `scripts/terrain-study/build_northstar_great_works.py`; `false` gives back the
// study's works. The key is the improvement, the value its model.
export const NORTH_STAR_GREAT_WORK_MODELS=true;
export const NORTH_STAR_GREAT_WORKS=NORTH_STAR_GREAT_WORK_MODELS?{
 academy:'ns-academy',landmark:'ns-landmark',manufactory:'ns-manufactory',customsHouse:'ns-customs-house',citadel:'ns-citadel',holySite:'ns-holy-site',
}:{};
// The animals and the great works are loaded with the works, so the list of works carries them.
export const NORTH_STAR_WORK_ASSETS=['ns-mine','ns-quarry','ns-barn','ns-haystack','ns-windmill','ns-windmill-sails','ns-sheaf','ns-logs','ns-stall',...NORTH_STAR_ANIMAL_ASSETS,...Object.values(NORTH_STAR_GREAT_WORKS)];
// The unit pieces of the north-star look (the user, 2026-11-14: "lets do a
// single melee piece for now"). The key is a unit type, the value a model of
// `scripts/terrain-study/build_northstar_units.py`. A type with no entry keeps
// today's piece. `false` gives back every piece of today exactly.
// `ns-swordsman` is the board game piece (the user, 2026-11-15: "it reads
// better if it looks somewhat like a board game piece, and leans more
// elegant/simple instead of cartoony"). `ns-swordsman-cast` is the same piece
// in one colour, and `ns-swordsman-toon` is the cartoon figure of 2026-11-14.
// Since the user's second look (2026-11-15) `ns-swordsman` is the art deco piece: sharp edges and a few
// long planes. The column piece before it is `ns-swordsman-column`.
// Since the third look (2026-11-15) `ns-swordsman` is the statue piece: a turned robe, a cloak with a curved
// hem, a helmet, a round shield and a sword, on one thick drum. The art deco piece is `ns-swordsman-deco`.
// Since the fourth look (2026-11-15) `ns-swordsman` is the long figure: 8 to 9 heads tall and slim, with the
// weight in the shoulders and cloak. The statue piece before it is `ns-swordsman-statue`.
// To go back to the cartoon figure, write 'ns-swordsman-toon' in the table below.
// Off since 2026-11-15: the user rejected the figure pieces and the abstract families, and keeps today's pieces.
export const NORTH_STAR_UNIT_MODELS=false;
export const NORTH_STAR_UNITS=NORTH_STAR_UNIT_MODELS?{swordsman:'ns-swordsman'}:{};

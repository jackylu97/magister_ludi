// The models of the north-star look (the visual test of 2026-11-12,
// docs/flags.md (nnnnnnn), "Towns and works in the test scene"). They are
// authored by `scripts/terrain-study/build_northstar_assets.py` and sit beside
// the study's kit in public/terrain-study/settlements. The renderer loads them
// only when `visualTest.northStar` in data/view3d.json is true. A plain module
// with no imports, so Node scripts can read it.
export const NORTH_STAR_HOUSES=['ns-house-1a','ns-house-1b','ns-house-1c','ns-house-2a','ns-house-2b','ns-house-2c','ns-house-3a','ns-house-3b','ns-house-3c'];
// The owner's age selects the town's houses and civic building.
// - `houses`: the three house models of that age.
// - `centre`: the building at the hall's address, and `centreSize`, its size as
//   a share of `visualTest.town.hall`'s size. The first age has a larger hut,
//   the second a larger house; only the late ages have a hall.
// - `smoke`: where the town's smoke leaves the centre, in the model's own units
//   (x east, y up, z south): the hut's smoke hole or the building's chimney.
// `visualTest.town.byAge` in data/view3d.json turns the table on; `false` gives
// back `NORTH_STAR_TOWN_BEFORE`: the one hall in every age, and the late houses of before.
export const NORTH_STAR_TOWN_AGES=[
 {houses:['ns-house-1a','ns-house-1b','ns-house-1c'],centre:'ns-great-hut',centreSize:.84,smoke:[0,.80,0]},
 {houses:['ns-house-2a','ns-house-2b','ns-house-2c'],centre:'ns-great-house',centreSize:.84,smoke:[.19,.675,-.10]},
 {houses:['ns-house-3d','ns-house-3e','ns-house-3f'],centre:'ns-hall-3',centreSize:1,smoke:[.27,.82,-.15]},
 {houses:['ns-house-4a','ns-house-3e','ns-house-3f'],centre:'ns-hall-4',centreSize:1,smoke:[.257,.69,-.13]},
];
export const NORTH_STAR_TOWN_BEFORE=[1,2,3].map(tier=>({houses:['a','b','c'].map(v=>`ns-house-${tier}${v}`),centre:'ns-hall',centreSize:1,smoke:[.22,.66,-.02]}));
export const NORTH_STAR_AGED_TOWN_ASSETS=['ns-great-hut','ns-great-house','ns-house-3d','ns-house-3e','ns-house-3f','ns-hall-3','ns-house-4a','ns-hall-4'];
export const NORTH_STAR_TOWN_ASSETS=[...NORTH_STAR_HOUSES,'ns-hall',...NORTH_STAR_AGED_TOWN_ASSETS];
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
// What each work looks like in each age of its owner (the user, 2026-11-16:
// "we should have alternate art for some of the improvements too, the windmills
// feel out of place with the huts representing the city"). The key is the
// improvement. A row has one entry for each of the four ages, the first age
// first. `visualTest.works.byAge` in data/view3d.json turns the table on;
// `false` gives every work the look it had before, at every age. An
// improvement with no row looks the same in every age.
// - farm: `store` is the building in the yard, and `size` is its footprint as a
//   share of `works.barnSize`. `beside` is the model that stands in a row
//   beside it, `count` times, at `besideSize` times `works.haystackSize`.
//   `rack` adds the drying rack. `mill: true` lets the farm be one of the farms
//   with a windmill (`works.windmillShare`).
// - mine, quarry, lumbermill: the model that stands in for today's.
// - pasture, plantation: `[model, scale]`. The pasture's is its shelter; the
//   plantation's is its store.
// Sizes that are not here are in `visualTest.works`.
export const NORTH_STAR_WORK_AGES={
 farm:[
  {store:'ns-granary',size:.66,beside:'ns-sheaf',besideSize:1.15,count:3,rack:true},
  {store:'ns-thatch-barn',size:1,beside:'ns-haystack',besideSize:1,count:2},
  {store:'ns-barn',size:1,beside:'ns-haystack',besideSize:1,count:3,mill:true},
  {store:'ns-loft-barn',size:1,beside:'ns-haystack',besideSize:1,count:3,mill:true},
 ],
 mine:['ns-mine-pit','ns-mine-winch','mine','ns-mine-headframe'],
 quarry:['ns-quarry-cut','ns-quarry-frame','ns-quarry','ns-quarry'],
 lumbermill:['ns-lumber-camp','ns-lumber-camp','lumbermill','ns-saw-hall'],
 pasture:[['ns-shelter',.72],['ns-shelter',.72],['ns-stable',.76],['ns-stable',.76]],
 plantation:[['ns-granary',.9],['ns-thatch-barn',.6],['ns-barn',.6],['ns-loft-barn',.6]],
};
// The number of age steps a row of the table has.
export const NORTH_STAR_WORK_STEPS=4;
// The models the table names that the list of works did not already carry.
export const NORTH_STAR_AGED_WORK_ASSETS=['ns-granary','ns-rack','ns-thatch-barn','ns-mine-pit','ns-mine-winch','ns-quarry-cut','ns-quarry-frame','ns-shelter','ns-stable','ns-lumber-camp','ns-loft-barn','ns-mine-headframe','ns-saw-hall'];
// The renderer replaces only the model the undamaged work would use on this hex.
export const PILLAGED_WORK_MODELS = {
 'ns-loft-barn':'ns-pillaged-grain-loft', 'ns-stable':'ns-pillaged-pasture',
 'ns-windmill':'ns-pillaged-windmill', 'fishing-boat':'ns-pillaged-fishing-boat',
 'ns-mine-headframe':'ns-pillaged-mine-hoist', 'ns-quarry':'ns-pillaged-quarry',
 'ns-saw-hall':'ns-pillaged-saw-hall',
};
// The animals and the great works are loaded with the works, so the list of works carries them.
export const NORTH_STAR_WORK_ASSETS=['ns-mine','ns-quarry','ns-barn','ns-haystack','ns-windmill','ns-windmill-sails','ns-sheaf','ns-logs','ns-stall',...NORTH_STAR_AGED_WORK_ASSETS,...NORTH_STAR_ANIMAL_ASSETS,...Object.values(NORTH_STAR_GREAT_WORKS),...Object.values(PILLAGED_WORK_MODELS)];
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

import {faithVariants} from './faithUnitModels.js';
import {navalVariants} from './navalUnitModels.js';
import {siegeVariants} from './siegeUnitModels.js';
import data from '../../data/units.json';
import {mountedVariants} from './mountedUnitModels.js';
import look from '../../data/view3d.json';
import {polearmVariants,rangedVariants} from './polearmRangedModels.js';

// ModelClass is too broad: infantry and anti-cavalry need distinct silhouettes.
// Keep the rules untouched and track every data ID, including saved-game types.
const originalUnitLines={
 infantry:{label:'Infantry',types:['warrior','swordsman','legionary','longswordsman','fireLance']},
 polearm:{label:'Anti-cavalry',types:['spearman','phalanx','spearWall','pikeman']},
 ranged:{label:'Ranged',types:['archer','bowman','compositeBowman','crossbowman']},
 cavalry:{label:'Cavalry',types:['chariot','horseman','cataphract','knight','knightsTemplar']},
 mountedRanged:{label:'Mounted ranged',types:['chariotArcher','horseArcher']},
 elephant:{label:'War elephant',types:['warElephant']},
 siege:{label:'Siege',types:['catapult','trebuchet']},
 scout:{label:'Scout',types:['scout']},
 worker:{label:'Worker',types:['worker']},
 settler:{label:'Settler',types:['settler']},
 trader:{label:'Caravan',types:['trader']},
 faith:{label:'Religious',types:['augur','prophet','apostle','inquisitor']},
 greatPerson:{label:'Great people',types:['greatPerson']},
 navalLight:{label:'Light ships',types:['trireme','bireme','galley','caravel','corvette']},
 navalHeavy:{label:'Heavy ships',types:['warGalley','towerShip','carrack','shipOfTheLine']},
 navalRanged:{label:'Ranged ships',types:['fireShip','gunGalley','frigate']},
};
// Inventory assignments, not implemented sculpts. Ranks name an existing
// position in the original line; a leader's alternative is not a later tier
// merely because its data row was appended to the roster. Variant identifiers
// distinguish equipment (especially camel, sling and chariot) within that line.
export const leaderUnitArtSpecs={
 slinger:{line:'ranged',rank:1,variant:'sling'},
 fubing:{line:'polearm',rank:0,variant:'militia-spear'},
 tangCavalry:{line:'cavalry',rank:2,variant:'lamellar-lance'},
 whistlingArrow:{line:'mountedRanged',rank:0,variant:'whistling-bow'},
 xiongnuHorseArcher:{line:'mountedRanged',rank:1,variant:'steppe-bow'},
 chanyuGuard:{line:'cavalry',rank:3,variant:'household-guard'},
 khopesh:{line:'infantry',rank:1,variant:'sickle-sword'},
 camelArcher:{line:'mountedRanged',rank:1,variant:'camel-bow'},
 ponticPeltast:{line:'polearm',rank:0,variant:'javelin-shield'},
 scythedChariot:{line:'cavalry',rank:0,variant:'scythed-carriage'},
 gendarme:{line:'cavalry',rank:3,variant:'heavy-lance'},
 mandekalu:{line:'cavalry',rank:1,variant:'quilted-mail'},
 treasureShip:{line:'navalHeavy',rank:2,variant:'treasure-rig'},
 eagleWarrior:{line:'infantry',rank:1,variant:'eagle-headdress'},
 alexandrianGalley:{line:'navalLight',rank:2,variant:'lookout-galley'},
 canoness:{line:'faith',rank:2,variant:'choir-book'},
 rihlaCaravan:{line:'trader',rank:0,variant:'journey-wagon'},
};
export const unitLines=Object.fromEntries(Object.entries(originalUnitLines).map(([line,spec])=>[line,{
 ...spec,types:[...spec.types,...Object.entries(leaderUnitArtSpecs).filter(([,art])=>art.line===line).map(([id])=>id)],
}]));
export const unitExamples=['warrior','spearman','horseman','archer','horseArcher','worker','prophet','scout','settler','trader','greatPerson','warElephant'];
// Availability is distinct from approval: the original examples remain the
// accepted baseline while each equipment batch has its own production review.
export const unitReviewVariants=['swordsman','legionary','longswordsman','fireLance','khopesh','eagleWarrior'];
export const paintedUnitTypes=[...unitExamples,...unitReviewVariants,...polearmVariants,...rangedVariants,...mountedVariants,...siegeVariants,...navalVariants,...faithVariants,'rihlaCaravan'];
export const civilianUnitExamples=['worker','scout','settler','trader','greatPerson'];
export const newUnitExamples=['horseman','horseArcher','greatPerson','warElephant'];
export const greatPersonFamilies={scholar:'Scholar',artist:'Artist',engineer:'Engineer',merchant:'Merchant',general:'General'};
export const greatPersonFamily=value=>Object.hasOwn(greatPersonFamilies,value)?value:'scholar';
export const unitDefinitions=data.units;
export const unitArtSpecs=Object.fromEntries([
 ...Object.entries(originalUnitLines).flatMap(([line,{types}])=>types.map((id,rank)=>[id,{line,rank,ready:unitExamples.includes(id),implemented:paintedUnitTypes.includes(id)}])),
 ...Object.entries(leaderUnitArtSpecs).map(([id,art])=>[id,{...art,ready:false,implemented:paintedUnitTypes.includes(id)}]),
]);
export const unitOwners={enamel:{label:'Lapis study',color:'#294979'},vermilion:{label:'Vermilion study',color:'#b54832'},slate:{label:'Slate study',color:'#9ca5b1'},...Object.fromEntries(['crimson','teal','lapis'].map(id=>[id,{label:{crimson:'Crimson',teal:'Teal',lapis:'Lapis'}[id],color:look.palette[id]}]))};
export const unitNotes={
 warrior:'Infantry counter · ivory cap and a simple wooden club · no shield',
 swordsman:'Infantry variant · cheek guards, round shield and a broad blade · review',
 legionary:'Infantry variant · broad shield and restrained crested helmet · review',
 longswordsman:'Infantry variant · enclosed helmet and long blade · review',
 fireLance:'Infantry variant · upright tube-tipped fire lance · review',
 khopesh:'Infantry variant · curved sickle sword · review',
 eagleWarrior:'Infantry variant · compact eagle headpiece · review',
 phalanx:'Anti-cavalry · broad round shield and long spear',
 spearWall:'Anti-cavalry · tall shield with an ivory spine',
 pikeman:'Anti-cavalry · long pike and small heater shield',
 fubing:'Anti-cavalry · broad spearhead, buckler and pennant',
 ponticPeltast:'Anti-cavalry · javelin and crescent shield',
 bowman:'Ranged · longbow and quiver',
 compositeBowman:'Ranged · recurved bow with ivory tips',
 crossbowman:'Ranged · transverse crossbow and ivory stock',
 slinger:'Ranged · hanging sling and stone pouch',
 spearman:'Spear counter · ivory cap, upright spear and a gilt collar',
 horseman:'Cavalry counter · ivory chess knight and upright sword',
 archer:'Ranged counter · ivory cap, bow and quiver · draft',
 horseArcher:'Mounted ranged counter · ivory knight, side bow and quiver · draft',
 worker:'Worker counter · ivory pawn and pickaxe · draft',
 prophet:'Religious counter · mitre, solar staff and book · draft',
 scout:'Scout counter · hooded cloak and walking staff · draft',
 settler:'Settler counter · ivory pawn with a flag · draft',
 trader:'Caravan counter · covered wagon on four wheels · draft',
 greatPerson:'Great-person counter · laurel, ivory mantle and a family emblem · draft',
 warElephant:'War-elephant counter · ivory tusks, curled trunk and enamel headcloth · draft',
};

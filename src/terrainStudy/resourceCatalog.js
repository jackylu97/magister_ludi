import resourceData from '../../data/resources.json';
import improvementData from '../../data/improvements.json';

export const resourceDefinitions=resourceData.resources;
export const improvementDefinitions=improvementData.improvements;
const groups={
 animal:['cattle','horses','bison','deer','furs','ivory'],
 crop:['wheat','rice','maize','reeds'],
 shrub:['bananas','silk','wine','spices','incense','dyes','tea','coffee','cotton','sugar','olives','honey'],
 ore:['stone','copper','tin','clay','iron','niter','gems','salt','jade','marble','amber','lapis','silver','gold','richOre'],
 marine:['fish','crabs','pearls','coral','whales','tyrian'],
};
export const resourceFamilies=Object.fromEntries(Object.entries(groups).flatMap(([family,ids])=>ids.map(id=>[id,family])));
export const animalAsset={cattle:'cattle',horses:'horse',bison:'bison',deer:'deer',furs:'beaver',ivory:'elephant'};
export const resourceColors={
 stone:'#bcc1b6',copper:'#bd8958',tin:'#a2b5bc',clay:'#c48458',iron:'#706e78',niter:'#c5c3a5',gems:'#718ea2',salt:'#dbd2b6',jade:'#649d83',marble:'#d2ccc0',amber:'#b17b3a',lapis:'#4f6baf',silver:'#bacad1',gold:'#c2a055',richOre:'#8c939c',
 wheat:'#c4ac5b',rice:'#94a55c',maize:'#b7ab5a',reeds:'#91a165',
 wine:'#9f8392',cotton:'#ddd0a8',spices:'#af8758',dyes:'#a19ac2',tea:'#abc897',coffee:'#b8ad8c',sugar:'#b7c299',olives:'#a8b6a1',incense:'#c4b7a2',silk:'#b8caad',bananas:'#bcc488',honey:'#c6b78a',
};

// These are art fixtures only, on copies of generated tiles. Production
// ownership, reveal rules and worker legality remain in the simulation.
export function resourceImprovement(id){
 return Object.entries(improvementDefinitions).find(([,def])=>def.improvesResource?.includes(id))?.[0];
}

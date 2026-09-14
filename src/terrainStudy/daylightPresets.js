// Paint gains/lifts are linear RGB. Physical-light colours are sRGB hex.
// A preset changes uniforms and the sun rig, never map data or geometry.
const originalPaint={
 sun:[1.68,1.42,1.17],water:[1.04,1.09,1.18],fill:[.40,.72,.78],fillLift:[.001,.006,.011],
 shadow:[.085,.25,.60],shadowLift:[.002,.009,.017],desaturate:[0,0,0],greenShadow:[.35,.005],
 middle:[-.50,.08],faces:[.56,.66],ground:[.10,.85],castFill:.33,shoulder:0,
};
const paint=(overrides)=>({...originalPaint,greenShadow:[0,0],shoulder:.88,...overrides});

export const daylightPresets={
 original:{
  label:'Original',note:'The approved daytime study.',sunOffset:[1.7,3,-1.2],
  sun:'#fff0dc',strength:3.3,sky:'#d5e6ff',earth:'#9aa487',fill:.45,environment:.8,
  shadowIntensity:.82,shadowRadius:2,background:'#d7cebc',paint:originalPaint,
 },
 morning:{
  label:'Morning',note:'Peach light · lavender shade',sunOffset:[-2.1,2.1,-1.4],
  sun:'#ffdcbd',strength:3.2,sky:'#a8bced',earth:'#b3a386',fill:.7,environment:.65,
  shadowIntensity:.80,shadowRadius:2.5,background:'#d6d1c9',
  paint:paint({sun:[1.63,1.34,1.12],water:[.98,1.11,1.24],fill:[.55,.67,.97],fillLift:[.008,.012,.025],
   shadow:[.35,.40,.67],shadowLift:[.008,.014,.029],desaturate:[.04,.20,.65],
   faces:[.30,.63],ground:[.08,.72],castFill:.25}),
 },
 day:{
  label:'Daylight',note:'Pale gold light · cool slate shade',sunOffset:[1.7,3,-1.2],
  sun:'#fff0d1',strength:3.3,sky:'#b0c7ee',earth:'#aaa184',fill:.65,environment:.72,
  shadowIntensity:.80,shadowRadius:2.5,background:'#d7cebc',
  paint:paint({sun:[1.67,1.43,1.19],water:[1.04,1.10,1.19],fill:[.49,.68,.91],fillLift:[.005,.010,.018],
   shadow:[.30,.39,.58],shadowLift:[.006,.011,.024],desaturate:[0,.12,.55],
   faces:[.40,.64],ground:[.10,.85],castFill:.28}),
 },
 golden:{
  label:'Golden hour',note:'Amber light · blue-violet shade',sunOffset:[2.35,1.75,-1.4],
  sun:'#ffcd91',strength:3.6,sky:'#9aaee2',earth:'#bba17f',fill:.65,environment:.56,
  shadowIntensity:.82,shadowRadius:3,background:'#ddccb2',
  paint:paint({sun:[1.87,1.29,.86],water:[.98,1.04,1.17],fill:[.46,.60,.91],fillLift:[.006,.010,.023],
   shadow:[.32,.39,.68],shadowLift:[.008,.014,.030],desaturate:[.03,.25,.65],
   faces:[.25,.59],ground:[.08,.64],castFill:.24}),
 },
 dusk:{
  label:'Dusk',note:'Copper light · periwinkle shade',sunOffset:[2.35,1.30,-1.4],
  sun:'#ffad86',strength:2.8,sky:'#929bdc',earth:'#938994',fill:.72,environment:.42,
  shadowIntensity:.80,shadowRadius:3.2,background:'#929bad',
  paint:paint({sun:[1.62,1.05,.91],water:[.86,.96,1.24],fill:[.48,.53,.91],fillLift:[.010,.015,.040],
   shadow:[.29,.33,.66],shadowLift:[.010,.016,.039],desaturate:[.08,.34,.72],
   faces:[.24,.59],ground:[.08,.59],castFill:.22}),
 },
};

export function daylightKey(search){
 const params=new URLSearchParams(search),key=params.get('light')||(params.has('reference')?'original':'golden');
 return Object.hasOwn(daylightPresets,key)?key:'golden';
}

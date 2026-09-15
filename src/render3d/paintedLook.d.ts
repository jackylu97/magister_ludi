import type {WebGLRenderer, Scene, OrthographicCamera, DirectionalLight, HemisphereLight, Vector3, MeshStandardMaterial} from 'three';
import type {PaintedWorksAssets} from './paintedWorks';
import type {PaintedCityAssets} from './paintedCities';
import type {Bounds} from './camera3d';
import type {PaintedVegetationAssets, PaintedBoardMaterials} from './paintedBoard.js';
export interface PaintedLook {
 assets: PaintedVegetationAssets;
 cityAssets: PaintedCityAssets;
 workAssets: PaintedWorksAssets;
 registerMaterial(material:MeshStandardMaterial,options?:{terrain?:boolean;water?:boolean}):void;
 materials: PaintedBoardMaterials;
 sun: DirectionalLight;
 sky: HemisphereLight;
 readonly shadowBakes: number;
 readonly shadowStats: {bakes:number;staticMs:number;staticDraws:number;staticTris:number;counterMs:number;counterDraws:number;counterTris:number};
 render(): void;
 resize(width:number,height:number):void;
 setContactDetail(pixels:number):void;
 setDaylight(key:string):void;
 fitShadows(bounds:Bounds,period:number):void;
 invalidateShadows():void;
 /** Re-fits the counter map when the view moved past what its box has spare (`DioramaCamera.groundReach`, capped by `painted.shadows.counterCoverage`), and re-renders it iff something asked. True when this frame re-rendered it. */
 updateDynamicShadows(target:Vector3,radius:number,reach:number):boolean;
 /** Something on layer 2 changed: the counter depth map is stale until the next frame draws. */
 invalidateDynamicShadows():void;
 /** Who raises the board's near geometry for the static depth pass, and drops it again. */
 setBakeDetail(fn:((active:boolean)=>void)|null):void;
 updateTime(seconds:number):void;
 dispose():void;
}
export function createPaintedLook(renderer:WebGLRenderer,scene:Scene,camera:OrthographicCamera,key?:string):Promise<PaintedLook>;

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
 render(): void;
 resize(width:number,height:number):void;
 setContactDetail(pixels:number):void;
 setDaylight(key:string):void;
 fitShadows(bounds:Bounds,period:number):void;
 invalidateShadows():void;
 updateDynamicShadows(target:Vector3,radius:number):void;
 updateTime(seconds:number):void;
 dispose():void;
}
export function createPaintedLook(renderer:WebGLRenderer,scene:Scene,camera:OrthographicCamera,key?:string):Promise<PaintedLook>;

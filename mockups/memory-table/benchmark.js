import * as T from 'three';
// Dense repeated-study proxy: 113 × 37 = 4181 tile equivalents, versus 4160 standard.
// Geometry sharing intentionally tests chunk reuse, not unique-map generation cost.
export async function benchmark({renderer,scene,camera,controls,board,cabinet,terrain}) {
 const output=document.createElement('pre');output.id='benchmark-results';output.style.cssText='position:fixed;inset:12px;overflow:auto;background:#f3eddfed;padding:22px;z-index:20;font:12px/1.5 monospace;pointer-events:none';document.body.append(output);
 const report={standardTiles:4160,proxyTiles:4181,patches:113,viewport:[renderer.domElement.width,renderer.domElement.height],pixelRatio:renderer.getPixelRatio(),userAgent:navigator.userAgent,method:'113 shared-geometry clones of the detailed 37-tile maquette; dense stress proxy, not generated game map; cached shadows; excludes simulation and UI',runs:[]};
 const geometries=new Set(),materials=new Set();board.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material)}});report.uniqueGeometryBytes=[...geometries].reduce((n,g)=>n+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength||0),0);report.terrainDrawBatches=terrain.children.length;
 output.textContent='Benchmark warming up… Keep this tab visible.';
 renderer.setAnimationLoop(null);camera.far=1000;camera.updateProjectionMatrix();controls.enabled=false;cabinet.visible=false;
 const expanded=new T.Group();scene.add(expanded);const started=performance.now();
 for(let i=0;i<113;i++){const patch=board.clone(true);patch.position.set((i%12-5.5)*10.5,0,(Math.floor(i/12)-4.5)*9.5);expanded.add(patch)}
 report.cloneAssemblyMs=performance.now()-started;
 // Static scene shadows intentionally refreshed once, as in the study.
 const waitFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 async function run(name,full,zoom,refreshShadows=false){board.visible=!full&&name!=='empty scene / timing baseline';expanded.visible=full;camera.position.set(zoom*.6,zoom*.8,zoom);camera.lookAt(0,0,0);camera.updateMatrixWorld();renderer.shadowMap.needsUpdate=true;
 for(let i=0;i<90;i++){await waitFrame();renderer.render(scene,camera)}
 const times=[],cpu=[],calls=[],tris=[];let prev=await waitFrame();const begin=performance.now();
 for(let i=0;i<240;i++){const now=await waitFrame();times.push(now-prev);prev=now;const phase=i/240*Math.PI*.3;camera.position.set(Math.sin(phase)*zoom,zoom*.8,Math.cos(phase)*zoom);camera.lookAt(0,0,0);if(refreshShadows)renderer.shadowMap.needsUpdate=true;const t=performance.now();renderer.render(scene,camera);cpu.push(performance.now()-t);calls.push(renderer.info.render.calls);tris.push(renderer.info.render.triangles)}
 const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];const result={name,frames:times.length,seconds:(performance.now()-begin)/1000,fps:1000/(times.reduce((a,b)=>a+b)/times.length),frameMsMedian:percentile(times,.5),frameMsP95:percentile(times,.95),cpuSubmitMsP95:percentile(cpu,.95),drawCallsMax:Math.max(...calls),trianglesMax:Math.max(...tris),framesOver33ms:times.filter(x=>x>33.34).length,hidden:document.hidden};report.runs.push(result);output.textContent=JSON.stringify(report,null,2);}
 await run('empty scene / timing baseline',false,15);
 await run('single study / play distance',false,15);
 await run('standard proxy / play distance',true,15);
 await run('standard proxy / regional view',true,45);
 await run('standard proxy / whole board',true,150);
 await run('standard proxy / play distance / shadows refreshed each frame',true,15,true);
 report.complete=true;output.textContent=JSON.stringify(report,null,2);const save=document.createElement('button');save.textContent='Download benchmark JSON';save.style.cssText='position:fixed;right:32px;top:24px;z-index:21';save.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.download='memory-table-benchmark.json';a.click();URL.revokeObjectURL(a.href)};document.body.append(save);
}

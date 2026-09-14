import * as T from 'three';
export async function benchmark({renderer,scene,camera,controls,base}){
 renderer.setAnimationLoop(null);controls.enabled=false;
 const testWidth=1440,testHeight=900;renderer.setSize(testWidth,testHeight,false);renderer.domElement.style.width="100vw";renderer.domElement.style.height="100vh";
 const output=document.createElement('pre');output.id='benchmark-results';output.style.cssText='position:fixed;left:12px;top:50px;max-height:85vh;overflow:auto;background:#f7f2e1ed;padding:12px;z-index:40;font:11px monospace;pointer-events:none';document.body.append(output);
 const report={method:'Repeated 37-tile chunks, shared geometry: rendering proxy, NOT a generated standard game map. Includes current asset density and static HUD; excludes simulation, full-map picking and unique-map build/memory.',standardTiles:4160,proxyTiles:4181,patches:113,viewport:[innerWidth,innerHeight],renderTestSize:[testWidth,testHeight],drawingBuffer:[renderer.domElement.width,renderer.domElement.height],dpr:renderer.getPixelRatio(),userAgent:navigator.userAgent,runs:[]};
 const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');report.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const original=new T.Group();for(const o of [...scene.children])if(o.isMesh&&o!==base)original.add(o);scene.add(original);
 const expanded=new T.Group();scene.add(expanded);const start=performance.now();for(let i=0;i<113;i++){const patch=original.clone(true);patch.position.set((i%12-5.5)*12.2,0,(Math.floor(i/12)-4.5)*10.6);expanded.add(patch)}report.cloneAssemblyMs=performance.now()-start;
 camera.far=1000;
 const frame=()=>new Promise(r=>requestAnimationFrame(r));
 async function run(name,mode,extent,shadows=false){output.textContent=`Measuring ${name}… Keep this tab visible.`;original.visible=mode==='single';expanded.visible=mode==='full';camera.zoom=1;camera.left=-extent*testWidth/testHeight;camera.right=-camera.left;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();
 const at=(phase)=>{const x=mode==='full'?Math.sin(phase)*20:Math.sin(phase)*1.5;camera.position.set(x,70,45);camera.lookAt(x,0,0);camera.updateMatrixWorld()};at(0);renderer.shadowMap.needsUpdate=true;
 const cold=performance.now();renderer.render(scene,camera);const firstSubmit=performance.now()-cold;
 for(let i=0;i<45;i++){await frame();renderer.render(scene,camera)}
 const times=[],cpu=[],calls=[],tris=[];let previous=await frame(),hidden=false;for(let i=0;i<180;i++){const now=await frame();times.push(now-previous);previous=now;hidden ||= document.hidden;at(i/180*Math.PI*.5);if(shadows)renderer.shadowMap.needsUpdate=true;const t=performance.now();renderer.render(scene,camera);cpu.push(performance.now()-t);calls.push(renderer.info.render.calls);tris.push(renderer.info.render.triangles)}
 const pct=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];report.runs.push({name,frames:times.length,fps:1000/(times.reduce((a,b)=>a+b)/times.length),medianMs:pct(times,.5),p95Ms:pct(times,.95),p99Ms:pct(times,.99),cpuSubmitP95Ms:pct(cpu,.95),firstRenderSubmitMs:firstSubmit,maxDraws:Math.max(...calls),maxTriangles:Math.max(...tris),framesOver33ms:times.filter(t=>t>33.34).length,hiddenDuringRun:hidden});output.textContent=JSON.stringify(report,null,2)}
 await run('Empty timing baseline','empty',8);
 await run('37 tiles / play zoom','single',8);
 await run('4181 tiles / play zoom / cached shadows','full',8);
 await run('4181 tiles / regional zoom / cached shadows','full',25);
 await run('4181 tiles / whole board / cached shadows','full',85);
 await run('4181 tiles / play zoom / refreshed shadows','full',8,true);
 report.shadowLimit='Current fixed 24x24-world-unit shadow frustum, not full-map shadow coverage. CPU submit timing is not GPU timing.';report.complete=true;output.textContent=JSON.stringify(report,null,2);
}

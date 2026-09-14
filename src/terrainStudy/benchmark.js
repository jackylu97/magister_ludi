// Opt-in, repeatable browser measurements. GPU query results are polled on
// later frames; no gl.finish(), readback or timer-query wait stalls rendering.
export function createBenchmark({renderer,camera,controls,lighting,views,shadowCount}){
 const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const iterations=Math.max(1,Math.min(4,Math.floor(Number(new URLSearchParams(location.search).get('benchIterations'))||1)));
 const device=gl.getExtension('WEBGL_debug_renderer_info');
 const queue=[];let state=null,active=null;
 const panel=document.createElement('pre');panel.id='benchmark-results';
 panel.style.cssText='position:fixed;right:12px;top:60px;max-height:76vh;overflow:auto;max-width:540px;white-space:pre-wrap;padding:12px;background:#f7f2e1f2;color:#243b36;font:11px monospace;z-index:8;display:none';
 document.body.append(panel);
 const dismiss=document.createElement('button');dismiss.textContent='Dismiss results';
 dismiss.style.cssText='position:fixed;right:100px;top:16px;z-index:9;padding:8px;background:#f7f2e1;color:#243b36;border:1px solid #716e5e;display:none';
 dismiss.onclick=()=>{panel.style.display='none';dismiss.style.display='none'};document.body.append(dismiss);
 const summary=values=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),pick=q=>Number(sorted[Math.floor((sorted.length-1)*q)].toFixed(2));
  return {median:pick(.5),p95:pick(.95)};
 };
 const phases=[
  ['range','still',true],['range','pan',true],['grove','pan',true],['overview','pan',true],
  ['range','pan',false],['overview','pan',false],
 ];
 function setPhase(now){
  const [view,motion,contact]=phases[state.index];views[view]();lighting.setContact(contact);
  state.phase={view,motion,contact,contactScale:[],frameMs:[],cpuMs:[],gpuMs:[],calls:[],triangles:[]};state.records.push(state.phase);
  state.base={target:controls.target.clone(),position:camera.position.clone()};state.start=now;state.last=0;
  panel.textContent=`Benchmark ${state.index+1}/${phases.length}: ${view} ${motion}, contact ${contact?'on':'off'}\nWarming up…`;
 }
 function poll(){
  const disjoint=timer&&gl.getParameter(timer.GPU_DISJOINT_EXT);
  if(disjoint){for(const item of queue)gl.deleteQuery(item.query);queue.length=0;if(state)state.disjointResets++;return;}
  for(let i=queue.length-1;i>=0;i--){
   const item=queue[i];if(!gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE))continue;
   if(!disjoint)item.phase.gpuMs.push(gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6/iterations);
   gl.deleteQuery(item.query);queue.splice(i,1);
  }
 }
 function finish(){
  const saved=state;
  camera.position.copy(saved.savedPosition);controls.target.copy(saved.savedTarget);camera.zoom=saved.savedZoom;camera.updateProjectionMatrix();controls.update();lighting.setContact(saved.contact);
  const result={label:new URLSearchParams(location.search).get('benchLabel')||'current',viewport:[innerWidth,innerHeight],dpr:renderer.getPixelRatio(),shading:document.querySelector('#shading-style').value,lighting:document.querySelector('#time-of-day')?.value||'original',settlements:document.querySelector('#settled-preview')?.checked??false,gpuTimer:!!timer,gpu:device?gl.getParameter(device.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),rendersPerFrame:iterations,timing:'CPU/GPU milliseconds per render; frameMs is the entire animation frame',disjointResets:saved.disjointResets,shadowBakes:shadowCount()-saved.shadowStart,
   phases:saved.records.map(p=>({view:p.view,motion:p.motion,contact:p.contact,contactScale:summary(p.contactScale)?.median,frames:p.frameMs.length,frameMs:summary(p.frameMs),cpuMs:summary(p.cpuMs),gpuMs:summary(p.gpuMs),drawCalls:summary(p.calls)?.median,triangles:summary(p.triangles)?.median}))};
  panel.textContent=JSON.stringify(result,null,2);state=null;dismiss.style.display='block';
 }
 function start(){
  if(state)return;
  state={index:0,records:[],savedTarget:controls.target.clone(),savedPosition:camera.position.clone(),savedZoom:camera.zoom,contact:lighting.getContact(),shadowStart:shadowCount(),disjointResets:0};
  dismiss.style.display='none';panel.style.display='block';setPhase(performance.now());
 }
 function before(now){
  poll();if(!state)return false;
  if(state.draining){if(!queue.length||now-state.draining>1500)finish();return false;}
  const elapsed=now-state.start;
  if(elapsed>=4500){
   state.index++;
   if(state.index>=phases.length){state.draining=now;return false;}
   setPhase(now);return true;
  }
  if(state.phase.motion==='pan'){
   const phase=elapsed*.0012,dx=Math.sin(phase)*1.25,dz=Math.cos(phase)*.7;
   controls.target.copy(state.base.target).add({x:dx,y:0,z:dz});camera.position.copy(state.base.position).add({x:dx,y:0,z:dz});
  }
  if(elapsed>=1500){
   if(state.last)state.phase.frameMs.push(now-state.last);
   state.last=now;
   if(!state.progressAt||now-state.progressAt>250){
    panel.textContent=`Benchmark ${state.index+1}/${phases.length}: ${state.phase.view} ${state.phase.motion}, contact ${state.phase.contact?'on':'off'}\nMeasuring… ${state.phase.frameMs.length} frames${iterations>1?` · ${iterations} renders per frame`:''}`;
    state.progressAt=now;
   }
   active={phase:state.phase,start:performance.now(),query:null};
   if(timer&&queue.length<12){active.query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,active.query);}
  }
  return true;
 }
 function after(){
  if(!active)return;
  if(active.query){gl.endQuery(timer.TIME_ELAPSED_EXT);queue.push({phase:active.phase,query:active.query});}
  active.phase.cpuMs.push((performance.now()-active.start)/iterations);
  active.phase.contactScale.push(lighting.getEffectiveContact());
  active.phase.calls.push(renderer.info.render.calls/iterations);active.phase.triangles.push(renderer.info.render.triangles/iterations);active=null;
 }
 return {start,before,after,get renders(){return state&&!state.draining?iterations:1},get running(){return !!state}};
}

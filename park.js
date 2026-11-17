import {createRenderer} from './renderer.js';
import {createPlayer} from './player.js';
import {createController} from './controller.js';
import {createFramePacer,defaults,normalizeGraphics} from './graphics.js';
import {explorationName} from './exploration.js';

const byId=id=>document.getElementById(id);
const scene=byId('scene'),title=byId('title-screen'),start=byId('start'),settings=byId('graphics'),form=byId('options');
const place=byId('exploration-place');
const portrait=matchMedia('(orientation:portrait)'),hdrScreen=matchMedia('(dynamic-range:high)');
const pacing=createFramePacer(),key='aobane-park.graphics.v2';
let quality={...defaults},renderer,player,started=false;
let previous=0,frameCount=0,frameStart=0,fps=0;
let hdrOutput,hdrRequest,hasHdr=false,hdrFailed=false;
try{quality=normalizeGraphics(JSON.parse(localStorage.getItem(key)));}catch{}

function showMetrics(){
  const info=renderer?.info();
  if(info?.width&&info.height){
    byId('render-status').textContent=info.width.toLocaleString('ja-JP')+' × '+info.height.toLocaleString('ja-JP')+
      (fps?'  ·  実測 '+fps+' FPS':'');
    const raster=renderer.kind==='webgl'?'WebGL 2':'代替描画 '+info.internalWidth+' × '+info.internalHeight;
    byId('draw-mode').textContent=raster+'  ·  '+(info.superShadows?'スーパー影':'標準影');
  }
  byId('hdr-status').textContent=hasHdr?'HDRディスプレイ出力':quality.hdr?'SDR向けトーン変換':'';
}
function applyQuality(){
  hasHdr=Boolean(quality.hdr&&hdrOutput&&hdrScreen.matches&&!hdrFailed&&renderer?.kind==='webgl');
  if(!hasHdr)hdrOutput?.hide();
  renderer?.configure(quality,hasHdr);
  showMetrics();
}
function loseHdr(){hdrOutput?.hide();hdrFailed=true;hdrOutput=null;applyQuality();}
function prepareHdr(){
  if(!quality.hdr||!hdrScreen.matches||!navigator.gpu||hdrFailed||hdrRequest||renderer?.kind!=='webgl')return;
  hdrRequest=import('./hdr.js').then(({createHdrOutput})=>createHdrOutput(byId('hdr-scene'),loseHdr)).then(output=>{
    hdrOutput=output;hdrFailed=!output;applyQuality();
  }).catch(loseHdr);
}
function showGraphics(visible){
  if(portrait.matches)return;
  settings.hidden=!visible;
  controller.reset();
  if(visible){showMetrics();byId('close-graphics').focus();}
  else if(started)scene.focus({preventScroll:true});
  else if(!start.disabled)start.focus({preventScroll:true});
}
for(const name of ['resolution','fps','shadows'])form.elements[name].value=String(quality[name]);
form.elements.hdr.checked=quality.hdr;
form.addEventListener('change',()=>{
  quality=normalizeGraphics(Object.fromEntries(new FormData(form)));
  try{localStorage.setItem(key,JSON.stringify(quality));}catch{}
  frameCount=0;frameStart=0;fps=0;applyQuality();prepareHdr();
});
byId('close-graphics').addEventListener('click',()=>showGraphics(false));
hdrScreen.addEventListener('change',()=>{applyQuality();prepareHdr();});
const controller=createController(scene,{
  canMove:()=>Boolean(started&&player&&settings.hidden&&!portrait.matches),
  rotate:(dx,dy)=>player?.rotate(dx,dy),jump:()=>player?.requestJump(),
  graphics:()=>showGraphics(settings.hidden),
});
scene.tabIndex=-1;
function enterPark(){
  if(!renderer||portrait.matches||started)return;
  started=true;title.hidden=true;settings.hidden=true;
  scene.focus({preventScroll:true});
  const root=document.documentElement;
  try{
    if(!document.fullscreenElement&&!document.webkitFullscreenElement){
      const full=root.requestFullscreen?root.requestFullscreen({navigationUI:'hide'}):root.webkitRequestFullscreen?.();
      Promise.resolve(full).then(()=>{
        if(document.fullscreenElement||document.webkitFullscreenElement)return screen.orientation?.lock?.('landscape');
      }).catch(()=>{});
    }
  }catch{}
}
start.addEventListener('click',enterPark);
addEventListener('keydown',event=>{
  if(portrait.matches||event.metaKey||event.ctrlKey||event.altKey)return;
  if(event.code==='KeyG'&&!event.repeat){event.preventDefault();showGraphics(settings.hidden);}
  if(event.code==='Escape'&&!settings.hidden){event.preventDefault();showGraphics(false);}
});
function resetAfterFullscreenExit(){
  if(started&&!document.fullscreenElement&&!document.webkitFullscreenElement)controller.reset();
}
document.addEventListener('fullscreenchange',resetAfterFullscreenExit);
document.addEventListener('webkitfullscreenchange',resetAfterFullscreenExit);
portrait.addEventListener('change',()=>{
  controller.reset();previous=0;
  if(portrait.matches){settings.hidden=true;hdrOutput?.hide();}
});
function fail(error){
  console.error(error);
  started=false;title.hidden=false;settings.hidden=true;start.disabled=true;
  place.hidden=true;
  byId('start-state').textContent='3D風景を読み込めませんでした。ページを再読み込みしてください。';
  hdrOutput?.hide();
}

function render(now){
  requestAnimationFrame(render);
  if(portrait.matches||!renderer)return;
  let elapsed=Math.min(.24,(now-(previous||now))/1000);
  previous=now;
  const input=controller.sample();
  if(started&&settings.hidden){
    while(elapsed>0){
      const step=Math.min(.018,elapsed);player.step(step,input);elapsed-=step;
    }
  }
  const target=started?quality.fps:(renderer.kind==='software'?20:36);
  if(!pacing(now,target))return;
  try{
    const state=player.view(now/1000);
    state.showPlayer=started;
    const name=started&&settings.hidden?explorationName(state.actor.x,state.actor.y,state.actor.z):'';
    if(name&&place.textContent!==name)place.textContent=name;
    place.hidden=!name;
    if(renderer.frame(state)){
      frameCount++;
      if(hasHdr){try{if(!hdrOutput.present(scene))loseHdr();}catch{loseHdr();}}
    }
  }catch(error){fail(error);renderer=null;return;}
  if(!frameStart)frameStart=now;
  if(now-frameStart>1050){
    fps=Math.min(target,Math.round(frameCount*1000/(now-frameStart)));
    frameCount=0;frameStart=now;if(!settings.hidden)showMetrics();
  }
}
async function load(){
  try{return await createRenderer(scene);}
  catch(error){
    if(error.message!=='WebGL 2 is unavailable')throw error;
    const {createSoftwareRenderer}=await import('./software.js');
    return createSoftwareRenderer(scene);
  }
}
load().then(result=>{
  renderer=result;player=createPlayer(result.collision);
  applyQuality();prepareHdr();
  if(!portrait.matches){
    const state=player.view(0);state.showPlayer=false;
    result.frame(state);
  }
  start.disabled=false;byId('start-state').textContent='タップして散策';
  if(new URLSearchParams(location.search).get('graphics')==='1')showGraphics(true);
  requestAnimationFrame(render);
}).catch(fail);

const horizontal=event=>event.clientX;
const vertical=event=>event.clientY;
const clamp=(a,low,high)=>Math.min(high,Math.max(low,a));

export function stick(dx,dy,radius){
  const length=Math.hypot(dx,dy);
  if(length<=radius*.065)return {x:0,z:0};
  const scale=Math.min(1,length/radius)/length;
  return {x:dx*scale,z:-dy*scale};
}
export function isJumpEdge(x,width){
  return x>=width-Math.min(112,Math.max(65,width*.13));
}
export function createController(canvas,{canMove,rotate,jump,graphics}){
  const keys=new Set(), pointers=new Map();
  const recognized=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','KeyQ','KeyE','Space']);
  let joystick={x:0,z:0},lastJump=false,lastMenu=false;
  function reset(){keys.clear();pointers.clear();joystick={x:0,z:0};}
  addEventListener('blur',reset);
  addEventListener('keydown',event=>{
    if(event.target.closest?.('#graphics')||!canMove()||!recognized.has(event.code)||event.metaKey||event.ctrlKey||event.altKey)return;
    event.preventDefault();
    if(event.code==='Space'&&!event.repeat)jump();
    keys.add(event.code);
  });
  addEventListener('keyup',event=>keys.delete(event.code));
  canvas.addEventListener('pointerdown',event=>{
    if(!canMove()||event.button>0)return;
    const x=horizontal(event),y=vertical(event),touch=event.pointerType!=='mouse';
    if(touch&&pointers.size>=2){reset();graphics();return;}
    const movement=touch&&x<innerWidth*.46&&y>=innerHeight*.29;
    if([...pointers.values()].some(pointer=>pointer.movement===movement))return;
    const edge=isJumpEdge(x,innerWidth);
    pointers.set(event.pointerId,{movement,touch,edge,sx:x,sy:y,lastX:x,lastY:y,start:performance.now(),distance:0});
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    const control=pointers.get(event.pointerId);
    if(!control)return;
    const x=horizontal(event),y=vertical(event);
    control.distance=Math.max(control.distance,Math.hypot(x-control.sx,y-control.sy));
    if(control.movement){
      const radius=clamp(innerHeight*.15,43,79);
      joystick=stick(x-control.sx,y-control.sy,radius);
    }else if(!control.edge||control.distance>10){
      const scale=control.touch?.0061:.0047;
      rotate((x-control.lastX)*scale,(control.lastY-y)*scale);
    }
    control.lastX=x;control.lastY=y;
  });
  function release(event){
    const pointer=pointers.get(event.pointerId);
    if(!pointer)return;
    pointers.delete(event.pointerId);
    if(pointer.movement){joystick={x:0,z:0};return;}
    if(event.type==='pointerup'&&pointer.edge&&pointer.distance<=10&&performance.now()-pointer.start<350&&canMove())jump();
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);

  const pressed=(...codes)=>codes.some(code=>keys.has(code));
  const deadzone=v=>Math.abs(v||0)<.15?0:clamp(v,-1,1);
  function sample(){
    let pad;
    try{pad=Array.from(navigator.getGamepads?.()||[]).find(value=>value?.connected);}catch{}
    const button=Boolean(pad?.buttons?.[0]?.pressed);
    if(button&&!lastJump&&canMove())jump();
    lastJump=button;
    const menu=Boolean(pad?.buttons?.[9]?.pressed);
    if(menu&&!lastMenu)graphics();
    lastMenu=menu;
    const x=Number(pressed('KeyD','ArrowRight'))-Number(pressed('KeyA','ArrowLeft'));
    const z=Number(pressed('KeyW','ArrowUp'))-Number(pressed('KeyS','ArrowDown'));
    const px=deadzone(pad?.axes?.[0]),pz=-deadzone(pad?.axes?.[1]);
    const keyboard=x!==0||z!==0,touch=joystick.x!==0||joystick.z!==0;
    return {x:keyboard?x:touch?joystick.x:px,z:keyboard?z:touch?joystick.z:pz,analog:!keyboard,run:pressed('ShiftLeft','ShiftRight'),
      turn:deadzone(pad?.axes?.[2])+Number(pressed('KeyE'))-Number(pressed('KeyQ')),tilt:-deadzone(pad?.axes?.[3])};
  }
  return {reset,sample};
}

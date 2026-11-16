import {shore, height} from './world.js';
import {onIsland, SEA_LEVEL, LAKE_LEVEL} from './land.js';

export const WALK_SPEED=2.78;
export const RUN_MULTIPLIER=1.5;
const GRAVITY=12.0;
const YAW_STEP=2.05;

export function createPlayer(collision){
  const actor={x:5,z:25.5,y:height(5,25.5),yaw:-.17,pitch:-.13,bodyYaw:-.17,
    vy:0,vx:0,vz:0,grounded:true,swimming:false,phase:0,speed:0,clock:0};
  const base=collision.floorAt(actor.x,actor.z,actor.y+.35,actor.y-.35);
  if(Number.isFinite(base))actor.y=base;
  let leap=false;
  function rotate(dx,dy){
    actor.yaw+=dx;
    actor.pitch=Math.min(1.04,Math.max(-1.18,actor.pitch+dy));
  }
  function requestJump(){leap=true;}
  function waterHeight(x,z){return onIsland(x,z)?(shore(x,z)<.996?LAKE_LEVEL:-Infinity):SEA_LEVEL;}
  function step(dt,mv){
    rotate(mv.turn*YAW_STEP*dt,mv.tilt*YAW_STEP*dt);
    const {x,y,z,yaw}=actor, length=Math.hypot(mv.x,mv.z);
    const strength=Math.min(1,length<.07?0:length);
    const running=mv.run||mv.analog&&strength>=.83;
    const speed=WALK_SPEED*(running?RUN_MULTIPLIER:1)*(actor.swimming?.71:1)*strength;
    const sn=Math.sin(yaw),cs=Math.cos(yaw);
    let dx=0,dz=0;
    if(strength){
      dx=(mv.x*cs+mv.z*sn)/length;
      dz=(mv.x*sn-mv.z*cs)/length;
      const desiredYaw=Math.atan2(dx,-dz),arc=Math.atan2(Math.sin(desiredYaw-actor.bodyYaw),Math.cos(desiredYaw-actor.bodyYaw));
      actor.bodyYaw+=arc*(1-Math.exp(-dt*12));
    }
    const smoothing=1-Math.exp(-dt*13);
    actor.vx+=(dx*speed-actor.vx)*smoothing;
    actor.vz+=(dz*speed-actor.vz)*smoothing;

    function horizontal(nextX,nextZ){
      if(Math.abs(nextX-actor.x)+Math.abs(nextZ-actor.z)<.00003)return;
      const top=actor.y+.245, bottom=actor.y-.31;
      const floor=actor.grounded?collision.floorAt(nextX,nextZ,top,bottom):-Infinity;
      const stand=Number.isFinite(floor)?floor:actor.y;
      if(!collision.intersects(nextX,stand,nextZ,actor.bodyYaw)){
        actor.x=nextX;actor.z=nextZ;
        if(Number.isFinite(floor))actor.y=stand;
      }
    }
    horizontal(x+actor.vx*dt,z);
    horizontal(actor.x,z+actor.vz*dt);
    const water=waterHeight(actor.x,actor.z);
    if(leap){
      if(actor.grounded||actor.swimming){
        actor.vy=actor.swimming?2.75:5.15;
        actor.grounded=actor.swimming=false;
      }
      leap=false;
    }
    const swimming=Number.isFinite(water)&&actor.y<water+.17;
    const landing=collision.floorAt(actor.x,actor.z,actor.y+.038,actor.y-Math.max(.098,-actor.vy*dt+GRAVITY*dt*dt+.08));
    if(actor.vy<=0&&Number.isFinite(landing)&&landing>=actor.y-.115){
      actor.y=landing;actor.vy=0;actor.grounded=true;actor.swimming=false;
    }else if(swimming&&actor.vy<=0&&actor.y<=water-.32){
      actor.y=water-.32;actor.vy=0;actor.grounded=false;actor.swimming=true;
    }else{
      actor.grounded=false;actor.swimming=false;
      actor.vy-=GRAVITY*dt;
      const next=actor.y+actor.vy*dt;
      if(actor.vy<=0&&Number.isFinite(landing)&&next<=landing){
        actor.y=landing;actor.vy=0;actor.grounded=true;
      }else if(actor.vy>0&&collision.intersects(actor.x,next,actor.z,actor.bodyYaw)){
        actor.vy=0;
      }else{
        actor.y=next;
      }
    }
    actor.speed=Math.hypot(actor.x-x,actor.z-z)/(dt||1);
    actor.phase+=actor.speed*dt*(actor.swimming?3.6:5.17);
  }
  function view(clock){
    const {yaw,pitch,x,y,z}=actor;
    const f=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
    const offset=[Math.cos(yaw)*.26,0,Math.sin(yaw)*.26];
    const focus=[x+offset[0],y+1.46,z+offset[2]];
    const ideal=focus.map((v,i)=>v-f[i]*3.67);
    let distance=collision.rayDistance(focus,ideal);
    for(const side of [-1,1]){
      const a=[focus[0]+offset[0]*side*.55,focus[1]+.04*side,focus[2]+offset[2]*side*.55];
      const b=a.map((v,i)=>v-f[i]*3.67);
      distance=Math.min(distance,collision.rayDistance(a,b));
    }
    distance=Math.max(.14,distance-.14);
    return {x:focus[0]-f[0]*distance,y:focus[1]-f[1]*distance,z:focus[2]-f[2]*distance,yaw,pitch,clock,actor};
  }
  return {actor,rotate,requestJump,step,view};
}

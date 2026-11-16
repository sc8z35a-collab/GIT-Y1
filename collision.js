import {CANOPY_FIRST, RUNNING_WATER, canopyVisible} from './materials.js';

const STEP=4;
const STRIDE=20;
const EPS=1e-6;
const clamp=(t,min,max)=>Math.max(min,Math.min(max,t));
const dot=(x,y,z,a,b,c)=>x*a+y*b+z*c;

export const playerShape=Object.freeze({
  feet:.19,
  torso:.279,
  head:.151,
  height:1.75,
});

function worldGrid(meshes){
  const order=['terrain','solid','glass','leaf','grass'];
  const size=order.reduce((sum,name)=>sum+(meshes[name]?.length||0)/36,0);
  const data=new Float32Array(size*STRIDE), grid=new Map(), visited=new Uint32Array(size);
  let count=0;
  for(const name of order){
    const mesh=meshes[name];
    if(!mesh)continue;
    const floor=name==='terrain'||name==='solid'||name==='glass';
    for(let i=0;i<mesh.length;i+=36){
      const material=mesh[i+8];
      if(material===RUNNING_WATER)continue;
      const ax=mesh[i],ay=mesh[i+1],az=mesh[i+2];
      const bx=mesh[i+12],by=mesh[i+13],bz=mesh[i+14];
      const cx=mesh[i+24],cy=mesh[i+25],cz=mesh[i+26];
      const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az;
      const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
      const area=Math.hypot(nx,ny,nz);
      if(area<1e-8)continue;
      const at=count*STRIDE;
      data[at]=ax;data[at+1]=ay;data[at+2]=az;
      data[at+3]=bx;data[at+4]=by;data[at+5]=bz;
      data[at+6]=cx;data[at+7]=cy;data[at+8]=cz;
      data[at+9]=material;
      data[at+10]=mesh[i+6];data[at+11]=mesh[i+7];
      data[at+12]=mesh[i+18];data[at+13]=mesh[i+19];
      data[at+14]=mesh[i+30];data[at+15]=mesh[i+31];
      data[at+16]=floor?Math.abs(ny)/area:0;
      data[at+17]=Math.min(ay,by,cy);data[at+18]=Math.max(ay,by,cy);
      data[at+19]=name==='grass'?1:0;
      for(let z=Math.floor(Math.min(az,bz,cz)/STEP);z<=Math.floor(Math.max(az,bz,cz)/STEP);z++){
        for(let x=Math.floor(Math.min(ax,bx,cx)/STEP);x<=Math.floor(Math.max(ax,bx,cx)/STEP);x++){
          const id=x+z*4096;
          let bucket=grid.get(id);
          if(!bucket){bucket=[];grid.set(id,bucket);}
          bucket.push(count);
        }
      }
      count++;
    }
  }
  for(const [id,bucket] of grid)grid.set(id,Uint32Array.from(bucket));
  return {data,grid,visited,count};
}

export function createCollision(meshes){
  const {data,grid,visited,count}=worldGrid(meshes);
  let token=0,closestU=0,closestV=0;
  const occupiedCells=(a,b,c,d,each)=>{
    if(++token>4294967294){visited.fill(0);token=1;}
    for(let z=Math.floor(b/STEP);z<=Math.floor(d/STEP);z++){
      for(let x=Math.floor(a/STEP);x<=Math.floor(c/STEP);x++){
        // Far into the ocean there are no cells.
        if(Math.abs(x)>30||Math.abs(z)>30)continue;
        const cell=grid.get(x+z*4096);
        if(!cell)continue;
        for(let i=0;i<cell.length;i++){
          const id=cell[i];
          if(visited[id]===token)continue;
          visited[id]=token;
          if(each(id*STRIDE))return true;
        }
      }
    }
    return false;
  };
  function opaque(i,u,v){
    if(data[i+9]<CANOPY_FIRST)return true;
    const w=1-u-v;
    return canopyVisible(data[i+10]*w+data[i+12]*u+data[i+14]*v,data[i+11]*w+data[i+13]*u+data[i+15]*v);
  }
  function vertical(x,z,i){
    const ux=data[i+3]-data[i],uz=data[i+5]-data[i+2];
    const vx=data[i+6]-data[i],vz=data[i+8]-data[i+2];
    const det=ux*vz-uz*vx;
    if(Math.abs(det)<EPS)return NaN;
    const dx=x-data[i],dz=z-data[i+2];
    closestU=(dx*vz-dz*vx)/det;
    closestV=(ux*dz-uz*dx)/det;
    if(closestU<-.00005||closestV<-.00005||closestU+closestV>1.00005)return NaN;
    return data[i+1]+closestU*(data[i+4]-data[i+1])+closestV*(data[i+7]-data[i+1]);
  }
  const feet=[[0,0],[-.165,0],[.165,0],[0,-.165],[0,.165],[-.105,-.105],[.105,-.105],[-.105,.105],[.105,.105]];
  function support(x,z,top,lower){
    if(Math.abs(x)>85||Math.abs(z)>80)return -Infinity;
    let result=lower;
    occupiedCells(x-.165,z-.165,x+.165,z+.165,i=>{
      if(data[i+16]<.33||data[i+18]<result||data[i+17]>top)return false;
      if(Math.min(data[i],data[i+3],data[i+6])>x+.166||Math.max(data[i],data[i+3],data[i+6])<x-.166||
         Math.min(data[i+2],data[i+5],data[i+8])>z+.166||Math.max(data[i+2],data[i+5],data[i+8])<z-.166)return false;
      for(const [dx,dz] of feet){
        const candidate=vertical(x+dx,z+dz,i);
        if(candidate>result&&candidate<=top&&opaque(i,closestU,closestV))result=candidate;
      }
      return false;
    });
    return result===lower?-Infinity:result;
  }
  function pointNearTriangle(px,py,pz,i,squared){
    const ax=data[i],ay=data[i+1],az=data[i+2];
    const bx=data[i+3],by=data[i+4],bz=data[i+5];
    const cx=data[i+6],cy=data[i+7],cz=data[i+8];
    const ex=bx-ax,ey=by-ay,ez=bz-az,fx=cx-ax,fy=cy-ay,fz=cz-az;
    const dx=px-ax,dy=py-ay,dz=pz-az;
    const d1=dot(ex,ey,ez,dx,dy,dz),d2=dot(fx,fy,fz,dx,dy,dz);
    const d3=dot(ex,ey,ez,px-bx,py-by,pz-bz),d4=dot(fx,fy,fz,px-bx,py-by,pz-bz);
    const d5=dot(ex,ey,ez,px-cx,py-cy,pz-cz),d6=dot(fx,fy,fz,px-cx,py-cy,pz-cz);
    let u,v;
    if(d1<=0&&d2<=0){u=0;v=0;}
    else if(d3>=0&&d4<=d3){u=1;v=0;}
    else if(d6>=0&&d5<=d6){u=0;v=1;}
    else {
      const vc=d1*d4-d3*d2,vb=d5*d2-d1*d6,va=d3*d6-d5*d4;
      if(vc<=0&&d1>=0&&d3<=0){u=d1/(d1-d3);v=0;}
      else if(vb<=0&&d2>=0&&d6<=0){u=0;v=d2/(d2-d6);}
      else if(va<=0&&d4-d3>=0&&d5-d6>=0){v=(d4-d3)/(d4-d3+d5-d6);u=1-v;}
      else {const inverse=1/(va+vb+vc);u=vb*inverse;v=vc*inverse;}
    }
    const x=dx-u*ex-v*fx,y=dy-u*ey-v*fy,z=dz-u*ez-v*fz;
    return x*x+y*y+z*z<squared&&opaque(i,u,v);
  }
  function edgeNear(x,z,low,high,i,aa,bb,squared){
    const a=i+aa*3,b=i+bb*3;
    const ax=data[a],ay=data[a+1],az=data[a+2],dx=data[b]-ax,dy=data[b+1]-ay,dz=data[b+2]-az;
    let first=0,last=1;
    if(Math.abs(dy)>EPS){
      const s=(low-ay)/dy,t=(high-ay)/dy;
      first=Math.max(0,Math.min(s,t));last=Math.min(1,Math.max(s,t));
    }else if(ay<low||ay>high)return false;
    if(first>last)return false;
    const r=(dx*dx+dz*dz), t=clamp(r>EPS?((x-ax)*dx+(z-az)*dz)/r:first,first,last);
    const xx=ax+dx*t-x,zz=az+dz*t-z;
    if(xx*xx+zz*zz>=squared)return false;
    return opaque(i,(aa===1?1-t:0)+(bb===1?t:0),(aa===2?1-t:0)+(bb===2?t:0));
  }
  function hitSegment(x,z,low,high,r,i){
    if(data[i+18]<low-r||data[i+17]>high+r)return false;
    if(Math.min(data[i],data[i+3],data[i+6])>x+r||Math.max(data[i],data[i+3],data[i+6])<x-r||
       Math.min(data[i+2],data[i+5],data[i+8])>z+r||Math.max(data[i+2],data[i+5],data[i+8])<z-r)return false;
    const squared=r*r,y=vertical(x,z,i);
    if(y>=low&&y<=high&&opaque(i,closestU,closestV))return true;
    return pointNearTriangle(x,low,z,i,squared)||pointNearTriangle(x,high,z,i,squared)||
      edgeNear(x,z,low,high,i,0,1,squared)||edgeNear(x,z,low,high,i,1,2,squared)||edgeNear(x,z,low,high,i,2,0,squared);
  }
  function intersects(x,y,z,yaw=0){
    const width=playerShape.torso;
    const px=x-Math.sin(yaw)*.13,pz=z+Math.cos(yaw)*.13;
    return occupiedCells(x-width-.04,z-width-.04,x+width+.04,z+width+.04,i=>{
      if(data[i+18]<y+.092||data[i+17]>y+playerShape.height)return false;
      if(data[i+19]===1&&data[i+18]<y+.25)return false;
      return hitSegment(x,z,y+.21,y+.69,playerShape.feet,i)||
        hitSegment(x,z,y+.79,y+1.325,playerShape.torso,i)||
        hitSegment(px,pz,y+1.04,y+1.30,.168,i)||
        hitSegment(x,z,y+1.55,y+1.60,playerShape.head,i);
    });
  }
  function rayDistance(from,to){
    const vx=to[0]-from[0],vy=to[1]-from[1],vz=to[2]-from[2];
    const length=Math.hypot(vx,vy,vz);
    let nearest=1;
    occupiedCells(Math.min(from[0],to[0]),Math.min(from[2],to[2]),Math.max(from[0],to[0]),Math.max(from[2],to[2]),i=>{
      if(data[i+19]===1||data[i+18]<Math.min(from[1],to[1])||data[i+17]>Math.max(from[1],to[1]))return false;
      const ax=data[i],ay=data[i+1],az=data[i+2];
      const abx=data[i+3]-ax,aby=data[i+4]-ay,abz=data[i+5]-az;
      const acx=data[i+6]-ax,acy=data[i+7]-ay,acz=data[i+8]-az;
      const hx=vy*acz-vz*acy,hy=vz*acx-vx*acz,hz=vx*acy-vy*acx;
      const determinant=dot(abx,aby,abz,hx,hy,hz);
      if(Math.abs(determinant)<EPS)return false;
      const tx=from[0]-ax,ty=from[1]-ay,tz=from[2]-az,inv=1/determinant;
      const u=dot(tx,ty,tz,hx,hy,hz)*inv;
      if(u<0||u>1)return false;
      const qx=ty*abz-tz*aby,qy=tz*abx-tx*abz,qz=tx*aby-ty*abx;
      const v=dot(vx,vy,vz,qx,qy,qz)*inv;
      if(v<0||u+v>1)return false;
      const distance=dot(acx,acy,acz,qx,qy,qz)*inv;
      if(distance>.015&&distance<nearest&&opaque(i,u,v))nearest=distance;
      return false;
    });
    return length*nearest;
  }
  return {count,floorAt:support,intersects,rayDistance};
}

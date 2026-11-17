import {CANOPY_FIRST, material} from './materials.js';
import {cliff, cliffWall, LAKE_LEVEL, parkBoundary} from './land.js';
import {buildExpansion, clearing, extraPaths, grading} from './expansion.js';
import {plantTree, trunkProfiles} from './trees.js';
import {buildExploration, explorationCuts, explorationPaths, nearExplorationEarthworks} from './exploration.js';

const TAU = Math.PI * 2;
export const WET_LEVEL = LAKE_LEVEL;
export const pond = {x: 4, z: -12, rx: 22.8, rz: 18.5};
export {parkBoundary};

export function smooth(a,b,v) {
  const t = Math.max(0,Math.min(1,(v-a)/(b-a)));
  return t*t*(3-2*t);
}
export const mix = (a,b,t) => a+(b-a)*t;

function rng(seed) {
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  };
}
let rand = rng(586213);
let compact = false;
const rnd = (a,b) => mix(a,b,rand());
const pick = values => values[Math.floor(rand()*values.length)];

function catmull(waypoints, loop=false) {
  const pts=[];
  const count=waypoints.length;
  const at = i => waypoints[loop?(i+count)%count:Math.max(0,Math.min(count-1,i))];
  for(let i=0;i<(loop?count:count-1);i++) {
    const a=at(i-1), b=at(i), c=at(i+1), d=at(i+2);
    for(let k=0;k<8;k++) {
      const t=k/8;
      pts.push(b.map((value,axis)=>.5*((2*value)+(-a[axis]+c[axis])*t+(2*a[axis]-5*value+4*c[axis]-d[axis])*t*t+(-a[axis]+3*value-3*c[axis]+d[axis])*t*t*t)));
    }
  }
  pts.push(loop?pts[0]:waypoints[count-1]);
  return pts;
}
export const paths = [
  {w:1.66, points:catmull([[3,19],[-13,17],[-23,10],[-26,-1],[-26,-16],[-22,-28],[-8,-35],[9,-35],[24,-30],[30,-21],[31,-9],[29,3],[25,12],[16,18]],true)},
  {w:1.95, points:catmull([[5,44],[5,31],[4.7,25],[4,19],[1,12],[-2,6]])},
  {w:1.35, points:catmull([[-23,10],[-30,13],[-38,16],[-43,10],[-43,-3],[-38,-15],[-32,-21],[-26,-21]])},
  {w:1.55, points:catmull([[26,12],[32,17],[37,24],[29,32],[17,31],[8,28],[5,31]])},
  {w:1.42, points:catmull([[29,3],[33,-1],[38,-3],[44,-8],[46,-18],[41,-28],[29,-27]])},
  {w:1.22, points:catmull([[-24,0],[-20,1],[-14,1],[-9,1]])},
  {w:1.22, points:catmull([[29,4],[24,1],[20,1],[17,1]])},
  {w:1.15, points:catmull([[3,19],[-3,24],[-11,30],[-22,27],[-29,17],[-30,13]])},
  ...[...extraPaths,...explorationPaths].map(({w,points})=>({w,points:catmull(points)})),
];

const pathGrid = new Map();
for(const {w,points} of paths) {
  for(let i=1;i<points.length;i++) {
    const [x,z]=points[i-1], [nx,nz]=points[i];
    const range=w+3.1;
    for(let ix=Math.floor((Math.min(x,nx)-range)/4);ix<=Math.floor((Math.max(x,nx)+range)/4);ix++) {
      for(let iz=Math.floor((Math.min(z,nz)-range)/4);iz<=Math.floor((Math.max(z,nz)+range)/4);iz++) {
        const key=ix+iz*200;
        if(!pathGrid.has(key)) pathGrid.set(key,[]);
        pathGrid.get(key).push([x,z,nx-x,nz-z,w]);
      }
    }
  }
}
export function pathDistance(x,z) {
  let nearest=4;
  const segments=pathGrid.get(Math.floor(x/4)+Math.floor(z/4)*200);
  if(!segments) return nearest;
  for(const [px,pz,vx,vz,w] of segments) {
    const dx=x-px,dz=z-pz;
    const t=Math.max(0,Math.min(1,(dx*vx+dz*vz)/(vx*vx+vz*vz || 1)));
    nearest=Math.min(nearest, Math.hypot(dx-vx*t,dz-vz*t)-w);
  }
  return nearest;
}
export function shore(x,z) {
  const dx=(x-pond.x)/pond.rx, dz=(z-pond.z)/pond.rz;
  const edge=.045*Math.sin(z*.41+x*.086)+.033*Math.cos(x*.44-z*.24)+.022*Math.sin(x*.76+z*.28);
  return Math.hypot(dx,dz)-edge;
}
function hill(x,z,cx,cz,r,h) {
  return h*Math.exp(-((x-cx)**2+(z-cz)**2)/(r*r));
}
export function height(x,z) {
  const dist=shore(x,z);
  const folds=.24+.2*Math.sin(x*.143+z*.047)+.17*Math.cos(z*.206-x*.052)+.10*Math.sin(x*.269+z*.174);
  const roll=folds+hill(x,z,-44,17,20,3.1)+hill(x,z,-47,-22,18,2.6)+hill(x,z,18,-45,25,2.8)+hill(x,z,55,25,20,2.3)+hill(x,z,43,-12,19,1.1);
  const bank=mix(-2.9,-.13,smooth(.35,1,dist));
  const relief=mix(.46,1,smooth(.9,1.22,dist));
  const y = dist<=1 ? bank : mix(-.13,roll*relief,smooth(1,1.24,dist));
  const landing=1-smooth(2.3,5.4,Math.abs(z-1));
  const edge=(1-smooth(.2,2.4,Math.min(Math.abs(x+18),Math.abs(x-24))));
  let result=mix(y,.38,landing*edge*smooth(.99,1.1,dist));
  for(const zone of grading){
    const r=((x-zone.x)/zone.rx)**2+((z-zone.z)/zone.rz)**2;
    if(r<1)result=mix(result,zone.y,(1-smooth(.31,1,r))*(zone.dry?smooth(1.012,1.12,dist):1));
  }
  return result;
}
export const bridge = {x1:-18.5,x2:24.6,z:1,width:2.86};
export function deck(x) {
  const t=(x-bridge.x1)/(bridge.x2-bridge.x1);
  return .43 + .8*Math.sin(Math.max(0,Math.min(1,t))*Math.PI)*Math.sin(Math.max(0,Math.min(1,t))*Math.PI);
}

function sub(a,b) {return a.map((v,i)=>v-b[i]);}
function add(a,b) {return a.map((v,i)=>v+b[i]);}
function mul(a,k) {return a.map(v=>v*k);}
function cross(a,b) {return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function unit(v) {const l=Math.hypot(...v)||1; return mul(v,1/l);}
function polar(r,a) { return [Math.cos(a)*r,Math.sin(a)*r]; }
const white=[1,1,1];

export class Mesh {
  constructor() {this.data=[];}
  vert(p,n,uv,mat,tint) {this.data.push(...p,...n,...uv,mat,...tint);}
  tri(a,b,c,mat=0,tint=white,uv=[[0,0],[1,0],[0,1]],normals=null) {
    const n=unit(cross(sub(b,a),sub(c,a)));
    for(let i=0;i<3;i++) this.vert([a,b,c][i],normals?.[i]||n,uv[i],mat,tint);
  }
  quad(a,b,c,d,mat=0,tint=white,uv=[[0,0],[1,0],[1,1],[0,1]],normals=null) {
    const n=unit(cross(sub(b,a),sub(c,a)));
    const p=[a,b,c,d];
    for(const i of [0,1,2,0,2,3]) this.vert(p[i],normals?.[i]||n,uv[i],mat,tint);
  }
  box(x,y,z,w,h,d,mat,tint=white,yaw=0,sx=1,sy=1) {
    const cs=Math.cos(yaw),sn=Math.sin(yaw);
    const p=(a,b,c)=>[x+a*cs+c*sn,y+b,z-a*sn+c*cs];
    const a=p(-w/2,-h/2,-d/2), b=p(w/2,-h/2,-d/2), c=p(w/2,-h/2,d/2), d0=p(-w/2,-h/2,d/2);
    const e=p(-w/2,h/2,-d/2), f=p(w/2,h/2,-d/2), g=p(w/2,h/2,d/2), h0=p(-w/2,h/2,d/2);
    const uv=[[0,0],[sx,0],[sx,sy],[0,sy]];
    this.quad(d0,c,g,h0,mat,tint,uv); this.quad(b,a,e,f,mat,tint,uv);
    this.quad(a,d0,h0,e,mat,tint,uv); this.quad(c,b,f,g,mat,tint,uv);
    this.quad(e,h0,g,f,mat,tint,uv); this.quad(d0,a,b,c,mat,tint,uv);
  }
  tube(a,b,r1,r2,mat,tint=white,sides=8,repeat=null) {
    const dir=unit(sub(b,a));
    const ref=Math.abs(dir[1])>.9?[1,0,0]:[0,1,0];
    const ux=unit(cross(dir,ref)), uz=unit(cross(dir,ux));
    const rings=[],normals=[];
    for(let i=0;i<=sides;i++) {
      const angle=i*TAU/sides;
      const n=add(mul(ux,Math.cos(angle)),mul(uz,Math.sin(angle)));
      normals.push(n);
      rings.push([add(a,mul(n,r1)),add(b,mul(n,r2))]);
    }
    const len=repeat ?? Math.max(.6,Math.hypot(...sub(b,a))/2.5);
    for(let i=0;i<sides;i++) {
      const j=i+1;
      this.quad(rings[i][0],rings[j][0],rings[j][1],rings[i][1],mat,tint,
        [[i/sides,0],[j/sides,0],[j/sides,len],[i/sides,len]],[normals[i],normals[j],normals[j],normals[i]]);
      if(r2>.04) this.tri(b,rings[i][1],rings[j][1],mat,tint);
    }
  }
  orb(x,y,z,rx,ry,rz,mat,tint=white,rings=5,sides=9,rough=.12) {
    const pts=[];
    for(let j=0;j<=rings;j++) {
      pts[j]=[];
      for(let i=0;i<sides;i++) {
        const phi=j/rings*Math.PI, a=i/sides*TAU, k=1+rnd(-rough,rough);
        pts[j][i]=[x+rx*Math.cos(a)*Math.sin(phi)*k,y+ry*Math.cos(phi)*k,z+rz*Math.sin(a)*Math.sin(phi)*k];
      }
    }
    for(let j=0;j<rings;j++) for(let i=0;i<sides;i++) {
      const k=(i+1)%sides;
      this.quad(pts[j][i],pts[j][k],pts[j+1][k],pts[j+1][i],mat,tint,[[i/sides,j/rings],[(i+1)/sides,j/rings],[(i+1)/sides,(j+1)/rings],[i/sides,(j+1)/rings]]);
    }
  }
  leaf(p,l,w,a,tilt,mat,tint,uvOffset=0) {
    const dx=Math.cos(a),dz=Math.sin(a),dy=tilt*l;
    const tip=[p[0]+dx*l,p[1]+dy,p[2]+dz*l];
    const ridge=[p[0]+dx*l*.48,p[1]+dy*.52+w*.32,p[2]+dz*l*.48];
    const left=[p[0]+dx*l*.41-dz*w,p[1]+dy*.41,p[2]+dz*l*.41+dx*w];
    const right=[p[0]+dx*l*.41+dz*w,p[1]+dy*.41,p[2]+dz*l*.41-dx*w];
    const v=uvOffset;
    this.tri(p,left,ridge,mat,tint,[[v,.22],[v+.22,.06],[v+.24,.22]]);
    this.tri(ridge,left,tip,mat,tint,[[v+.24,.22],[v+.22,.06],[v+.49,.22]]);
    this.tri(p,ridge,right,mat,tint,[[v,.22],[v+.24,.22],[v+.22,.4]]);
    this.tri(ridge,tip,right,mat,tint,[[v+.24,.22],[v+.49,.22],[v+.22,.4]]);
  }
  spray(p,width,height,a,slope,tint,texture=40) {
    const cs=Math.cos(a)*width*.5,sn=Math.sin(a)*width*.5;
    const q=height*.5,k=slope*q;
    const at=(u,v)=>[p[0]+u*cs-v*k*Math.sin(a),p[1]+v*q,p[2]+u*sn+v*k*Math.cos(a)];
    this.quad(at(-1,-1),at(1,-1),at(1,1),at(-1,1),CANOPY_FIRST+texture,tint);
  }
  packed(){return new Float32Array(this.data);}
}

const m = {
  copper:1,zinc:2,bronze:3,panel:4,glass:5,grille:7,
  basalt:9,eroded:10,mossRock:11,gravel:12,gneiss:13,wetRock:14,rust:15,
  ashlar:27,stain:28,mossWall:29,runoff:30,ornament:31,foliate:32,rubble:34,granite:35,
  grass:36,dry:37,dirt:38,leaves:39,leaf:40,bark:41,moss:42,mulch:43,verge:44,
  limestone:45,column:46,capital:47,arch:48,plaster:49,fresco:50,oak:52,tapestry:53,
  rail:54,ties:55,lining:56,paving:57,asphalt:58,tile:59,galvanized:60,guard:61,manhole:62,
  clover:63,dandelion:64,fern:65,gorse:66,thyme:67,meadow:68,forest:69,roots:70,mud:71,
};

function buildGround() {
  const mesh=new Mesh();
  const step=compact?1.59:1.00;
  function divisions(limit,edges){
    const count=Math.ceil(limit*2/step);
    const grid=Array.from({length:count+1},(_,i)=>(i/count*2-1)*limit);
    return [...new Set([...grid,...edges].map(n=>Math.round(n*1e8)/1e8))].sort((a,b)=>a-b);
  }
  const xs=divisions(cliff.x,explorationCuts.flatMap(({x0,x1})=>[x0,x1]));
  const zs=divisions(cliff.z,explorationCuts.flatMap(({z0,z1})=>[z0,z1]));
  const grid=zs.map(z=>xs.map(x=>{
    const h=height(x,z),pd=pathDistance(x,z);
    const normal=unit([height(x-.2,z)-height(x+.2,z),.4,height(x,z-.2)-height(x,z+.2)]);
    return {p:[x,h,z],n:normal,uv:[pd,shore(x,z)]};
  }));
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const x=(xs[i]+xs[i+1])*.5,z=(zs[j]+zs[j+1])*.5;
    if(explorationCuts.some(c=>x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1))continue;
    const a=grid[j][i],b=grid[j+1][i],c=grid[j+1][i+1],d=grid[j][i+1];
    for(const v of [a,b,c,a,c,d])mesh.vert(v.p,v.n,v.uv,-10,white);
  }
  return mesh;
}

function bridgeModel(g) {
  const count=111, dx=(bridge.x2-bridge.x1)/count, z=bridge.z, hw=bridge.width/2;
  for(let i=0;i<count;i++) {
    const x=bridge.x1+dx*(i+.5), y=deck(x), v=rnd(.73,1.12);
    g.box(x,y-.068,z,dx-.014,.14,bridge.width+.09,m.oak,[v*.78,v*.69,v*.52],0,.29,.46);
    if(i%4===0) for(const sign of [-1,1]) g.box(x,y+.006,z+sign*hw*.85,.033,.013,.045,m.bronze,[.35,.33,.24]);
  }
  for(const sign of [-1,1]) {
    let last;
    for(let i=0;i<=16;i++) {
      const x=mix(bridge.x1+.14,bridge.x2-.14,i/16);
      const y=deck(x), zz=z+sign*hw;
      g.box(x,y+.46,zz,.14,1.09,.15,m.oak,[.66,.54,.39]);
      g.box(x,y+.999,zz,.192,.046,.192,m.bronze,[.51,.46,.34]);
      if(i%4===1) {
        g.box(x,(y-1.62)/2,z+sign*(hw-.21),.36,y+1.62,.38,m.oak,[.50,.43,.33]);
        g.box(x,-.34,z+sign*(hw-.21),.73,1.16,.69,m.mossWall,[.77,.81,.70]);
        g.box(x,y-.16,z,.46,.17,3.01,m.oak,[.52,.42,.32]);
      }
      if(last) {
        g.tube([last.x,last.y+.95,zz],[x,y+.95,zz],.083,.083,m.oak,[.69,.56,.40],6);
        g.tube([last.x,last.y+.44,zz],[x,y+.44,zz],.036,.036,m.galvanized,[.35,.39,.32],5);
        g.tube([last.x,last.y+.23,zz],[x,y+.23,zz],.028,.028,m.galvanized,[.32,.35,.29],5);
      }
      last={x,y};
    }
  }
  for(const x of [bridge.x1-.17,bridge.x2+.17]) g.box(x,deck(x)-.09,z,.42,.18,3.05,m.granite,[.83,.81,.69],0,.5,2);
}

function bench(g,x,z,yaw) {
  const y=height(x,z);
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const local=(a,b,c)=>[x+a*cs+c*sn,y+b,z-a*sn+c*cs];
  for(let i=0;i<5;i++) g.box(...local(0,.48,(i-2)*.108),2.13,.067,.094,m.oak,[.77,.6,.43],yaw,2.7,.33);
  for(let i=0;i<3;i++) g.box(...local(0,.68+i*.119,.24+i*.037),2.13,.087,.057,m.oak,[.79,.63,.46],yaw,2.7,.3);
  for(const sign of [-1,1]) {
    const dx=sign*.78;
    g.tube(local(dx,0,-.21),local(dx,.47,-.065),.053,.044,m.bronze,[.26,.31,.25],6);
    g.tube(local(dx,0,.25),local(dx,1,.30),.049,.049,m.bronze,[.26,.30,.24],6);
    g.tube(local(dx,.63,-.27),local(dx,.69,.27),.035,.029,m.bronze,[.30,.35,.28],6);
  }
}

function lamp(g,x,z) {
  const y=height(x,z);
  g.tube([x,y,z],[x,y+.45,z],.28,.21,m.granite,[.79,.81,.72],9);
  g.tube([x,y+.36,z],[x,y+9.45,z],.103,.066,material.castIron,[.36,.44,.39],8);
  g.tube([x,y+9.34,z],[x,y+9.71,z],.11,.23,m.bronze,[.54,.58,.43],8);
  g.tube([x,y+9.67,z],[x,y+10.07,z],.180,.225,-4,[.97,.87,.53],8);
  g.tube([x,y+10.03,z],[x,y+10.29,z],.296,.081,m.copper,[.63,.66,.51],8);
  g.tube([x,y+10.23,z],[x,y+10.45,z],.066,.021,m.bronze,[.56,.49,.32],6);
}

function arch(g,cx,ground,cz,r,post,thick,depth,set) {
  if(set) {
    for (const side of [-1,1]) {
      g.box(cx+side*(r+thick*.48),ground+post/2,cz,thick,post,depth,m.ashlar,[.86,.85,.76],0,.58,2.2);
      g.box(cx+side*(r+thick*.48),ground+.19,cz,thick+.27,.42,depth+.28,m.granite,[.86,.84,.74]);
      g.box(cx+side*(r+thick*.48),ground+post-.10,cz,thick+.17,.24,depth+.23,m.capital,[.88,.84,.73],0,1,.7);
    }
  }
  const count=17, spring=ground+post;
  const v=(a,radius,z)=>[cx+Math.cos(a)*radius,spring+Math.sin(a)*radius,z];
  for(let i=0;i<count;i++) {
    const a=i*Math.PI/count+.009,b=(i+1)*Math.PI/count-.009;
    const tx=i%5===3?m.mossWall:m.limestone;
    const k=rnd(.67,1);
    for(const sign of [-1,1]) {
      const z=cz+depth/2*sign;
      g.quad(v(a,r,z),v(a,r+thick,z),v(b,r+thick,z),v(b,r,z),tx,[k,k*.97,k*.88]);
    }
    g.quad(v(a,r,cz-depth/2),v(b,r,cz-depth/2),v(b,r,cz+depth/2),v(a,r,cz+depth/2),m.arch,[.81,.77,.65]);
    g.quad(v(a,r+thick,cz+depth/2),v(b,r+thick,cz+depth/2),v(b,r+thick,cz-depth/2),v(a,r+thick,cz-depth/2),m.stain,[.87,.85,.75]);
  }
}

function ruins(g,leaf) {
  const z=-26.7,cx=-35,ground=height(cx,z)-.43;
  for(let i=0;i<3;i++) arch(g,cx+(i-1)*5.1,ground,z,2.02,2.88,.58,.93,true);
  for(const side of [-1,1]) {
    for(let i=0;i<7;i++) {
      const x=cx+side*(7.9+i*.60), h=mix(4.7,1.0,i/7)+rnd(-.6,.8);
      for(let k=0;k<h;k+=.43) {
        const v=rnd(.72,1.04);
        g.box(x+rnd(-.025,.025),ground+k+.22,z+rnd(-.04,.04),.61,.41,1.01,pick([m.rubble,m.ashlar,m.mossWall,m.runoff]),[v,v,v*.87],rnd(-.045,.045));
      }
    }
  }
  for(const x of [cx-7.65,cx-2.55,cx+2.55,cx+7.65]) {
    g.tube([x,ground,-25.94],[x,ground+4.43,-25.94],.20,.16,m.column,[.84,.79,.67],10);
    g.box(x,ground+.19,-25.94,.58,.39,.58,m.granite,[.84,.81,.70]);
    g.box(x,ground+4.45,-25.94,.54,.38,.49,m.foliate,[.85,.79,.71]);
    for(let k=0;k<30;k++) {
      const y=ground+rnd(.05,3.75), xx=x+rnd(-.42,.41)+Math.sin(y*2)*.29;
      leaf.leaf([xx,y,-26.09+rnd(.32,.54)],rnd(.14,.34),rnd(.08,.16),rnd(0,TAU),rnd(-1.5,1.5),m.leaf,[.60,.75,.43],rnd(0,.46));
    }
  }
  for(let i=0;i<23;i++) {
    const x=cx+rnd(-9,9),zz=z+rnd(-3.4,4), y=height(x,zz);
    g.box(x,y+.038,zz,rnd(.37,.88),rnd(.08,.15),rnd(.31,.68),pick([m.limestone,m.granite,m.mossWall]),[.80,.78,.7],rnd(0,TAU));
  }
  const wallX=-42.6, wallZ=-19.95;
  g.box(wallX,ground+1.15,wallZ,.68,2.8,5,m.rubble,[.78,.76,.64],0,2.8,2.2);
  g.quad([wallX+.345,ground+.62,wallZ-1.7],[wallX+.345,ground+.62,wallZ+1.7],[wallX+.345,ground+2.45,wallZ+1.7],[wallX+.345,ground+2.45,wallZ-1.7],m.fresco,[.84,.83,.77]);
}

function pavilion(g) {
  const x=40.6,z=-3.6,y=height(x,z)+.12;
  g.box(x,y-.05,z,7.8,.35,6.45,m.granite,[.84,.85,.74],0,4,3.6);
  g.box(x,y+.143,z,7.62,.10,6.25,m.paving,[.88,.87,.78],0,5,4);
  for(let i=0;i<3;i++) g.box(x-4.08-i*.29,y+.073-i*.10,z,.34,.2,3.2,m.granite,[.86,.84,.75],0,2,1);
  for(const a of [-1,1]) for(const b of [-1,1]) {
    const px=x+a*3.25,pz=z+b*2.53;
    g.box(px,y+.26,pz,.61,.21,.61,m.granite,[.85,.83,.75]);
    g.tube([px,y+.31,pz],[px,y+3.22,pz],.22,.173,m.column,[.87,.82,.71],12,1.95);
    g.box(px,y+3.23,pz,.57,.31,.57,m.capital,[.86,.83,.75]);
  }
  for(const b of [-1,1]) {
    g.box(x,y+3.44,z+b*2.59,7.72,.23,.28,m.bronze,[.56,.55,.41]);
    for(const a of [-1,1]) g.box(x+a*3.40,y+3.44,z, .23,.23,5.22,m.oak,[.64,.50,.34]);
  }
  const top=y+5.24,low=y+3.56;
  for(const b of [-1,1]) {
    const e1=[x-4.10,low,z+b*3.49],e2=[x+4.1,low,z+b*3.49],t1=[x-1.95,top,z],t2=[x+1.95,top,z];
    g.quad(e1,e2,t2,t1,m.copper,[.76,.91,.80],[[0,0],[4,0],[3,1.8],[1,1.8]]);
    g.tube(e1,e2,.066,.065,m.bronze,[.50,.55,.40],6);
    for(let j=1;j<15;j++) {
      const k=j/15;
      const p=e1.map((v,d)=>mix(v,e2[d],k)),q=t1.map((v,d)=>mix(v,t2[d],k)); 
      g.tube(p,q,.026,.028,m.copper,[.65,.75,.59],4);
    }
  }
  for(const a of [-1,1]) g.tri([x+a*4.10,low,z-3.49],[x+a*4.10,low,z+3.49],[x+a*1.95,top,z],m.copper,[.67,.86,.70],[[0,0],[3,0],[1.5,1.7]]);
  g.tube([x-2.13,top+.035,z],[x+2.13,top+.035,z],.12,.12,m.copper,[.74,.79,.60],9);
  g.box(x+3.18,y+.68,z,.30,.90,4.58,m.grille,[.49,.53,.45],0,1,1.2);
  g.box(x+3.18,y+1.16,z,.34,.08,4.61,m.bronze,[.53,.54,.39]);
  g.box(x+6.3,y+.77,z-3.27,3.1,1.5,1.45,m.plaster,[.76,.78,.67]);
  g.box(x+6.3,y+1.58,z-3.27,3.27,.16,1.6,m.zinc,[.72,.78,.68]);
  g.box(x+6.3,y+1.01,z-2.53,2.62,.66,.063,m.glass,[.72,.80,.73]);
}

function entry(g) {
  const x=5,z=35.4;
  for(const a of [-1,1]) {
    const px=x+a*3.4,y=height(px,z);
    g.box(px,y+.73,z,.79,1.52,.78,m.ashlar,[.82,.82,.72],0,1,1.5);
    g.box(px,y+1.53,z,.99,.20,.94,m.granite,[.79,.80,.72]);
    g.box(px,y+1.66,z,.75,.09,.74,m.mossWall,[.78,.79,.67]);
    for(let k=0;k<6;k++) {
      const xx=px+a*(k*.77+.78),yy=height(xx,z);
      g.box(xx,yy+.30,z,.79,.69,.71,m.rubble,[.82,.78,.65],0,.7,.8);
      g.box(xx,yy+.67,z,.80,.12,.82,m.granite,[.81,.79,.69]);
    }
  }
  const yy=height(7.8,31.2);
  g.box(7.8,yy+.75,31.2,.12,1.50,.15,m.galvanized,[.32,.36,.34]);
  g.box(7.8,yy+1.35,31.2,1.13,.42,.08,m.bronze,[.54,.59,.39],.24);
  g.box(4.5,height(4.5,23.8)+.015,23.8,.58,.022,.58,m.manhole,[.79,.76,.65],.41);
}

function railway(g) {
  const x0=-51.5,z0=-.2;
  for(let i=0;i<25;i++) {
    const z=z0-1.18*i,x=x0-Math.sin(i*.12)*1.35;
    const y=height(x,z);
    g.box(x,y+.012,z,2.25,.075,1.21,i<15?m.rail:m.ties,[.62,.63,.54],.014,1,1);
    for(const s of [-1,1]) g.box(x+s*.65,y+.087,z,.058,.043,1.22,m.galvanized,[.52,.48,.39]);
    if(i%2===0) g.box(x+2.41,y+.14,z,.14,.52,.14,m.guard,[.53,.58,.53]);
  }
  const z=-28.9,x=-52,y=height(x,z)-.31;
  arch(g,x,y,z,1.76,1.46,.43,.61,true);
}

function plant(g,x,z,kind) {
  const y=height(x,z), r=rnd(.32,.80);
  if(kind==='fern') {
    for(let n=0;n<6;n++) {
      const a=n*TAU/6+rnd(-.35,.35), length=r*rnd(.70,1.2);
      for(let j=0;j<6;j++) {
        const t=(j+1)/7, [dx,dz]=polar(length*t,a);
        const base=[x+dx,y+length*(Math.sin(t*Math.PI*.91)*.38+t*.13),z+dz];
        const s=length*.43*Math.sin(t*Math.PI);
        for(const sign of [-1,1]) g.leaf(base,s,s*.23,a+sign*1.04,-.16,m.fern,[.81,.93,.62],rnd(0,.43));
      }
    }
    return;
  }
  for(let i=0;i<12;i++) {
    const a=rnd(0,TAU), l=r*rnd(.42,1.08), [dx,dz]=polar(rnd(0,r*.6),a), h=rnd(.05,.20);
    const tint=kind==='reed'?[.73,.82,.42]:[rnd(.66,.93),rnd(.78,1.02),rnd(.48,.73)];
    g.leaf([x+dx,y+h,z+dz],kind==='reed'?l*.63:l,l*.095,a,kind==='reed'?rnd(1.8,3.2):rnd(.16,.80),kind==='reed'?m.meadow:m.clover,tint,rnd(0,.47));
  }
}
function flowers(g,x,z,kind) {
  const y=height(x,z),h=rnd(.18,.48), angle=rnd(0,TAU);
  const color=kind===0?[1.02,.67,.09]:kind===1?[.77,.58,.86]:[1,.94,.72];
  const tip=[x+Math.cos(angle)*.09,y+h,z+Math.sin(angle)*.09];
  g.tube([x,y,z],tip,.010,.007,-4,[.28,.42,.12],3,.5);
  g.leaf([x,y+h*.46,z],h*.52,h*.115,angle+1,.3,m.leaf,[.70,.82,.47],.18);
  const size=rnd(.032,.072), petals=kind===1?5:7;
  for(let k=0;k<petals;k++) {
    const a=k*TAU/petals+angle;
    g.leaf(tip,size,size*.29,a,rnd(.08,.43),-4,color);
  }
  g.leaf([tip[0]-.011,tip[1]+.004,tip[2]],.028,.013,0,0,-4,[.95,.57,.13]);
}

function shoreline(g,l) {
  for(let i=0;i<206;i++) {
    const a=rnd(0,TAU),dx=pond.rx*Math.cos(a),dz=pond.rz*Math.sin(a);
    const x=pond.x+dx*rnd(.99,1.07),z=pond.z+dz*rnd(.97,1.09);
    if(Math.abs(z-bridge.z)<2.0) continue;
    const k=rand(), rr=k<.12?rnd(.55,1.01):rnd(.11,.56), y=height(x,z);
    const mat=pick([m.mossRock,m.mossRock,m.gneiss,m.wetRock,m.basalt,m.eroded,m.rust]);
    const value=rnd(.61,.96);
    g.orb(x,y+.065,z,rr*rnd(.78,1.4),rr*rnd(.37,.74),rr*rnd(.53,1.07),mat,[value,value,value*.93],3,5,.18);
    if(shore(x,z)>1.01 && rand()<.56) plant(l,x+rnd(-.3,.3),z+rnd(-.35,.35),'reed');
  }
  for(let i=0;i<86;i++) {
    const a=rnd(0,TAU), e=rnd(.73,.97), x=pond.x+pond.rx*Math.cos(a)*e,z=pond.z+pond.rz*Math.sin(a)*e;
    if(Math.abs(z-bridge.z)<2.35) continue;
    const rr=rnd(.08,.275), turns=11, rot=rnd(0,TAU), y=WET_LEVEL+rnd(.014,.025);
    const tint=[rnd(.54,.82),rnd(.70,.94),rnd(.35,.54)];
    for(let j=0;j<turns;j++) {
      const aa=rot+j*5.7/turns, bb=rot+(j+1)*5.7/turns;
      l.tri([x,y+.005,z],[x+Math.cos(aa)*rr,y,z+Math.sin(aa)*rr],[x+Math.cos(bb)*rr,y,z+Math.sin(bb)*rr],m.leaf,tint);
    }
  }
}

export function buildWorld({economy=false}={}) {
  compact=economy;rand=rng(586213);
  const solid=new Mesh(), leaf=new Mesh(), grass=new Mesh(), glass=new Mesh();
  bridgeModel(solid);ruins(solid,leaf);pavilion(solid);entry(solid);railway(solid);
  const benches=[[-8,13,3.14],[12,16,2.8],[-19,-9,-1.45],[29,-15,1.22],[30,19,.6],[-37,11,-.59],[-33,-22,3.09],[36,-1,1.64],[7,-38,.09],[-15,26,2.25]];
  for(const b of benches) bench(solid,...b);
  for(const [x,z] of [[8,24],[-4,17],[-22,12],[-28,1],[-29,-16],[-15,-34],[14,-36],[33,-22],[33,3],[22,14],[21,27],[-33,-20],[-42,9],[33,17],[-15,29]]) lamp(solid,x,z);
  const distinctLeaves=[material.greenMaple,material.oakLeaf,material.aspen,material.willow,material.camellia];
  const majorTrees=[
    [-5.4,22,11.1,1],[12.3,25.6,12.7,4],[18.2,13.2,10,31],[8.4,10,12,30],
    [-11,11.1,9.6,12],[-15.5,5.9,7.9,26],[25,-13,9.7,30],[15,-29,10.4,27],
    [-20.8,-7,10.3,2],[-14,-24,14.2,16],[-24.1,-17,7.8,13],[-31,-18,9.3,25],
    [-34,9,10.2,8],[-38,1.5,10.1,9],[-26,17.4,8,17],[34,9,7.5,5],
    [45,4.5,10.6,19],[34,-12,11.5,21],[5,-34.5,9.4,7],[-5,-29.3,8.9,22],
    [-37.2,20.98,4.3,15],[-31.5,5,9.2,10],[-50,-31,7.0,34],[27,14,3.8,35],
  ];
  const trees=[];
  function addTree(x,z,growth,profile,far){
    const seed=(Math.imul(Math.round(x*8192),325248257)+Math.imul(Math.round(z*8192),1597334677))>>>0;
    const leafMaterial=distinctLeaves[(profile+seed%5)%5];
    plantTree({solid,leaf,ground:height,x,z,growth,profileIndex:profile,seed,far,economy,leafMaterial});
    trees.push([x,z]);
  }
  for(const [x,z,growth,profile] of majorTrees)if(shore(x,z)>1.07&&!nearExplorationEarthworks(x,z,1.3,true))addTree(x,z,growth,profile,false);
  let profile=0;
  for(let i=0;i<490;i++) {
    const x=rnd(-62.5,62.5),z=rnd(-55.2,55.2),far=Math.abs(x)>43||z<-40||z>41;
    const forest=x<-27||z<-32||x>44||z>34;
    if(!forest && rand()<.85)continue;
    if(clearing(x,z)||nearExplorationEarthworks(x,z,1.2,true)||shore(x,z)<1.15||pathDistance(x,z)<.83||
       Math.hypot(x-5,z-25)<9.5||Math.hypot(x-28,z-21)<11||Math.hypot(x-40,z+3)<8||Math.hypot(x+35,z+25)<8.3)continue;
    if(trees.some(([tx,tz])=>(tx-x)**2+(tz-z)**2<11.6)||rand()<(far?.28:.18))continue;
    addTree(x,z,rnd(4.25,13.15),profile++%trunkProfiles.length,far);
  }
  shoreline(solid,leaf);
  const patches=[[-8,19],[-11,10],[-19,6],[-25,18],[-36,12],[-37,1],[-33,-22],[11,12],[21,12],[32,10],[39,6],[22,-28],[25,-17],[-10,-32],[-28,-15],[12,27],[-1,28]];
  for(const [x,z] of patches) {
    for(let i=0;i<12;i++) {
      const xx=x+rnd(-3.2,3.2),zz=z+rnd(-3.1,3.1);
      if(clearing(xx,zz)||nearExplorationEarthworks(xx,zz)||pathDistance(xx,zz)<.04||shore(xx,zz)<1.015) continue;
      plant(leaf,xx,zz,pick(['fern','fern','sedge']));
    }
  }
  for(let i=0;i<550;i++) {
    const t=rnd(0,TAU), r=Math.sqrt(rand()), [dx,dz]=polar(r,t);
    const x=32+dx*13,z=19+dz*10;
    if(clearing(x,z)||nearExplorationEarthworks(x,z)||pathDistance(x,z)<.07||shore(x,z)<1.03) continue;
    flowers(grass,x,z,Math.sin(x*.6+z*.17)+Math.cos(z*.76)>.39?0:Math.cos(x*.81-z*.16)>.21?1:2);
  }
  for(let i=0;i<(compact?4100:10800);i++) {
    const x=rnd(-58,56),z=rnd(-53,46);
    const sd=shore(x,z), pd=pathDistance(x,z);
    if(clearing(x,z)||nearExplorationEarthworks(x,z)||sd<1.02||pd<.10||((sd>1.23&&pd>1.4)&&rand()<.6)) continue;
    const y=height(x,z)-.018, tint=rnd(.55,1.03), a=rnd(0,TAU), h=rnd(.074,.239),w=rnd(.010,.032);
    for(let j=0;j<3;j++) {
      const b=a+j*2.11, px=x+Math.cos(b)*rnd(.022,.090),pz=z+Math.sin(b)*rnd(.022,.090),v=rnd(.71,1.19);
      grass.tri([px-Math.sin(b)*w,y,pz+Math.cos(b)*w],[px+Math.sin(b)*w,y,pz-Math.cos(b)*w],[px+Math.cos(b)*h*.58,y+h*v,pz+Math.sin(b)*h*.58],-4,[tint*.37,tint*.49,tint*.16],[[0,0],[1,0],[.55,1]],[[0,1,0],[0,1,0],[0,1,0]]);
    }
  }
  for(let i=0;i<122;i++) {
    const x=rnd(-49,48),z=rnd(-39,39);
    if(clearing(x,z)||nearExplorationEarthworks(x,z,.8)||shore(x,z)<1.1||pathDistance(x,z)<.35) continue;
    const r=rnd(.10,.52),s=rnd(.62,.96),y=height(x,z);
    solid.orb(x,y-.005,z,r,r*.49,r*.67,pick([m.mossRock,m.moss,m.basalt,m.gravel,m.gneiss]),[s,s,s*.84],3,5,.19);
  }
  rand=rng(522708);
  buildExpansion({solid,leaf,glass,height,rnd,bench});
  buildExploration(solid,height);
  const terrain=buildGround();
  cliffWall(solid,height);
  const water=new Mesh();
  water.quad([-29,WET_LEVEL,-38],[-29,WET_LEVEL,11],[36,WET_LEVEL,11],[36,WET_LEVEL,-38]);
  return {solid:solid.packed(),leaf:leaf.packed(),grass:grass.packed(),glass:glass.packed(),terrain:terrain.packed(),water:water.packed()};
}

import {EXPLORATION_FIRST} from './materials.js';

const tiles = sheet => Array.from({length:9},(_,i)=>EXPLORATION_FIRST+sheet*9+i);
const [limestone,calcite,timbers,mineGear,quarryRock,quarryGear,bunkerWalls,bunkerGear,
  tankStone,tankGear,shrineTiles,caveNew,mineNew,ruinNew] = Array.from({length:14},(_,i)=>tiles(i));

export const explorationSites = [
  {id:'cave',name:'石灰岩の鍾乳洞',x:-46,z:5,dx:-1,dz:0,width:1.75,run:8,depth:6.25,
    approach:[[-43,5]], rooms:[[0,1.75,2.8],[2,2.35,3.4],[4.5,3.40,4.15,.48],[7.4,3.68,4.4,.62],[9.6,2.45,3.25,1.1]]},
  {id:'mine',name:'鉱山鉄道の廃坑',x:-52,z:-29,dx:0,dz:-1,width:1.70,run:10.5,depth:6.2,
    approach:[[-38.5,-15.1],[-43.6,-15.7],[-47.5,-20.9],[-49,-26],[-52,-28.7]],
    rooms:[[0,1.70,2.85],[3.0,1.85,3.0],[6.2,2.50,3.55],[9.4,3.4,3.55,-.45],[13.0,3.15,3.25,-.45],[14.5,2.0,2.85]]},
  {id:'quarry',name:'谷の廃採石場',x:53.5,z:-37,dx:1,dz:0,width:3.75,run:10.4,depth:1.7,treeBuffer:5.4,
    approach:[[52,-36.8]]},
  {id:'bunker',name:'旧山腹避難壕',x:17,z:-35.7,dx:0,dz:-1,width:1.48,run:10,depth:5.2,
    approach:[[17,-33.8]],rooms:[[0,1.48,2.55],[2.4,1.48,2.55],[4.4,2.85,2.85],[7.0,2.85,2.85],[9.5,2.85,2.85]]},
  {id:'tank',name:'旧地下貯水槽',x:9,z:41.5,dx:1,dz:0,width:1.65,run:10.5,depth:6.0,
    approach:[[5.5,41],[7,41.5]],rooms:[[0,1.65,2.65],[1.7,1.65,2.65],[3.8,3.25,3.5],[7.0,3.9,3.6],[10.2,3.9,3.6],[12.7,3.2,3.3]]},
  {id:'shrine',name:'森の神社跡',x:-16,z:33,dx:0,dz:1,width:3.7,run:9.5,
    approach:[[-14.5,29.8],[-16,31.5]]},
];

export const explorationPaths = explorationSites.map(({x,z,dx,dz,approach})=>
  ({w:1.04,points:[...approach,[x-.6*dx,z-.6*dz],[x,z]]}));

function position(site,t,s,y){
  return [site.x+site.dx*s-site.dz*t,y,site.z+site.dz*s+site.dx*t];
}

export const explorationCuts = explorationSites.filter(site=>site.depth).map(site=>{
  const a=position(site,-site.width,0,0),b=position(site,site.width,site.run,0);
  return {x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),z0:Math.min(a[2],b[2]),z1:Math.max(a[2],b[2])};
});

function local(site,x,z){
  const dx=x-site.x,dz=z-site.z;
  return [dx*site.dx+dz*site.dz,dz*site.dx-dx*site.dz];
}

export function nearExplorationEarthworks(x,z,r=.25,trees=false){
  return explorationSites.some(site=>{
    const [s,t]=local(site,x,z);
    const margin=trees?(site.treeBuffer??r):r;
    return s>-margin-.4&&s<site.run+margin+.4&&Math.abs(t)<site.width+margin+.35;
  });
}

export function explorationName(x,y,z){
  const site=explorationSites.find(site=>{
    const [s,t]=local(site,x,z);
    if(s< -1.8)return false;
    if(s<=site.run)return Math.abs(t)<site.width+.5;
    // The gallery lies underneath the surface trail.
    return y<-.8&&site.rooms&&s<=site.run+site.rooms.at(-1)[0]&&Math.abs(t)<4.6;
  });
  return site?.name;
}

const stone=[.86,.86,.81],warm=[1.10,.98,.83],cool=[.86,1.02,1.12];

const cave = {
  entrance:[limestone[6],limestone[5],calcite[7]],
  retaining:[limestone[0],limestone[2],calcite[4]],
  face:limestone[4], bevel:.64, color:warm,
  gallery:[
    [limestone[8],limestone[1],limestone[2],limestone[4],limestone[3]],
    [caveNew[3],caveNew[0],caveNew[2],calcite[1],calcite[3]],
    [caveNew[8],calcite[4],caveNew[6],calcite[5],calcite[0]],
    [limestone[6],caveNew[7],calcite[8],caveNew[1],limestone[7]],
    [limestone[5],limestone[4],calcite[2],calcite[6],caveNew[5]],
  ],
};

const mine = {
  entrance:[timbers[5],timbers[4],mineNew[8]],retaining:[timbers[0],timbers[1],mineNew[0]],
  face:timbers[2],bevel:.83,color:warm,
  gallery:[
    [timbers[5],timbers[1],timbers[0],timbers[2],timbers[7]],
    [timbers[4],mineNew[0],timbers[8],mineNew[2],timbers[0]],
    [mineNew[8],mineNew[1],timbers[8],timbers[0],mineNew[2]],
    [mineGear[3],mineNew[2],timbers[1],timbers[7],timbers[2]],
    [timbers[6],timbers[3],mineNew[3],timbers[7],mineNew[6]],
    [mineGear[3],timbers[0],mineNew[0],timbers[3],timbers[8]],
  ],
};

const bunker = {
  entrance:[bunkerWalls[6],bunkerWalls[3],bunkerWalls[8]],
  retaining:[bunkerWalls[0],bunkerWalls[3],ruinNew[0]],face:bunkerWalls[0],bevel:.96,color:cool,
  gallery:[
    [bunkerWalls[3],bunkerWalls[0],bunkerWalls[1],bunkerWalls[4],bunkerWalls[6]],
    [bunkerWalls[6],bunkerWalls[5],bunkerWalls[7],bunkerWalls[0],bunkerWalls[4]],
    [bunkerWalls[8],bunkerWalls[2],ruinNew[1],bunkerWalls[1],bunkerWalls[7]],
    [ruinNew[2],bunkerWalls[5],ruinNew[5],bunkerWalls[4],bunkerWalls[8]],
    [bunkerWalls[3],bunkerWalls[0],bunkerWalls[1],bunkerWalls[7],bunkerWalls[3]],
  ],
};

const tank = {
  entrance:[tankStone[7],tankStone[0],tankGear[8]],retaining:[tankStone[0],tankStone[3],tankStone[4]],
  face:tankStone[0],bevel:.75,color:cool,
  gallery:[
    [tankGear[8],tankStone[0],tankStone[3],tankStone[2],tankStone[4]],
    [tankStone[5],tankStone[1],tankStone[4],tankStone[5],tankStone[2]],
    [tankStone[6],tankStone[1],tankStone[1],tankStone[5],tankStone[4]],
    [tankStone[6],tankStone[8],tankStone[1],tankStone[2],tankStone[3]],
    [tankGear[4],tankStone[1],tankGear[3],tankStone[5],tankStone[3]],
    [tankStone[7],tankStone[0],tankStone[4],tankStone[8],tankStone[2]],
  ],
};

function siteBuilder(mesh,site,height){
  const p=(t,s,y)=>position(site,t,s,y);
  const ground=(t,s)=>{
    const [x,,z]=p(t,s,0);
    return height(x,z);
  };
  const yaw=Math.atan2(site.dx,site.dz);
  const box=(t,s,y,w,h,d,mat,tint=stone)=>{
    mesh.box(...p(t,s,y),w,h,d,mat,tint,yaw);
  };
  const tube=(a,b,r1,r2,mat,tint=stone,n=6)=>
    mesh.tube(p(...a),p(...b),r1,r2,mat,tint,n);
  const quad=(a,b,c,d,mat,tint=stone,u=1,v=1)=>
    mesh.quad(p(...a),p(...b),p(...c),p(...d),mat,tint,[[0,0],[u,0],[u,v],[0,v]]);
  return {p,ground,mesh,box,tube,quad};
}

function rampLevel(b,site,t,s,floor){
  const landing=site.id==='mine'?.62:0;
  const top=b.ground(t,0)+(landing?.065:0);
  const tDown=Math.max(0,s-landing)/(site.run-landing);
  return top+(floor-top)*tDown;
}

function descent(b,site,palette,floor){
  const {quad,ground}=b,{width:w,run}=site;
  const steps=Math.ceil(run/.64);
  function endpoint(t,s){
    return [t,s,rampLevel(b,site,t,s,floor)];
  }
  for(let i=0;i<steps;i++){
    const a=i*run/steps,d=(i+1)*run/steps;
    const floorMat=palette.entrance[Math.min(2,Math.floor(i*3/steps))];
    quad(endpoint(-w,a),endpoint(w,a),endpoint(w,d),endpoint(-w,d),floorMat,stone,2,.36);
    for(const t of [-w,w]){
      const mat=palette.retaining[(Math.floor(i/6)+Number(t>0))%palette.retaining.length];
      quad(endpoint(t,a),endpoint(t,d),[t,d,ground(t,d)+.07],[t,a,ground(t,a)+.07],mat,stone,.45,2);
    }
  }
}

function finishMouth(b,site,palette,floor){
  const {quad,box,ground,tube}=b,{width:w,run}=site;
  const h=site.rooms[0][2], shoulder=h*.73, bevel=w*palette.bevel;
  quad([-w,run,floor+shoulder],[-bevel,run,floor+h],
    [-bevel,run,ground(-bevel,run)+.08],[-w,run,ground(-w,run)+.08],palette.face);
  quad([-bevel,run,floor+h],[bevel,run,floor+h],
    [bevel,run,ground(bevel,run)+.08],[-bevel,run,ground(-bevel,run)+.08],palette.face,stone,2,1);
  quad([bevel,run,floor+h],[w,run,floor+shoulder],
    [w,run,ground(w,run)+.08],[bevel,run,ground(bevel,run)+.08],palette.face);
  if(site.id==='cave'){
    for(const side of [-1,1]){
      const t=side*(w+.12);
      tube([t,run+.04,floor],[t,run-.2,floor+h-.5],.34,.24,limestone[4],stone,5);
    }
  }else{
    for(const side of [-1,1])box(side*(w+.025),run,floor+h*.46,.22,h*.92,.34,palette.face);
    box(0,run,floor+h-.02,w*palette.bevel*2,.23,.34,palette.face);
  }
}

function gallery(b,site,palette,floor){
  const {quad}=b;
  const profile=([d,w,h,t=0])=>{
    const s=site.run+d,m=w*palette.bevel,sides=h*.73;
    return [[t-w,s,floor],[t+w,s,floor],[t+w,s,floor+sides],
      [t+m,s,floor+h],[t-m,s,floor+h],[t-w,s,floor+sides]];
  };
  const profiles=site.rooms.map(profile);
  for(let i=0;i<profiles.length-1;i++){
    const a=profiles[i],c=profiles[i+1],[base,left,right,ceiling,shoulder]=palette.gallery[i];
    const shade=i%3===1?.82:1.06,tint=palette.color.map(value=>value*shade);
    [base,right,shoulder,ceiling,shoulder,left].forEach((mat,j)=>{
      const k=(j+1)%a.length;
      quad(a[j],a[k],c[k],c[j],mat,tint,j===0||j===3?2.5:1.2,1.65);
    });
  }
  const [a,c,d,e,f,g]=profiles.at(-1);
  const [base,left,right,roof]=palette.gallery.at(-1);
  const mid=[(a[0]+c[0])*.5,a[1],floor];
  const top=[(f[0]+e[0])*.5,a[1],f[2]];
  quad(a,mid,top,g,base,palette.color);
  quad(mid,c,d,top,right,palette.color);
  b.mesh.tri(b.p(...g),b.p(...top),b.p(...f),left,palette.color);
  b.mesh.tri(b.p(...top),b.p(...d),b.p(...e),roof,palette.color);
}

function lamp(b,t,s,y){
  b.box(t,s,y,.27,.13,.36,3,[.70,.60,.43]);
  b.box(t,s,y-.078,.20,.031,.28,-4,[1.15,.92,.62]);
}

function caveFeatures(b,run,y){
  const {tube,box,quad}=b;
  for(const [t,s,h,r,mat] of [
    [-.8,1.6,1.12,.20,limestone[3]], [.9,2.9,1.30,.25,calcite[3]],
    [-1.44,4.6,1.47,.29,caveNew[4]], [1.2,5.8,1.02,.16,calcite[0]],
    [-1.7,6.7,1.17,.23,calcite[6]], [2.35,7.4,1.28,.28,caveNew[1]],
  ]){
    tube([t,run+s,y+3.42],[t+.07,run+s+.10,y+3.42-h],r,.025,mat,warm,7);
  }
  for(const [t,s,mat] of [[-1.5,3.7,caveNew[1]],[2.14,5.7,limestone[7]],[2.23,7.7,calcite[8]]]){
    tube([t,run+s,y],[t-.08,run+s+.14,y+.88],.34,.045,mat,stone,7);
  }
  quad([-1.49,run+3.3,y+.017],[-.53,run+3.3,y+.017],[-.65,run+7.3,y+.017],[-1.6,run+7.3,y+.017],caveNew[8],cool,1,3);
  box(1.55,run+7.6,y+.043,1.16,.086,.95,caveNew[5],cool);
}

function mineFeatures(b,run,y,site){
  const {box,quad}=b;
  const railEnd=run+13.2;
  const trackLevel=s=>s<run?rampLevel(b,site,0,s,y):y;
  function strip(t,w,s,end,offset,mat,v){
    const p=(x,z)=>[x,z,trackLevel(z)+offset];
    quad(p(t-w,s),p(t+w,s),p(t+w,end),p(t-w,end),mat,stone,1,v);
  }
  for(let s=.24;s<railEnd;s+=.65)strip(0,.79,s,s+.16,.016,timbers[5],.30);
  for(const t of [-.60,.60]){
    for(let s=.17;s<railEnd;s+=.65)strip(t,.024,s,s+.65,.027,mineNew[7],.9);
  }
  for(const [s,w,mat] of [[1.2,1.57,timbers[2]],[3.7,1.83,timbers[3]],[7.7,2.05,mineNew[3]],[10.5,2.05,mineNew[6]]]){
    for(const t of [-w,w])box(t,run+s,y+1.30,.25,2.6,.32,mat,warm);
    box(0,run+s,y+2.65,w*2+.26,.29,.30,mat,warm);
    lamp(b,0,run+s,y+2.49);
  }
  box(-1.72,run+5.25,y+.32,.66,.64,.77,mineGear[5]);
  box(-1.75,run+5.25,y+.71,.57,.14,.48,mineGear[7]);
  box(1.76,run+6.4,y+.45,.52,.9,.57,mineGear[4]);
  box(1.76,run+6.4,y+.91,.46,.04,.48,mineGear[0]);
  box(1.73,run+8.2,y+.6,.72,1.20,.64,mineGear[2]);
  box(1.73,run+7.86,y+.60,.51,.59,.055,mineGear[1]);
  box(-1.93,run+8.6,y+.11,.65,.22,.64,mineGear[6]);
  box(-1.86,run+9.9,y+.60,.67,1.20,.59,mineGear[8]);
  box(-1.86,run+9.57,y+.91,.53,.46,.057,mineNew[5]);
  box(1.78,run+10.9,y+.44,.65,.88,.59,mineNew[4]);
}

function bunkerFeatures(b,run,y){
  const {box,tube}=b;
  for(const [i,mat] of bunkerGear.entries()){
    const t=i<5?-1.77:1.81,s=run+4.6+(i%5)*.89;
    const high=[1.40,1.25,.74,.48,.81,.72,.72,.31,.53][i];
    box(t,s,y+high*.5+.23,.25,high,.77,mat,cool);
  }
  for(const s of [1.6,4.9,7.55])lamp(b,0,run+s,y+2.48);
  tube([-1.05,run+.10,y+2.16],[-1.05,run+9.42,y+2.16],.055,.055,bunkerGear[5],stone);
}

function tankFeatures(b,run,y){
  const {box,tube,quad}=b;
  for(const s of [4.8,7.1,9.4]){
    for(const t of [-2.45,2.45]){
      tube([t,run+s,y],[t,run+s,y+3.35],.25,.25,tankStone[2],cool,7);
      box(t,run+s,y+.13,.69,.26,.69,tankStone[4]);
    }
    lamp(b,0,run+s,y+3.33);
  }
  // A low catwalk stays walkable among the flooded stone slabs.
  quad([-.63,run+3.2,y+.06],[.63,run+3.2,y+.06],[.63,run+11.5,y+.06],
    [-.63,run+11.5,y+.06],tankStone[5],cool,1,4);
  tube([2.73,run+4.4,y+.53],[2.73,run+11.6,y+.53],.16,.16,tankGear[0],stone);
  for(const [i,mat] of [tankGear[0],tankGear[1],tankGear[2],tankGear[3],tankGear[5],tankGear[6],
    tankGear[7],ruinNew[4],ruinNew[6]].entries()){
    const t=i<4?-1.83:1.76,s=run+4.5+(i<4?i:i-4)*1.26;
    const h=[.69,.54,.51,.88,.58,.26,.57,.16,.84][i];
    box(t,s,y+.08+h*.5,.59,h,.63,mat,cool);
  }
}

function underground(mesh,site,height,palette,features){
  const b=siteBuilder(mesh,site,height),floor=b.ground(0,0)-site.depth;
  descent(b,site,palette,floor);
  finishMouth(b,site,palette,floor);
  gallery(b,site,palette,floor);
  features(b,site.run,floor,site);
}

function quarry(mesh,site,height){
  const b=siteBuilder(mesh,site,height);
  const {quad,ground,box,tube}=b,{width:w,run}=site;
  const floor=ground(0,0)-site.depth;
  const surfaces=[quarryRock[8],quarryRock[7],quarryRock[4],quarryRock[5],ruinNew[7]];
  for(let i=0;i<10;i++){
    const s=i*run/10,d=(i+1)*run/10;
    const lower=(t,u)=>floor+(ground(t,0)-floor)*Math.max(0,1-u/4.3);
    const a=[-w,s,lower(-w,s)],c=[w,s,lower(w,s)],e=[w,d,lower(w,d)],f=[-w,d,lower(-w,d)];
    quad(a,c,e,f,surfaces[Math.floor(i/2)],stone,3,.75);
    for(const side of [-1,1]){
      const t=side*w,middle=(u)=>Math.max(lower(t,u),ground(t,u)-.82);
      const low=i<4?quarryRock[1]:quarryRock[3];
      const upper=[quarryRock[0],quarryRock[2],quarryRock[6]][(Math.floor(i/3)+Number(side>0))%3];
      quad([t,s,lower(t,s)],[t,d,lower(t,d)],[t,d,middle(d)],[t,s,middle(s)],low,stone);
      quad([t,s,middle(s)],[t,d,middle(d)],[t,d,ground(t,d)+.08],[t,s,ground(t,s)+.08],upper,stone);
    }
  }
  quad([-w,run,floor],[w,run,floor],[w,run,ground(w,run)+.095],
    [-w,run,ground(-w,run)+.095],quarryRock[2],stone,4,1);
  for(const [i,mat] of [...quarryGear,ruinNew[3]].entries()){
    const side=i<5?-1:1,t=side*(i===3||i===6?2.89:2.53);
    const s=4.65+(i%5)*1.09,h=[1.35,1.15,1.08,1.03,.68,.63,.91,.16,.65,.38][i];
    box(t,s,floor+h*.5,.63,h,.96,mat,stone);
  }
  // Small corrugated roof over the sorting bench.
  quad([-3.63,6.4,floor+2.05],[-1.93,6.4,floor+1.88],
    [-1.93,9.9,floor+1.88],[-3.63,9.9,floor+2.05],quarryGear[0],stone,1,2);
  for(const s of [6.4,9.9])tube([-2,s,floor],[-2,s,floor+1.9],.065,.065,quarryGear[2],stone,5);
}

function shrine(mesh,site,height){
  const {quad,ground,box,tube}=siteBuilder(mesh,site,height);
  for(let i=0;i<12;i++){
    const s=i*.80,d=s+.8,w=1.22;
    const p=(t,u)=>[t,u,ground(t,u)+.058];
    quad(p(-w,s),p(w,s),p(w,d),p(-w,d),i%4===0?shrineTiles[7]:shrineTiles[0],stone,2,.7);
  }
  const entrance=ground(0,2.05);
  for(const t of [-1.23,1.23]){
    const y=ground(t,2.05);
    tube([t,2.05,y],[t*.94,2.05,entrance+2.79],.145,.124,shrineTiles[2],warm,8);
    box(t,2.05,y+.111,.41,.22,.41,shrineTiles[0]);
  }
  box(0,2.05,entrance+2.76,3.65,.23,.37,shrineTiles[2],warm);
  box(0,2.05,entrance+2.93,3.84,.12,.48,shrineTiles[1]);
  box(0,2.05,entrance+2.17,2.9,.14,.22,shrineTiles[2],warm);
  tube([-1.02,2.23,entrance+2], [1.02,2.23,entrance+2],.047,.047,shrineTiles[5],warm,6);

  const y=ground(0,8.3)+.16;
  box(0,8.3,y-.11,4.38,.20,2.56,shrineTiles[6]);
  box(0,8.3,y+.005,4.22,.065,2.41,ruinNew[8]);
  box(0,8.63,y+.94,3.02,1.77,1.52,shrineTiles[3]);
  box(0,7.845,y+.94,.79,1.36,.045,shrineTiles[8],cool);
  for(const t of [-1.57,1.57]){
    box(t,7.84,y+.92,.24,1.80,.25,shrineTiles[2],warm);
    const base=ground(t*1.46,6.12);
    tube([t*1.46,6.12,base],[t*1.46,6.12,base+.68],.21,.14,shrineTiles[4],stone);
    box(t*1.46,6.12,base+.78,.44,.22,.43,shrineTiles[4]);
    box(t*1.46,6.12,base+.96,.56,.16,.58,shrineTiles[1]);
  }
  const peak=y+2.66,eave=y+1.86;
  for(const s of [7.42,9.72]){
    quad([-1.96,s,eave],[1.96,s,eave],[1.66,8.6,peak],[-1.66,8.6,peak],shrineTiles[1],stone,3,1.5);
  }
  box(0,8.6,peak,3.62,.12,.23,shrineTiles[8]);
}

export function buildExploration(mesh,height){
  const [c,m,q,b,t,s]=explorationSites;
  underground(mesh,c,height,cave,caveFeatures);
  underground(mesh,m,height,mine,mineFeatures);
  quarry(mesh,q,height);
  underground(mesh,b,height,bunker,bunkerFeatures);
  underground(mesh,t,height,tank,tankFeatures);
  shrine(mesh,s,height);
}

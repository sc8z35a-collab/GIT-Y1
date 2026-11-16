import {CANOPY_FIRST, material as t} from './materials.js';

const tau=Math.PI*2;
const plus=(a,b)=>a.map((v,i)=>v+b[i]);
const minus=(a,b)=>a.map((v,i)=>v-b[i]);
const times=(a,b)=>a.map(v=>v*b);
const copy=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(a,b)=>Math.hypot(...minus(a,b));
const dir=(angle,length,y)=>[Math.cos(angle)*length,y,Math.sin(angle)*length];

function seeded(seed) {
  return () => {
    seed=(seed+0x6d2b79f5)|0;
    let v=Math.imul(seed^(seed>>>15),seed|1);
    v=(v+Math.imul(v^(v>>>7),v|61))^v;
    return ((v^(v>>>14))>>>0)/4294967296;
  };
}

// Each curve is three successive differences in world direction. All are
// normalized to the same total growth length before calculating girth.
export const trunkProfiles=Object.freeze([
  {name:'直立樫',curve:[[.01,.32,.01],[.01,.38,-.01],[.03,.30,.01]],habit:'spreading'},
  {name:'弓形の幹',curve:[[.16,.32,-.03],[.29,.28,.07],[-.31,.20,.07]],habit:'spreading'},
  {name:'幹が水平に曲がる木',curve:[[-.13,.25,.07],[.37,.07,-.02],[.15,.29,.07]],habit:'spreading'},
  {name:'風で大きく傾いた木',curve:[[.19,.24,.14],[.27,.26,.07],[.23,.25,.10]],habit:'windswept'},
  {name:'二股の幹',curve:[[.00,.31,.03],[.13,.32,.09],[-.08,.36,.08]],feature:'fork',habit:'spreading'},
  {name:'地際で分かれた株',curve:[[.05,.37,.05],[-.045,.40,.04],[.03,.21,-.03]],feature:'lowFork',habit:'upright'},
  {name:'折れ曲がった鈎形の幹',curve:[[.12,.31,.07],[-.23,.21,.15],[-.07,.10,-.34]],habit:'windswept'},
  {name:'ねじれ幹',curve:[[.08,.28,.09],[.17,.31,-.18],[-.20,.35,.08]],feature:'spiral',habit:'upright'},
  {name:'落雷で裂けた幹',curve:[[.03,.39,.03],[-.08,.22,.09],[.22,.28,-.09]],feature:'lightning',habit:'open'},
  {name:'落雷で倒れた幹',curve:[[.04,.14,-.02],[.45,-.15,.14],[.42,.05,-.011]],feature:'fallen',habit:'dead'},
  {name:'焼けた立ち枯れ',curve:[[.06,.39,.06],[-.07,.29,-.03],[.08,.27,.03]],feature:'charred',habit:'dead'},
  {name:'焼け跡から芽吹く幹',curve:[[-.08,.31,.07],[-.06,.25,-.03],[.16,.30,-.13]],feature:'regrowth',habit:'open'},
  {name:'瘤が突き出た幹',curve:[[-.15,.33,.05],[.18,.29,-.06],[-.09,.35,.07]],feature:'burl',habit:'spreading'},
  {name:'サルノコシカケの生えた幹',curve:[[.075,.35,.02],[.085,.36,-.044],[-.07,.30,.075]],feature:'fungus',habit:'spreading'},
  {name:'苔に包まれた老木',curve:[[.05,.26,.07],[-.16,.42,.09],[.20,.30,.02]],feature:'moss',habit:'open'},
  {name:'細長い螺旋状の幹',curve:[[.11,.22,.12],[-.21,.34,.11],[.12,.37,-.16]],feature:'spiral',habit:'upright'},
  {name:'板根が広がる幹',curve:[[.04,.32,.015],[.02,.29,-.07],[-.04,.37,.09]],feature:'buttress',habit:'spreading'},
  {name:'浅根が露出した幹',curve:[[.13,.33,-.03],[-.08,.33,.12],[.02,.28,.06]],feature:'roots',habit:'open'},
  {name:'空洞のある幹',curve:[[.015,.36,.065],[-.12,.32,.10],[.06,.32,.02]],feature:'hollow',habit:'open'},
  {name:'切り株から横芽が伸びる木',curve:[[.12,.24,.025],[.24,.22,-.12],[.18,.22,-.08]],feature:'regrowth',habit:'upright'},
  {name:'Y字に高く分かれた幹',curve:[[.01,.29,-.01],[.035,.32,.07],[-.12,.38,-.12]],feature:'highFork',habit:'upright'},
  {name:'偏った三幹',curve:[[-.15,.26,-.09],[.02,.32,.08],[.02,.32,.19]],feature:'lowFork',habit:'spreading'},
  {name:'斜めに折り返すS字の幹',curve:[[-.22,.34,.01],[.35,.29,.03],[-.22,.28,-.03]],habit:'spreading'},
  {name:'土を這ってから立つ幹',curve:[[.34,.04,.11],[.18,.29,.03],[.11,.43,-.04]],feature:'roots',habit:'windswept'},
  {name:'頂部が折れた幹',curve:[[.03,.38,-.01],[.045,.32,-.03],[-.16,.22,.11]],feature:'broken',habit:'open'},
  {name:'蔦が絡む幹',curve:[[.04,.32,.10],[.11,.35,.11],[-.15,.31,.09]],feature:'ivy',habit:'spreading'},
  {name:'赤い蔦に覆われた幹',curve:[[-.09,.35,-.06],[.03,.29,-.08],[.19,.31,.08]],feature:'creeper',habit:'open'},
  {name:'絡み合う二本の幹',curve:[[.08,.29,.11],[.13,.35,-.16],[-.09,.38,.06]],feature:'twins',habit:'upright'},
  {name:'古い傷が縦に走る幹',curve:[[-.03,.31,.08],[.03,.32,.08],[.07,.31,.15]],feature:'scar',habit:'spreading'},
  {name:'岩を避けて傾いた幹',curve:[[.27,.21,-.09],[.16,.31,.12],[-.12,.37,-.01]],feature:'buttress',habit:'open'},
  {name:'曲がる枝垂れ柳の幹',curve:[[.11,.33,.07],[-.13,.31,-.14],[.09,.23,.19]],habit:'willow'},
  {name:'一方に偏った枝垂れ幹',curve:[[.01,.25,.06],[.17,.30,.18],[.24,.15,.24]],habit:'willow'},
  {name:'曲がった海岸防風樹',curve:[[-.08,.26,.18],[.25,.24,.23],[.29,.15,.16]],feature:'salt',habit:'windswept'},
  {name:'生長が途中で細くなった幹',curve:[[.04,.27,.015],[.17,.27,-.12],[.04,.33,-.07]],feature:'pinched',habit:'upright'},
  {name:'胴吹きする幹',curve:[[.03,.29,.05],[-.08,.31,.01],[.09,.37,.09]],feature:'epicormic',habit:'open'},
  {name:'根元が中空の分岐幹',curve:[[-.14,.21,-.08],[.14,.37,-.04],[-.021,.36,.12]],feature:'hollow',habit:'windswept'},
]);

export function createTreePlan(x,y,z,requestedGrowth,profileIndex,seed){
  const profile=trunkProfiles[profileIndex%trunkProfiles.length],rand=seeded(seed);
  const lengthSum=profile.curve.reduce((sum,delta)=>sum+Math.hypot(...delta),0);
  const growth=clamp(requestedGrowth,3.8,14.2);
  const radius=.110+growth*.025;
  const count=5+Math.round(30*(growth-3.8)/(14.2-3.8));
  const rotation=rand()*tau,cs=Math.cos(rotation),sn=Math.sin(rotation),base=[x,y,z];
  const spine=[base];
  for(const [qx,qy,qz] of profile.curve){
    const scale=growth/lengthSum;
    spine.push(plus(spine.at(-1),[(qx*cs-qz*sn)*scale,qy*scale,(qx*sn+qz*cs)*scale]));
  }
  const point=f=>{
    const k=clamp(f,0,.99999)*3,i=Math.floor(k);
    return copy(spine[i],spine[i+1],k-i);
  };
  const branches=[];
  const primary=Math.max(4,Math.round(count*.56));
  const lowest=profile.feature==='epicormic'||profile.feature==='lowFork'?.27:.36;
  for(let i=0;i<count;i++){
    const main=i<primary;
    const progress=(i%primary)/(primary-1);
    const parent=main?null:branches[Math.min(i-1,Math.floor(rand()*i))];
    const fraction=lowest+(1-lowest)*(.88*progress+.13*rand());
    const bearing=i<4?((seed>>>(i*8))&255)*tau/256+rotation:i*2.399+rotation+rand()*1.14;
    const fork=main&&i===0&&['fork','lowFork','highFork','twins'].includes(profile.feature);
    const f=fork?(profile.feature==='highFork'?.57:profile.feature==='lowFork'?.19:.36):fraction;
    const position=parent?copy(parent.bend,parent.tip,.18+rand()*.67):point(f);
    const long=parent?parent.length*(.24+rand()*.34):
      growth*(profile.habit==='willow'?.41:profile.habit==='upright'?.18:.31)*(1-f*.69)*(.70+rand()*.58);
    const up=profile.habit==='dead'?(rand()-.53)*long*.42:
      profile.habit==='willow'?long*(.22+rand()*.18):long*(.25+rand()*.48);
    const end=fork?plus(position,dir(bearing,long*.85,growth*.44)):plus(position,dir(bearing,long,up));
    const bend=plus(copy(position,end,.54),dir(bearing+.7,long*.08,long*.15*(rand()-.38)));
    const r=parent?parent.radius*(.29+rand()*.22):radius*(fork?.61:.52-f*.31)*(.72+rand()*.32);
    branches.push({position,bend,tip:end,bearing,radius:r,length:Math.hypot(...minus(end,position)),parent:i<primary?-1:branches.indexOf(parent)});
  }
  return {profile,branches,spine,point,growth,radius,rotation};
}

export function plantTree({solid,leaf,ground,x,z,growth,profileIndex,seed,far,economy,leafMaterial}){
  const rand=seeded(seed^0xad821ac3),rnd=(a,b)=>a+(b-a)*rand();
  const plan=createTreePlan(x,ground(x,z)-.04,z,growth,profileIndex,seed);
  const {profile,spine,branches,point,radius,rotation}=plan;
  const feature=profile.feature, dead=profile.habit==='dead';
  const wood=feature==='charred'||feature==='fallen'?t.burntWood:
    feature==='fungus'||feature==='moss'||feature==='ivy'?t.mossBark:41;
  const light=rnd(.76,1.08),tint=wood===t.burntWood?[.69,.61,.54]:[light,light*.91,light*.79];
  for(let j=0;j<3;j++) {
    const from=spine[j],to=spine[j+1],mid=copy(from,to,.54);
    const bend=plus(mid,dir(rotation+j*.83,radius*(feature==='spiral'?.52:.17),0));
    const r0=radius*[1.03,.73,.48][j],r1=radius*[.73,.48,.087][j];
    const rw=feature==='pinched'&&j===1?.46:1;
    solid.tube(from,bend,r0,(r0+r1)*.5*rw,wood,tint,far?7:10);
    solid.tube(bend,to,(r0+r1)*.5*rw,r1,wood,tint,far?7:10);
  }
  if(!far){
    const roots=feature==='buttress'||feature==='roots'?7:4;
    for(let j=0;j<roots;j++){
      const a=rotation+tau*j/roots+rnd(-.24,.24),span=radius*rnd(2.1,4.5);
      const xx=x+Math.cos(a)*span,zz=z+Math.sin(a)*span;
      solid.tube([x,spine[0][1]+radius*.6,z],[xx,ground(xx,zz)+.025,zz],radius*(feature==='buttress'?.51:.29),.018,feature==='moss'?t.barkMoss:70,tint,6);
    }
  }
  if(feature==='fungus'||feature==='burl'||feature==='hollow'){
    const count=feature==='fungus'?5:2;
    for(let j=0;j<count;j++){
      const p=point(.18+j*.085),a=rotation+j*1.14,r=radius*(feature==='burl'?1.12:feature==='hollow'?.54:rnd(.43,.83));
      const q=plus(p,dir(a,radius*.9,0));
      solid.orb(...q,r,r*(feature==='fungus'?.14:.60),r*.78,
        feature==='fungus'?t.velvetMoss:feature==='hollow'?t.burntWood:41,
        feature==='fungus'?[.82,.74,.48]:feature==='hollow'?[.28,.24,.20]:tint,3,7,.24);
    }
  }
  if(feature==='scar'||feature==='lightning'||feature==='broken'||feature==='fallen'){
    const p=plus(point(.30),dir(rotation,radius*.71,0)),q=plus(point(.61),dir(rotation+.2,radius*.51,0));
    solid.tube(p,q,radius*.21,.009,t.endGrain,[.95,.83,.62],5);
    if(feature!=='scar'){
      const tip=spine.at(-1);
      solid.tri(plus(tip,[-radius*.4,0,0]),plus(tip,[radius*.27,0,radius*.40]),plus(tip,[0,radius*1.44,-radius*.22]),t.burntWood,[.74,.55,.45]);
    }
  }
  if(feature==='ivy'||feature==='creeper'||feature==='moss'||feature==='salt'){
    const mat=feature==='ivy'?t.ivy:feature==='creeper'?t.creeper:feature==='salt'?t.basaltMoss:t.barkMoss;
    for(let i=0;i<34;i++){
      const fraction=.04+i*.67/34,p=point(fraction),a=rotation+fraction*17;
      const q=plus(p,dir(a,radius*(1-fraction*.62),0));
      leaf.leaf(q,radius*rnd(.56,1.16),radius*.37,a+rnd(-.8,.8),rnd(-.1,1.15),mat,[.83,.94,.72],rnd(0,.47));
    }
  }
  for(const branch of branches){
    const {position,bend,tip,radius:r,length:bLength,bearing}=branch;
    const sides=far?4:6;
    solid.tube(position,bend,r,r*.63,wood,tint,sides);
    solid.tube(bend,tip,r*.63,Math.min(.015,r*.22),wood,tint,sides);
    if(dead&&rnd(0,1)<.94)continue;
    if(profile.habit==='open'&&rnd(0,1)<.24)continue;
    const shape=profile.habit==='willow'?1.65:profile.habit==='upright'?.76:1;
    const canopyWidth=Math.min(growth*.36,Math.max(growth*.102,bLength*rnd(.86,1.23)));
    const at=copy(bend,tip,.72);
    if(profile.habit==='willow')at[1]-=canopyWidth*.29;
    const mat=profile.habit==='willow'?t.willow:leafMaterial;
    const color=[rnd(.71,.97),rnd(.77,1.04),rnd(.62,.89)];
    for(let j=0;j<(far?2:3);j++){
      leaf.spray(plus(at,dir(bearing+j*.77,canopyWidth*.14,j*canopyWidth*.072)),canopyWidth*rnd(1.03,1.49),canopyWidth*shape*rnd(.62,1.06),bearing+j*1.09,rnd(-.7,.7),color,mat);
    }
    if(!far)for(let j=0;j<(economy?3:8);j++){
      const a=rnd(0,tau), l=rnd(.18,.52)*Math.min(1.4,canopyWidth);
      const q=plus(at,dir(a,rnd(.12,.51)*canopyWidth,rnd(-.33,.41)*canopyWidth));
      leaf.leaf(q,l,l*rnd(.18,.31),a,rnd(-.8,.75),mat,color,rnd(0,.48));
    }
  }
}

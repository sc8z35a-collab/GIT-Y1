import {material as m, RUNNING_WATER} from './materials.js';

const tau=Math.PI*2;
export const extraPaths=[
  {w:1.26,points:[[9,-35],[10,-34.6],[10,-33.4]]},
  {w:1.28,points:[[-37,16],[-35,18],[-34.4,20],[-34.4,23.2],[-34.5,27],[-36.2,30],[-39.4,30.2]]},
  {w:1.32,points:[[37,24],[38,26.5],[40.3,29.7],[42.1,31.7],[44.1,31.5],[44.35,30]]},
  {w:1.42,points:[[-20,-30],[-18.7,-34],[-18.4,-38],[-18.8,-40]]},
  {w:1.14,points:[[44.9,-16],[45.5,-18.7],[46.8,-20.7],[48.1,-21.45]]},
  {w:1.20,points:[[39,-26],[49,-32],[54,-40],[59,-49],[62,-55.2]]},
  {w:1.10,points:[[-43,-3],[-52,-8],[-58,-13],[-62.8,-16]]},
  {w:1.12,points:[[5,39],[8,46],[13,51],[18,55.7]]},
];
export const grading=[
  {x:10,z:-34.45,rx:7,rz:4.1,y:2.15,dry:true},
  {x:-38.4,z:24.5,rx:12.0,rz:8.9,y:2.85},
  {x:44.2,z:24.45,rx:9.9,rz:11.7,y:1.90},
  {x:-18.8,z:-43,rx:11.3,rz:9.6,y:1.16},
  {x:47.6,z:-21.1,rx:7.6,rz:5.7,y:1.62},
];
export const clearing=(x,z)=>grading.some(v=>Math.abs(v.x-x)<v.rx*.82&&Math.abs(v.z-z)<v.rz*.85)
  || Math.abs(x-53)<4.5&&Math.abs(z-23)<6;
function patch(g,height,x,z,rx,rz,mat,tint,round=false){
  const dx=Math.ceil(rx*2),dz=Math.ceil(rz*2);
  function point(u,v){
    u=u/dx*2-1;v=v/dz*2-1;
    const xx=x+u*rx*(round?Math.sqrt(1-v*v*.50):1);
    const zz=z+v*rz*(round?Math.sqrt(1-u*u*.50):1);
    return [xx,height(xx,zz)+.064,zz];
  }
  for(let j=0;j<dz;j++)for(let i=0;i<dx;i++){
    const points=[point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j)];
    g.quad(...points,mat,tint,points.map(([a,,b])=>[a*.67,b*.67]));
  }
}
function mound(c,x,z,r,texture,palette=[.86,.94,.76],height=c.height(x,z)){
  for(let i=0;i<24;i++){
    const a=i*2.399,span=Math.sqrt(i/24)*r*c.rnd(.35,.88),len=r*c.rnd(.5,.91);
    c.leaf.leaf([x+Math.cos(a)*span,height+len*c.rnd(.08,.36),z+Math.sin(a)*span],len,len*c.rnd(.15,.29),a,c.rnd(.18,.99),texture,palette,c.rnd(0,.49));
  }
}
function pot(c,x,z,r,mat,plant,soil,y=c.height(x,z)){
  const h=r*1.26, g=c.solid;
  g.tube([x,y,z],[x,y+h,z],r*.71,r,mat,[.93,.89,.79],10);
  g.tube([x,y+h-.026,z],[x,y+h+.032,z],r*1.04,r*1.04,mat,[.90,.87,.79],10);
  g.tube([x,y+h+.03,z],[x,y+h+.047,z],r*.95,r*.95,soil,[.91,.91,.84],10);
  mound(c,x,z,r*1.27,plant,[.89,.97,.84],y+h+.046);
}
function lookout({solid:g,leaf,height,rnd}){
  const x=10,z=-30.60,y=2.34;
  patch(g,height,x,-34.56,3.6,1.08,m.cobbles,[.89,.92,.83]);
  for(let j=0;j<27;j++){
    const shade=rnd(.82,1.04);
    g.box(x,y-.07,z-3.38+j*.254,8.73,.14,.244,m.teak,[shade,shade*.98,shade*.91],0,3.8,.32);
  }
  // A shallow ramp ties the actual collision mesh to the approach path.
  const back=-34.02;
  g.quad([5.64,height(5.64,back-.74)+.057,back-.74],[14.36,height(14.36,back-.74)+.057,back-.74],[14.36,y,back],[5.64,y,back],m.teak,[.89,.88,.81]);
  for(const side of [-1,1]){
    const xx=x+side*4.29;
    for(let j=0;j<6;j++){
      const zz=z-3.29+j*1.32,base=height(xx,zz);
      g.box(xx,(base+y+1.03)*.5,zz,.16,y+1.03-base,.16,m.burntWood,[.91,.94,.84]);
      g.box(xx,y+1.06,zz,.185,.055,.185,m.endGrain,[.89,.86,.68]);
      g.box(xx-side*.084,y+.76,zz,.015,.08,.114,m.rivets,[.85,.78,.67]);
    }
    for(const rise of [.49,.79])g.tube([xx,y+rise,z-3.31],[xx,y+rise,z+3.3],.037,.037,m.rope,[.96,.93,.80],6,7);
  }
  const front=z+3.30;
  g.box(x,y+.50,front,8.54,.93,.042,m.grating,[.82,.87,.84],0,8,1);
  g.tube([5.63,y+.99,front],[14.37,y+.99,front],.09,.087,m.teak,[.91,.87,.77],7,4.5);
  for(let i=0;i<7;i++)g.box(5.74+i*1.42,y+.49,front,.10,1,.12,m.castIron,[.73,.83,.76]);
  for(const side of [-1,1]){
    g.box(x+side*3.12,y+1.51,front-.82,1.20,.35,.101,m.burntWood,[.89,.91,.82]);
    for(const a of [-1,1])g.box(x+side*3.12+a*.44,y+.71,front-.82,.074,1.50,.092,m.castIron,[.77,.81,.75]);
  }
  for(let i=0;i<24;i++){
    const xx=x+rnd(-5,5),zz=front+rnd(.2,2.4),r=rnd(.13,.43),h=height(xx,zz);
    g.orb(xx,h+.04,zz,r,r*.48,r*.82,m.pondPebbles,[.76,.81,.73],3,6);
    if(h>-.5)leaf.leaf([xx,h+.04,zz],r*.95,r*.24,rnd(0,tau),2.3,m.iris,[.83,.94,.77]);
  }
}
function oriental(c){
  const {solid:g,height,rnd}=c;
  patch(g,height,-39.1,24.4,5.32,4.21,m.rakedGravel,[.94,.91,.84],true);
  patch(g,(x,z)=>height(x,z)+.023,-42.9,25,1.28,2.96,m.riverGravel,[.75,.79,.74],true);
  patch(g,(x,z)=>height(x,z)+.031,-37.08,27.5,2.08,1.35,m.cushionMoss,[.85,.94,.75],true);
  for(let i=0;i<11;i++){
    const x=-34.7-i*.68,z=23.9+.16*i+Math.sin(i*.6)*.75,r=rnd(.30,.42);
    g.orb(x,height(x,z)+.091,z,r,r*.25,r*.83,m.steppingStone,[.96,.92,.86],3,7,.12);
  }
  for(const [x,z,r] of [[-43.3,22.55,1.23],[-43.83,23,.78],[-42.40,24.10,.71],[-42.94,25.2,.46],[-44.2,24.8,.57]]){
    g.orb(x,height(x,z)+r*.11,z,r,r*.60,r*.82,m.wetBasalt,[.78,.83,.74],4,7,.18);
  }
  for(let j=0;j<14;j++){
    const zz=22.8+j*.24,xx=-43.15+.52*Math.sin(j*.29),y=height(xx,zz)+.11+Math.max(0,6-j)*.11;
    const ns=zz+.245,nx=-43.15+.52*Math.sin((j+1)*.29),ny=height(nx,ns)+.11+Math.max(0,5-j)*.11,w=.24+.07*Math.sin(j*.31);
    g.quad([xx-w,y,zz],[xx+w,y,zz],[nx+w,ny,ns],[nx-w,ny,ns],RUNNING_WATER,[.80,.93,.87],[[0,j*.18],[1,j*.18],[1,(j+1)*.18],[0,(j+1)*.18]]);
  }
  const lx=-40.45,lz=21.87,y=height(lx,lz);
  g.tube([lx,y,lz],[lx,y+.23,lz],.44,.29,m.granite,[.90,.88,.82],9);
  g.tube([lx,y+.20,lz],[lx,y+1.13,lz],.133,.11,m.granite,[.89,.88,.82],8);
  g.tube([lx,y+1.1,lz],[lx,y+1.26,lz],.28,.27,m.granite,[.89,.88,.82],8);
  g.box(lx,y+1.40,lz,.41,.32,.42,m.granite,[.83,.87,.80],.20);
  g.tube([lx,y+1.51,lz],[lx,y+1.86,lz],.43,.12,m.granite,[.89,.88,.79],7);
  const zz=20.33;
  for(let i=0;i<4;i++){
    const x=-44.11+i*1.86,h=height(x,zz);
    g.box(x,h+.73,zz,.13,1.49,.13,m.bamboo,[.88,.84,.66]);
    if(i<3){
      g.box(x+.93,h+.73,zz,1.78,1.16,.075,m.lattice,[.98,.94,.81],0,1.42,.95);
      g.box(x+.93,h+1.27,zz,1.87,.105,.14,m.bamboo,[.93,.88,.69]);
    }
  }
  const sx=-42.53,sz=28.9,sy=height(sx,sz)+.12;
  g.box(sx,sy-.09,sz,4.34,.19,2.52,m.steppingStone,[.91,.89,.81],0,2.3,1.4);
  for(const a of [-1,1])for(const b of [-1,1])g.tube([sx+a*1.92,sy,sz+b*.99],[sx+a*1.92,sy+2.42,sz+b*.99],.106,.099,m.bamboo,[.91,.84,.67],7);
  for(const b of [-1,1]){
    g.quad([sx-2.37,sy+2.44,sz+b*1.36],[sx+2.37,sy+2.44,sz+b*1.36],[sx+2.18,sy+3.27,sz],[sx-2.18,sy+3.27,sz],m.shingles,[.86,.83,.73],[[0,0],[3.2,0],[3.08,1],[.12,1]]);
  }
  c.bench(g,sx,sz+.49,0);
  mound(c,-40.86,25.93,.63,m.hosta);
  mound(c,-42.4,26.91,.77,m.azalea,[.91,.89,.87]);
  mound(c,-39.14,27.39,.69,m.redMaple,[.91,.85,.76]);
  mound(c,-39.37,21.44,.47,m.fern);
  mound(c,-36.81,26.78,.65,m.wildStrawberry);
}
function glasshouse(c){
  const {solid:g,glass,height,rnd}=c,x=44.2,z=24.55,halfW=4.30,halfD=5.9,y=1.985,wall=2.77,peak=4.73;
  g.box(x,y-.128,z,8.85,.26,12.04,m.brick,[.92,.86,.78],0,3.55,1.21);
  g.box(x,y-.029,z,8.62,.065,11.82,m.aggregate,[.83,.87,.81],0,3.9,4.9);
  for(const s of [-1,1]){
    const xx=x+s*halfW,zz=z+s*halfD;
    g.box(xx,y+.18,z,.21,.43,11.8,m.brick,[.93,.88,.81],0,.85,3.5);
    g.box(xx,y+1.10,z,.10,.09,11.8,m.greenSteel,[.90,.98,.89],0,.65,4);
    g.box(xx,y+wall,z,.14,.13,11.8,m.greenSteel,[.86,.95,.85],0,.6,4);
    for(let i=0;i<=6;i++){
      const a=z-halfD+i*halfD/3,b=a+halfD/3;
      g.box(xx,y+wall*.5,a,.13,wall+.08,.14,m.greenSteel,[.89,.96,.89]);
      g.tube([xx,y+wall,a],[x,y+peak,a],.067,.055,m.greenSteel,[.85,.94,.85],6);
      if(i===6)continue;
      glass.quad([xx,y+.39,a],[xx,y+.39,b],[xx,y+wall,b],[xx,y+wall,a],m.frosted,[.83,.96,.90]);
      glass.quad([xx,y+wall,a],[xx,y+wall,b],[x,y+peak,b],[x,y+peak,a],m.flutedGlass,[.86,.97,.91]);
    }
    for(const sign of [-1,1]){
      const a=x+sign*.98,b=x+sign*halfW;
      g.box((a+b)/2,y+.18,zz,Math.abs(b-a),.43,.18,m.brick,[.92,.90,.84]);
      g.box(a,y+wall*.5,zz,.128,wall+.17,.16,m.greenSteel,[.89,.99,.91]);
      glass.quad([a,y+.40,zz],[b,y+.40,zz],[b,y+wall,zz],[a,y+wall,zz],m.frosted,[.87,.97,.92]);
      glass.tri([x,y+peak,zz],[x,y+wall,zz],[b,y+wall,zz],m.flutedGlass,[.91,.99,.89]);
    }
    g.box(x,y+2.58,zz,2.08,.14,.15,m.greenSteel,[.89,.96,.87]);
    glass.quad([x-.93,y+2.64,zz],[x+.93,y+2.64,zz],[x+.93,y+wall,zz],[x-.93,y+wall,zz],m.flutedGlass,[.82,.95,.89]);
    g.box(x,y-.05,zz+s*.28,2.23,.124,.64,m.cobbles,[.92,.91,.86],0,1.32,1.1);
  }
  g.tube([x,y+peak,z-halfD],[x,y+peak,z+halfD],.077,.075,m.greenSteel,[.93,.99,.90],6,6);
  for(const side of [-1,1]){
    for(const offset of [-3.3,.66]){
      const xx=x+side*2.88,zz=z+offset;
      g.box(xx,y+.305,zz,1.54,.59,2.71,m.pine,[.92,.88,.78],0,1.7,1);
      g.box(xx,y+.614,zz,1.44,.035,2.63,side>0?m.pumice:m.pottingSoil,[.93,.92,.85],0,2.1,3.2);
      for(let j=0;j<7;j++)mound(c,xx+rnd(-.38,.38),zz+rnd(-1,1),rnd(.15,.34),side>0?m.lavender:m.hosta,[.87,.96,.87],y+.636);
    }
  }
  g.box(x+3.02,y+.51,z+2.95,1.38,1.02,1.65,m.sageTile,[.88,.96,.86],0,1.8,1);
  g.box(x+3.02,y+1.061,z+2.95,1.45,.095,1.70,m.pine,[.90,.91,.83]);
  pot(c,x-2.68,z+4.24,.43,m.terracotta,m.azalea,m.pottingSoil,y);
  pot(c,x+2.85,z+4.34,.38,m.ceramic,m.hydrangea,m.pumice,y);
  pot(c,x-2.13,z+halfD+.69,.46,m.terracotta,m.azalea,m.pottingSoil);
}
function ring(g,x,y,z,r,w,h,mat,tint){
  const n=40;
  for(let j=0;j<n;j++){
    const a=j*tau/n,b=(j+1)*tau/n,p=(radius,angle,yy)=>[x+radius*Math.cos(angle),yy,z+radius*Math.sin(angle)];
    const u=j/n*8,v=(j+1)/n*8;
    g.quad(p(r,a,y),p(r,b,y),p(r,b,y+h),p(r,a,y+h),mat,tint,[[u,0],[v,0],[v,1],[u,1]]);
    g.quad(p(r-w,b,y),p(r-w,a,y),p(r-w,a,y+h),p(r-w,b,y+h),mat,tint,[[v,0],[u,0],[u,1],[v,1]]);
    g.quad(p(r,a,y+h),p(r,b,y+h),p(r-w,b,y+h),p(r-w,a,y+h),mat,tint,[[u,0],[v,0],[v,.48],[u,.48]]);
  }
}
function fountain(c){
  const {solid:g,height}=c,x=-18.8,z=-43.15,y=1.18;
  patch(g,height,x,z,7.15,5.75,m.fanPavers,[.86,.85,.79],true);
  ring(g,x,y,z,2.39,.32,.38,m.limestone,[.95,.91,.81]);
  ring(g,x,y+.38,z,2.46,.41,.15,m.roseGranite,[.94,.90,.84]);
  g.tube([x,y+.20,z],[x,y+.279,z],2.18,2.18,m.mosaic,[.80,.88,.74],40,3);
  g.tube([x,y+.291,z],[x,y+.318,z],2.126,2.126,RUNNING_WATER,[.79,.91,.87],40,3.9);
  g.tube([x,y+.31,z],[x,y+.52,z],.84,.55,m.limestone,[.86,.83,.74],18);
  g.tube([x,y+.52,z],[x,y+1.16,z],.35,.24,m.rainStone,[.86,.84,.78],14);
  g.tube([x,y+1.16,z],[x,y+1.45,z],.53,.99,m.relief,[.95,.90,.80],24);
  g.tube([x,y+1.43,z],[x,y+1.51,z],1.00,.96,m.roseGranite,[.94,.91,.85],24);
  g.tube([x,y+1.51,z],[x,y+1.55,z],.24,.20,m.bronze,[.91,.92,.80],12);
  g.tube([x,y+1.51,z],[x,y+2.02,z],.036,.026,RUNNING_WATER,[.89,.95,1],7);
  for(let j=0;j<8;j++){
    const a=j*tau/8;
    let p=[x,y+2.02,z];
    for(let i=1;i<=12;i++){
      const t=i/12,w=t*1.88,q=[x+Math.cos(a)*w,y+2.02+t*1.09-t*t*2.79,z+Math.sin(a)*w];
      g.tube(p,q,.012+t*.002,.015+t*.004,RUNNING_WATER,[.87,.94,1],5);
      p=q;
    }
  }
  for(const s of [-1,1]){
    g.box(x+s*4.36,y+.181,z-.68,1.08,.37,2.49,m.rainStone,[.84,.84,.77],0,1.45,1);
    g.box(x+s*4.36,y+.41,z-.68,1.13,.15,2.55,m.roseGranite,[.93,.92,.85]);
  }
  const xx=x-4.04,zz=z-3.45,yy=height(xx,zz);
  g.box(xx,yy+.73,zz,2.42,1.46,.51,m.limewash,[.90,.91,.84]);
  g.box(xx,yy+.25,zz,2.46,.48,.55,m.limestone,[.92,.90,.82]);
  g.box(xx,yy+1.49,zz,2.56,.14,.65,m.rainStone,[.83,.83,.76]);
  g.box(xx,yy+.94,zz+.28,1.92,.76,.063,m.darkOak,[.89,.90,.79]);
  g.box(xx,yy+.96,zz+.324,1.64,.50,.048,m.relief,[.94,.89,.82]);
  pot(c,x+4.5,z-3.26,.47,m.ceramic,m.whiteClover,m.pottingSoil);
}
function pergola(c){
  const {solid:g,height}=c,x=49,z=-21.25,y=height(x,z);
  patch(g,height,x-.15,z,3.65,2.12,m.aggregate,[.86,.87,.82],true);
  for(const a of [-1,1])for(const b of [-1,1]){
    const xx=x+a*2.64,zz=z+b*1.30,h=height(xx,zz);
    g.box(xx,h+.16,zz,.43,.33,.43,m.plaster,[.91,.90,.82]);
    g.box(xx,h+1.47,zz,.158,2.68,.16,m.hammeredCopper,[.83,.87,.76]);
    g.box(xx,h+2.83,zz,.203,.17,.18,m.brass,[.92,.88,.78]);
  }
  for(const s of [-1,1]){
    g.box(x,y+2.78,z+s*1.42,5.66,.154,.151,m.hammeredCopper,[.81,.86,.78],0,2.7,.62);
    g.box(x+s*2.62,y+2.83,z,.154,.12,3.3,m.blueEnamel,[.87,.94,.96],0,.9,1.9);
  }
  for(let i=0;i<14;i++)g.box(x-2.57+i*.395,y+2.946,z,.112,.09,3.33,m.hammeredCopper,[.86,.87,.77]);
  g.box(x,y+1.74,z-1.4,5.1,1.02,.049,m.perforated,[.74,.80,.76],0,5,1);
  g.box(x,y+2.30,z-1.4,5.1,.11,.085,m.blueEnamel,[.87,.91,.92]);
  g.box(x,y+.073,z+.25,4.99,.038,1.33,m.rubber,[.88,.87,.85],0,3,1.1);
  g.box(x,y+.48,z-.78,4.67,.108,.46,m.oak,[.93,.88,.77],0,3.7,.81);
  for(const s of [-1,1])g.box(x+s*1.65,y+.24,z-.78,.22,.47,.38,m.castIron,[.75,.79,.75]);
  for(const [dx,dz,plant] of [[-2.81,1.67,m.pampas],[3.35,-.87,m.hydrangea],[-3.09,-.91,m.lavender],[2.94,1.76,m.mugwort]]){
    pot(c,x+dx,z+dz,.45,m.ceramic,plant,m.pottingSoil);
  }
  for(let j=0;j<19;j++){
    const xx=x-2.65+j*.29,zz=z+Math.sin(j*.62)*1.16;
    c.leaf.spray([xx,y+2.98+(j%3)*.045,zz],.86,.65,j*.92,.38,[.83,.95,.80],m.wisteria);
    if(j<12)c.leaf.leaf([x-2.70,y+.82+j*.17,z+1.31],.40,.117,j*.82,.74,m.creepingFig,[.87,.96,.79]);
  }
}
function plantings(c){
  const {solid:g,height,rnd}=c;
  const crops=[m.chard,m.kale,m.cabbage,m.rice];
  for(let row=0;row<4;row++){
    const x=52.9+(row%2)*2.61,z=19.55+Math.floor(row/2)*5.05,y=height(x,z);
    g.box(x,y+.14,z,2.06,.28,4.1,m.pine,[.86,.82,.73],0,2,3.1);
    g.box(x,y+.291,z,1.95,.045,4,m.pottingSoil,[.90,.85,.76],0,1.55,2.85);
    for(let j=0;j<6;j++)for(const s of [-1,1]){
      mound(c,x+s*.48+rnd(-.1,.1),z-1.65+j*.66,rnd(.21,.34),crops[row],[.86,.94,.77],y+.316);
    }
  }
  const shore=[[-60,-28],[-61.2,-15],[60,-48],[59,-50],[59.5,39],[-59.4,43],[15,54],[20,54],[-22.3,-51],[33.1,-52]];
  const flora=[m.beachGrass,m.plantain,m.mugwort,m.coastalClover,m.mustard,m.switchgrass];
  const moss=[m.velvetMoss,m.starMoss,m.basaltMoss,m.barkMoss];
  for(const [x,z] of shore){
    for(let j=0;j<7;j++){
      const xx=x+rnd(-1,1),zz=z+rnd(-1.7,1.7);
      mound(c,xx,zz,rnd(.24,.62),flora[j%flora.length],[.88,.96,.80]);
      if(j<4)g.orb(xx,height(xx,zz)+.025,zz,rnd(.28,.58),rnd(.14,.25),rnd(.20,.48),moss[j],[.79,.87,.74],3,5,.16);
    }
  }
}
export function buildExpansion(c){
  lookout(c);oriental(c);glasshouse(c);fountain(c);pergola(c);plantings(c);
}

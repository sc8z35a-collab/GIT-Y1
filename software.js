import {buildWorld,shore,WET_LEVEL} from './world.js';
import {createAvatar} from './avatar.js';
import {createCollision} from './collision.js';
import {SEA_LEVEL} from './land.js';
import {buildShadow} from './software-shadow.js';
import {defaults,renderDimensions} from './graphics.js';
import {CANOPY_FIRST,RUNNING_WATER,TILE_SIZE,canopyVisible,loadMaterialSheets,readMaterialTiles} from './materials.js';

const LIGHTING = Object.freeze({sun:[-.51,.73,-.45],tint:[1.10,1.10,1.00],mist:[148,169,154],horizon:[199,218,203],peak:[92,158,194]});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const stride=36;

async function materials(){
  const list=[];
  readMaterialTiles(await loadMaterialSheets(),(i,pixels)=>{list[i]=pixels;});
  return list;
}
function chunks(mesh) {
  const byTile=new Map();
  for(let i=0;i<mesh.length;i+=stride){
    const x=Math.floor((mesh[i]+mesh[i+12]+mesh[i+24])/30);
    const z=Math.floor((mesh[i+2]+mesh[i+14]+mesh[i+26])/30);
    const key=x+z*100;
    if(!byTile.has(key)) byTile.set(key,{x:(x+.5)*10,z:(z+.5)*10,data:[]});
    const data=byTile.get(key).data;
    for(let n=0;n<stride;n++)data.push(mesh[i+n]);
  }
  return [...byTile.values()].map(({x,z,data})=>({x,z,data:Float32Array.from(data)}));
}
export async function createSoftwareRenderer(canvas) {
  const context=canvas.getContext('2d',{alpha:false});
  if(!context) throw new Error('3D fallback unavailable');
  const textures=await materials();
  const world=buildWorld({economy:true}),collision=createCollision(world),avatar=createAvatar();
  const surfaces=['terrain','solid','leaf','grass','glass'].map(key=>chunks(world[key]));
  const casters=[world.terrain,world.solid,world.leaf];
  const time=LIGHTING,mobile=matchMedia('(pointer:coarse)').matches;
  const standard=buildShadow(casters,time.sun,444,145);
  let detail=null,shade=standard,playerShadow=null;
  let quality={...defaults},reflectionAt=null,glassPass=false;
  let w=0,h=0,halfW=0,halfH=0,zBuffer,image,pixels,clock=0,eye,skyGradient=[];
  let reflection,reflectionWidth,reflectionHeight,reflectionDepth,mirror=false;
  let renderCost=0,budgetScale=1,lastBudgetChange=0;
  const base=document.createElement('canvas'),composite=base.getContext('2d',{alpha:false});
  const projected=Array.from({length:3},()=>new Float64Array(8));
  const cutVertices=Array.from({length:2},()=>new Float64Array(8));
  const triangle=[null,null,null];
  let fx,fy,fz,rx,rz,ux,uy,uz,slope,projection;
  const waterBounds=[[-28,-36],[36,-36],[36,11],[-28,11]];
  const tonemap=Array.from({length:512},(_,value)=>{
    const light=(value/255)**2*1.16;
    return Math.round(Math.sqrt(light<.64?light:.64+.36*(1-Math.exp(-(light-.64)/.36)))*255);
  });
  const tone=value=>tonemap[clamp(value|0,0,511)];

  function resize(width,height){
    if(w===width&&h===height) return;
    w=base.width=width;h=base.height=height;
    halfW=w/2;halfH=h/2;zBuffer=new Float32Array(w*h);
    image=composite.createImageData(w,h);pixels=image.data;
    reflectionWidth=Math.ceil(w*.48);reflectionHeight=Math.ceil(h*.48);
    reflectionDepth=new Float32Array(reflectionWidth*reflectionHeight);
    reflection=new Uint8ClampedArray(reflectionWidth*reflectionHeight*4);reflectionAt=null;
  }
  function project(out,x,y,z,u,v){
    const dx=x-eye.x,dy=y-eye.y,dz=z-eye.z;
    out[0]=dx*rx+dz*rz;out[1]=dx*ux+dy*uy+dz*uz;out[2]=dx*fx+dy*fy+dz*fz;
    out[3]=u;out[4]=v;out[5]=x;out[6]=z;out[7]=y;
    return out;
  }
  function cut(out,a,b){
    const t=(.095-a[2])/(b[2]-a[2]);
    for(let i=0;i<8;i++)out[i]=lerp(a[i],b[i],t);
    out[2]=.095;
    return out;
  }
  function uvIndex(u,v){
    const period=TILE_SIZE*2;
    let a=Math.floor(u*TILE_SIZE)%period,b=Math.floor(-v*TILE_SIZE)%period;
    if(a<0)a+=period;
    if(b<0)b+=period;
    return ((b<TILE_SIZE?b:period-1-b)*TILE_SIZE+(a<TILE_SIZE?a:period-1-a))*4;
  }
  function sky() {
    zBuffer.fill(0);
    skyGradient.length=h;
    for(let y=0;y<h;y++){
      const v=(halfH-y)/projection;
      const rise=clamp((fy+v*uy)*.94,0,1);
      const t=Math.sqrt(rise);
      skyGradient[y]=time.horizon.map((c,k)=>lerp(c,time.peak[k],t));
      const [r,g,b]=skyGradient[y];
      for(let x=0;x<w;x+=3){
        const lens=(x-halfW)/projection;
        const xx=fx+rx*lens+ux*v,zz=fz+rz*lens+uz*v,yy=fy+uy*v;
        const d=Math.sqrt(xx*xx+yy*yy+zz*zz);
        const sun=clamp((xx*time.sun[0]+yy*time.sun[1]+zz*time.sun[2])/d,0,1);
        const halo=sun**8*42+(sun>.9989?(quality.hdr?128:82):0);
        const cloud=yy>0?Math.max(0,Math.sin(xx*12+zz*8+clock*.009)*Math.sin(zz*7-yy*17)*.67-.18)*Math.min(.31,yy)*105:0;
        let red=r+halo+cloud,green=g+halo*.65+cloud,blue=b+halo*.35+cloud;
        if(yy<0&&eye.y>SEA_LEVEL){
          const dist=(SEA_LEVEL-eye.y)/yy;
          const blend=clamp(-yy/.020,0,1);
          const sx=eye.x+xx*dist,sz=eye.z+zz*dist,fade=clamp(dist/1030,0,.94);
          let ar=40,ag=105,ab=127;
          if(dist<1040){
            const wave=Math.sin(sx*.43+sz*.31+clock*.86);
            const at=uvIndex(sx*.037+wave*.016,sz*.037);
            const tile=textures[18];
            ar+=tile[at]*.29;ag+=tile[at+1]*.31;ab+=tile[at+2]*.33;
          }
          red=lerp(red,lerp(ar,time.mist[0]*.94,fade),blend);
          green=lerp(green,lerp(ag,time.mist[1]*.94,fade),blend);
          blue=lerp(blue,lerp(ab,time.mist[2]*.97,fade),blend);
        }else if(eye.y<SEA_LEVEL){
          const f=clamp(yy*.74,0,1);
          red=lerp(23,red,f);green=lerp(66,green,f);blue=lerp(82,blue,f);
        }
        if(quality.hdr){red=tone(red);green=tone(green);blue=tone(blue);}
        for(let i=0;i<3&&x+i<w;i++){
          const at=(y*w+x+i)*4;
          pixels[at]=red;pixels[at+1]=green;pixels[at+2]=blue;pixels[at+3]=255;
        }
      }
    }
  }
  function raster(a,b,c,material,light,q0,q1,q2){
    const ai=1/a[2],bi=1/b[2],ci=1/c[2];
    const ax=halfW+a[0]*projection*ai,ay=halfH-a[1]*projection*ai;
    const bx=halfW+b[0]*projection*bi,by=halfH-b[1]*projection*bi;
    const cx=halfW+c[0]*projection*ci,cy=halfH-c[1]*projection*ci;
    const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx))),x1=Math.min(w-1,Math.floor(Math.max(ax,bx,cx)));
    const y0=Math.max(0,Math.ceil(Math.min(ay,by,cy))),y1=Math.min(h-1,Math.floor(Math.max(ay,by,cy)));
    if(x1<x0||y1<y0)return;
    const denom=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
    if(Math.abs(denom)<.16)return;
    const dw0=(by-cy)/denom,dw1=(cy-ay)/denom,dw2=-dw0-dw1;
    const terrain=material===-10,water=material===-20,foliage=material>=CANOPY_FIRST,flow=material===RUNNING_WATER;
    const texture=material>=0?textures[foliage?material-CANOPY_FIRST:flow?23:material]:null;
    const hdr=quality.hdr&&!mirror;
    const vx=(a[5]+b[5]+c[5])*.333333,vz=(a[6]+b[6]+c[6])*.333333;
    const fogLevel=.000097*(1+Math.sin(vx*.054+clock*.004)*Math.cos(vz*.048)*.58);
    const localShade=!mirror&&(terrain||water||quality.shadows==='super');
    const averagedShade=mirror||localShade?1:shade(vx,(a[7]+b[7]+c[7])*.333333,vz);
    const dynamicShadow=Boolean(!mirror&&playerShadow&&Math.abs(vx-eye.actor.x)<5.1&&Math.abs(vz-eye.actor.z)<5.1);
    const au=a[3]*ai,bu=b[3]*bi,cu=c[3]*ci,av=a[4]*ai,bv=b[4]*bi,cv=c[4]*ci;
    const axw=a[5]*ai,bxw=b[5]*bi,cxw=c[5]*ci,azw=a[6]*ai,bzw=b[6]*bi,czw=c[6]*ci;
    const ayw=a[7]*ai,byw=b[7]*bi,cyw=c[7]*ci;
    const mist=time.mist, tint=time.tint, grass=textures[36], path=textures[12];
    const rLight=q0*light*tint[0], gLight=q1*light*tint[1], bLight=q2*light*tint[2];
    for(let y=y0;y<=y1;y++){
      let w0=((by-cy)*(x0-cx)+(cx-bx)*(y-cy))/denom;
      let w1=((cy-ay)*(x0-cx)+(ax-cx)*(y-cy))/denom;
      let w2=1-w0-w1;
      let pixel=y*w+x0;
      for(let x=x0;x<=x1;x++,pixel++,w0+=dw0,w1+=dw1,w2+=dw2){
        if(w0<-.00001||w1<-.00001||w2<-.00001)continue;
        const iz=w0*ai+w1*bi+w2*ci;
        if(iz<=zBuffer[pixel])continue;
        const d=1/iz;
        const fog=Math.min(.77,d*d*fogLevel);
        let xx=0,zz=0;
        if(localShade||dynamicShadow||terrain||water){xx=(w0*axw+w1*bxw+w2*cxw)*d;zz=(w0*azw+w1*bzw+w2*czw)*d;}
        let r=255,g=255,b=255,shadow=averagedShade;
        if(terrain||water){
          if(water){
            const edge=shore(xx,zz);
            if(edge>1.002)continue;
            const wave=Math.sin(xx*2.5+zz*2.6+clock*1.4), ripple=Math.cos(xx*1.84-zz*3.24-clock*1.48);
            const layer=edge>.79?19:26;
            const tile=textures[layer],at=uvIndex(xx*.15+wave*.024+clock*.019,zz*.146+ripple*.028);
            const sheen=Math.pow(Math.max(0,wave*.38+ripple*.62),5)*(hdr?63:35);
            const reflect=clamp(.76-Math.min(.7,2.8/d),.12,.73);
            const reflected=skyGradient[Math.min(h-1,Math.max(0,Math.floor(halfH-(y-halfH)*.67)))];
            const banks=Math.max(0,Math.sin(xx*.18+zz*.6)*Math.sin(zz*.24-xx*.29))*.19;
            const reflX=Math.floor(x*.48+wave*2.1), reflY=Math.floor(y*.48+ripple*1.72);
            const ri=(reflY*reflectionWidth+reflX)*4;
            const has=reflX>=0&&reflX<reflectionWidth&&reflY>=0&&reflY<reflectionHeight&&reflection[ri+3];
            r=lerp(tile[at]*.62,has?reflection[ri]*.73:reflected[0]*.47,reflect-banks)+sheen;
            g=lerp(tile[at+1]*.74,has?reflection[ri+1]*.83:reflected[1]*.69,reflect-banks)+sheen*.94;
            b=lerp(tile[at+2]*.75,has?reflection[ri+2]*.80:reflected[2]*.68,reflect-banks)+sheen*.83;
            const foam=Math.max(0,(edge-.973)*18)*Math.max(0,wave+ripple-.37)*19;
            r+=foam;g+=foam;b+=foam;
          }else{
            const pd=(w0*au+w1*bu+w2*cu)*d, edge=(w0*av+w1*bv+w2*cv)*d;
            const variation=Math.sin(xx*.48+zz*.21)*Math.sin(zz*.51-xx*.31);
            const boundary=pd+variation*.52+.13*Math.sin(xx*5.19+zz*6.3);
            const blend=clamp(.53-boundary*1.09,0,1);
            let tile=variation>.41?textures[44]:grass;
            if(xx<-28 || zz<-35)tile=variation>-.13?textures[39]:textures[70];
            if(xx>22&&zz>12&&zz<27&&xx<42)tile=variation>.02?textures[64]:textures[67];
            if(edge<1.079)tile=edge<1.007?textures[71]:textures[42];
            const at=uvIndex(xx*.82+zz*.12,zz*.80-xx*.12);
            const pt=blend>.001?uvIndex(xx*1.07,zz*1.11):0;
            const atFine=uvIndex(xx*.814+zz*.12+.014,zz*.80-xx*.12+.008),ptFine=blend>.001?uvIndex(xx*1.07+.014,zz*1.11+.015):0;
            r=lerp((tile[at]+tile[atFine])*.5,(path[pt]+path[ptFine])*.5,blend);
            g=lerp((tile[at+1]+tile[atFine+1])*.5,(path[pt+1]+path[ptFine+1])*.5,blend);
            b=lerp((tile[at+2]+tile[atFine+2])*.5,(path[pt+2]+path[ptFine+2])*.5,blend);
            shadow*=.96+variation*.075;
          }
        }else if(texture){
          const u=(w0*au+w1*bu+w2*cu)*d,v=(w0*av+w1*bv+w2*cv)*d;
          if(foliage&&!canopyVisible(u,v))continue;
          const k=foliage?1.63:1;
          const at=uvIndex(u*k+(flow?Math.sin(v*5+clock)*.034:0),v*k-(flow?clock*.44:0));
          r=texture[at];g=texture[at+1];b=texture[at+2];
          if(flow){r=r*.72+45;g=g*.81+52;b=b*.84+63;}
        }
        if(localShade||dynamicShadow){
          const yy=(w0*ayw+w1*byw+w2*cyw)*d;
          if(localShade)shadow*=shade(xx,yy,zz);
          if(dynamicShadow)shadow*=playerShadow(xx,yy,zz);
        }
        let red=lerp(r*rLight*shadow,mist[0],fog),green=lerp(g*gLight*shadow,mist[1],fog),blue=lerp(b*bLight*shadow,mist[2],fog);
        if(hdr){red=tone(red);green=tone(green);blue=tone(blue);}
        const i=pixel*4;
        if(glassPass){
          const a=material===92?.31:.24;
          pixels[i]=lerp(pixels[i],red,a);pixels[i+1]=lerp(pixels[i+1],green,a);pixels[i+2]=lerp(pixels[i+2],blue,a);
        }else{
          pixels[i]=red;pixels[i+1]=green;pixels[i+2]=blue;zBuffer[pixel]=iz;
        }
        pixels[i+3]=255;
      }
    }
  }
  function clipAndDraw(a,b,c,mat,l,r,g,bl){
    const visible=Number(a[2]>=.095)+Number(b[2]>=.095)+Number(c[2]>=.095);
    if(visible===0)return;
    if(visible===3){raster(a,b,c,mat,l,r,g,bl);return;}
    triangle[0]=a;triangle[1]=b;triangle[2]=c;
    const inside=[];
    let cuts=0;
    for(let k=0;k<3;k++){
      const first=triangle[k],second=triangle[(k+1)%3];
      const f=first[2]>=.095,s=second[2]>=.095;
      if(f)inside.push(first);
      if(f!==s)inside.push(cut(cutVertices[cuts++],first,second));
    }
    raster(inside[0],inside[1],inside[2],mat,l,r,g,bl);
    if(inside.length===4)raster(inside[0],inside[2],inside[3],mat,l,r,g,bl);
  }
  function surface(set,kind){
    const [a,b,c]=projected;
    for(const {x,z,data} of set){
      const dx=x-eye.x,dz=z-eye.z, depth=dx*fx+dz*fz, right=dx*rx+dz*rz;
      if(depth<-10 || depth>118 || Math.abs(right)>Math.max(0,depth)*slope+13)continue;
      if(kind===3&&depth>36)continue;
      const wind=(kind===2||kind===3)?.026*Math.sin(x*.79+z*.59+clock*1.64):0;
      for(let i=0;i<data.length;i+=stride){
        const x0=data[i],y0=data[i+1],z0=data[i+2],mat=data[i+8];
        const rangeX=x0-eye.x,rangeZ=z0-eye.z, range=rangeX*rangeX+rangeZ*rangeZ;
        if((kind===2&&range>9800)||(kind===3&&range>1140))continue;
        if(kind===2&&range>1600&&mat<CANOPY_FIRST)continue;
        if(kind===1&&range>2500&&Math.abs(data[i+12]-x0)+Math.abs(data[i+24]-x0)+
          Math.abs(data[i+13]-y0)+Math.abs(data[i+25]-y0)+Math.abs(data[i+14]-z0)+Math.abs(data[i+26]-z0)<.30)continue;
        const y1=data[i+13],y2=data[i+25];
        if(mirror&&Math.max(y0,y1,y2)<WET_LEVEL)continue;
        project(a,x0+wind,mirror?WET_LEVEL*2-y0:y0,z0,data[i+6],data[i+7]);
        project(b,data[i+12]+wind,mirror?WET_LEVEL*2-y1:y1,data[i+14],data[i+18],data[i+19]);
        project(c,data[i+24]+wind,mirror?WET_LEVEL*2-y2:y2,data[i+26],data[i+30],data[i+31]);
        const nx=data[i+3],ny=data[i+4],nz=data[i+5];
        const ns=nx*time.sun[0]+ny*time.sun[1]+nz*time.sun[2];
        const light=kind===0?.91+Math.max(0,ns)*.19:kind===2?.93+Math.abs(ns)*.26:.81+Math.abs(ns)*.29;
        const tone=kind===2?1.13:1.0;
        clipAndDraw(a,b,c,mat,light,data[i+9]*tone,data[i+10]*tone,data[i+11]*tone);
      }
    }
  }
  function drawReflection() {
    const old=[w,h,halfW,halfH,pixels,zBuffer,projection];
    w=reflectionWidth;h=reflectionHeight;halfW=w/2;halfH=h/2;
    pixels=reflection;zBuffer=reflectionDepth;projection*=.48;mirror=true;
    reflection.fill(0);reflectionDepth.fill(0);
    surface(surfaces[1],1);surface(surfaces[2],2);
    [w,h,halfW,halfH,pixels,zBuffer,projection]=old;
    mirror=false;
  }
  function frame(state){
    const workStart=performance.now();
    const {width:ow,height:oh}=renderDimensions(canvas.clientWidth,canvas.clientHeight,quality,mobile,devicePixelRatio||1);
    const budget=quality.resolution==='1.5k'?(mobile?325000:510000):(mobile?170000:290000);
    const f=Math.min(1,Math.sqrt(budget*budgetScale/(ow*oh)));
    const width=Math.max(1,Math.round(ow*f)),height=Math.max(1,Math.round(oh*f));
    if(canvas.width!==ow||canvas.height!==oh){canvas.width=ow;canvas.height=oh;}
    resize(width,height);
    const {x,y,z,yaw,pitch,actor}=state;
    clock=state.clock;eye=state;
    const sn=Math.sin(yaw),cs=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    fx=sn*cp;fy=sp;fz=-cs*cp;rx=cs;rz=sn;ux=-sn*sp;uy=cp;uz=cs*sp;
    const aspect=w/h;
    projection=halfH/Math.min(.75,Math.max(.51,.59/aspect**.16));slope=halfW/projection;
    const body=state.showPlayer?avatar.pose(actor):null;
    playerShadow=body?buildShadow([body],time.sun,100,5.1,[actor.x,actor.y+.8,actor.z]):null;
    sky();surface(surfaces[0],0);
    const dx=4-x,dz=-12-z;
    if(Math.hypot(dx,dz)<53&&dx*fx+dz*fz>-24){
      const moved=reflectionAt&&(Math.hypot(x-reflectionAt.x,y-reflectionAt.y,z-reflectionAt.z)>.28||
        Math.abs(yaw-reflectionAt.yaw)>.040||Math.abs(pitch-reflectionAt.pitch)>.040);
      if(!reflectionAt||moved&&clock-reflectionAt.clock>.19||clock-reflectionAt.clock>1.65){
        drawReflection();reflectionAt={x,y,z,yaw,pitch,clock};
      }
    }else if(reflectionAt){reflection.fill(0);reflectionAt=null;}
    const [a,b,c]=projected;
    for(const ids of [[0,1,2],[0,2,3]]){
      const points=[a,b,c];
      for(let i=0;i<3;i++){const [wx,wz]=waterBounds[ids[i]];project(points[i],wx,WET_LEVEL,wz,0,0);}
      clipAndDraw(a,b,c,-20,1,1,1,1);
    }
    surface(surfaces[1],1);surface(surfaces[2],2);surface(surfaces[3],3);
    if(body)surface([{x:actor.x,z:actor.z,data:body}],1);
    glassPass=true;surface(surfaces[4],4);glassPass=false;
    composite.putImageData(image,0,0);
    context.imageSmoothingEnabled=true;
    context.drawImage(base,0,0,ow,oh);
    renderCost=renderCost*.87+(performance.now()-workStart)*.13;
    if(clock-lastBudgetChange>1.15){
      if(renderCost>57&&budgetScale>.25)budgetScale=Math.max(.23,budgetScale*.75);
      else if(renderCost<31&&budgetScale<1)budgetScale=Math.min(1,budgetScale*1.18);
      lastBudgetChange=clock;
    }
    return true;
  }
  return {
    kind:'software',collision,frame,
    configure(settings){
      if(settings.shadows==='super'&&!detail)detail=buildShadow([...casters,world.grass],time.sun,896,145);
      shade=settings.shadows==='super'?detail:standard;
      quality=settings;
    },
    info(){return {width:canvas.width,height:canvas.height,internalWidth:w,internalHeight:h,superShadows:shade===detail};},
  };
}

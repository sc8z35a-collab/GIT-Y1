import {CANOPY_FIRST,RUNNING_WATER,canopyVisible} from './materials.js';

const unit=v=>{const s=Math.hypot(...v)||1;return v.map(t=>t/s);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

export function buildShadow(meshes,light,size,diameter,origin=[0,0,-4]){
  const sun=unit(light),right=unit(cross([0,1,0],sun)),up=cross(sun,right);
  const half=size*.5,scale=size/diameter;
  const depth=new Float32Array(size*size);
  depth.fill(-Infinity);
  const a=new Float32Array(5),b=new Float32Array(5),c=new Float32Array(5);
  function transform(p,d,i){
    const x=d[i]-origin[0],y=d[i+1]-origin[1],z=d[i+2]-origin[2];
    p[0]=half+scale*(right[0]*x+right[2]*z);
    p[1]=half+scale*(up[0]*x+up[1]*y+up[2]*z);
    p[2]=sun[0]*x+sun[1]*y+sun[2]*z;p[3]=d[i+6];p[4]=d[i+7];
  }
  for(const mesh of meshes)for(let i=0;i<mesh.length;i+=36){
    if(mesh[i+8]===RUNNING_WATER)continue;
    const mask=mesh[i+8]>=CANOPY_FIRST;
    transform(a,mesh,i);transform(b,mesh,i+12);transform(c,mesh,i+24);
    const x0=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0]))),x1=Math.min(size-1,Math.floor(Math.max(a[0],b[0],c[0])));
    const y0=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1]))),y1=Math.min(size-1,Math.floor(Math.max(a[1],b[1],c[1])));
    if(x0>x1||y0>y1)continue;
    const dx=a[0]-c[0],dy=a[1]-c[1],p=b[1]-c[1],q=c[0]-b[0],det=p*dx+q*dy;
    if(Math.abs(det)<.025)continue;
    const d0=p/det,d1=-dy/det,d2=-d0-d1;
    for(let y=y0;y<=y1;y++){
      const xx=x0-c[0],yy=y-c[1];
      let w0=(p*xx+q*yy)/det,w1=(dx*yy-dy*xx)/det,w2=1-w0-w1;
      for(let x=x0;x<=x1;x++,w0+=d0,w1+=d1,w2+=d2){
        if(w0<0||w1<0||w2<0)continue;
        const at=y*size+x,point=w0*a[2]+w1*b[2]+w2*c[2];
        if(point<=depth[at])continue;
        if(mask&&!canopyVisible(w0*a[3]+w1*b[3]+w2*c[3],w0*a[4]+w1*b[4]+w2*c[4]))continue;
        depth[at]=point;
      }
    }
  }
  const bias=size>180?.12:.023;
  function sample(x,y,z){
    x-=origin[0];y-=origin[1];z-=origin[2];
    const u=half+scale*(right[0]*x+right[2]*z),v=half+scale*(up[0]*x+up[1]*y+up[2]*z);
    const i=Math.floor(u),j=Math.floor(v);
    if(i<0||j<0||i>=size-1||j>=size-1)return 1;
    const f=u-i,g=v-j,d=sun[0]*x+sun[1]*y+sun[2]*z+bias,pt=j*size+i;
    const a=(depth[pt]>d?1-f:0)+(depth[pt+1]>d?f:0);
    const b=(depth[pt+size]>d?1-f:0)+(depth[pt+size+1]>d?f:0);
    return 1-.47*(a*(1-g)+b*g);
  }
  return sample;
}

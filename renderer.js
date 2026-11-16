import {createAvatar} from './avatar.js';
import {createCollision} from './collision.js';
import {defaults,renderDimensions} from './graphics.js';
import {SEA_LEVEL} from './land.js';
import {CANOPY_FIRST,MATERIAL_COUNT,RUNNING_WATER,TILE_SIZE,loadMaterialSheets,readMaterialTiles} from './materials.js';
import {spatialMesh,viewPlanes,visible} from './mesh-layout.js';
import {buildWorld, pond, WET_LEVEL} from './world.js';

const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUv;
layout(location=3) in float aMaterial;
layout(location=4) in vec3 aTint;
uniform mat4 uMatrix;
uniform float uClock;
uniform highp int uWind;
out vec3 vPosition;
out vec3 vNormal;
out vec2 vUv;
flat out float vMaterial;
out vec3 vTint;
void main(){
  vec3 p=aPosition;
  if(uWind>0){
    float wind=sin(p.x*.68+p.z*.48+uClock*1.56)+.45*sin(p.z*1.84-uClock*2.18);
    float f=uWind==1?.018*clamp(p.y*.22,0.,2.4):.014;
    p.x+=wind*f;
    p.z+=wind*f*.43;
  }
  vPosition=p;vNormal=aNormal;vUv=aUv;vMaterial=aMaterial;vTint=aTint;
  gl_Position=uMatrix*vec4(p,1.);
}`;

const CORE = `
uniform highp sampler2DArray uTextures;
uniform vec3 uEye;
uniform vec3 uSun;
uniform vec3 uSunColor;
uniform vec3 uSkyTint;
uniform vec3 uMist;
uniform float uClock;
uniform int uReflection;
uniform int uOutputMode;
float hash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
bool visibleLeaf(vec2 uv){
  float edge=1.-length((uv-.5)*vec2(2.04,2.15));
  float flecks=noise(uv*29.)*.56+noise(uv*11.)*.44;
  return edge+(flecks-.49)*.86>=.035&&flecks+edge*.28>=.37;
}
float fog(vec3 p){
  float d=length(p-uEye);
  float variation=clamp(2.*noise(p.xz*.041+vec2(uClock*.006,0.))-1.,-1.,1.);
  float mist=.000050*(1.+variation*.58);
  return 1.-exp(-d*d*mist);
}
vec3 displayColor(vec3 c){
  c=max(vec3(0),c);
  if(uOutputMode==2)return sqrt(c/(1.+c));
  if(uOutputMode==1){
    c*=1.14;
    float l=max(c.r,max(c.g,c.b));
    float shoulder=.64+.36*(1.-exp(-max(0.,l-.64)/.36));
    c*=min(l,shoulder)/max(.0001,l);
    return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));
  }
  return pow(c/(.87+.20*c),vec3(1./2.2));
}
vec3 tex(float material,vec2 uv) {
  return texture(uTextures,vec3(uv.x,-uv.y,material)).rgb;
}
float pondDistance(vec2 p){
  vec2 d=(p-vec2(4.,-12.))/vec2(22.8,18.5);
  float e=.045*sin(p.y*.41+p.x*.086)+.033*cos(p.x*.44-p.y*.24)+.022*sin(p.x*.76+p.y*.28);
  return length(d)-e;
}`;

const WORLD_FRAGMENT = `#version 300 es
precision highp float;
${CORE}
in vec3 vPosition;
in vec3 vNormal;
in vec2 vUv;
flat in float vMaterial;
in vec3 vTint;
uniform highp sampler2DShadow uShadow;
uniform highp sampler2DShadow uNearShadow;
uniform highp sampler2DShadow uPlayerShadow;
uniform mat4 uLightMatrix;
uniform mat4 uNearMatrix;
uniform mat4 uPlayerMatrix;
uniform float uShadowTexel;
uniform float uNearTexel;
uniform bool uSuper;
uniform bool uPlayerCaster;
uniform bool uGlass;
uniform highp int uWind;
out vec4 color;
float parkShadow(vec3 p,vec3 n) {
  vec4 sh=uLightMatrix*vec4(p+n*.041,1.);
  vec3 sc=sh.xyz/sh.w*.5+.5;
  if(sc.x<=0.||sc.x>=1.||sc.y<=0.||sc.y>=1.||sc.z<=0.||sc.z>=1.)return 1.;
  float te=uShadowTexel*1.55;
  float depth=sc.z-.00069;
  return (texture(uShadow,vec3(sc.xy+vec2(-te,-te),depth))+
    texture(uShadow,vec3(sc.xy+vec2(te,-te),depth))+
    texture(uShadow,vec3(sc.xy+vec2(-te,te),depth))+
    texture(uShadow,vec3(sc.xy+vec2(te,te),depth)))*.25;
}
float shadow(vec3 p,vec3 n){
  float shade=parkShadow(p,n);
  if(uSuper){
    vec3 s=(uNearMatrix*vec4(p+n*.026,1.)).xyz*.5+.5;
    float edge=min(min(s.x,s.y),1.-max(s.x,s.y));
    if(edge>.012&&s.z>=0.&&s.z<=1.){
      float stepSize=uNearTexel*(1.22+clamp(length(p-uEye)*.055,.0,2.32));
      float bright=0.;
      for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){
        float weight=(i==0?2.:1.)*(j==0?2.:1.);
        bright+=weight*texture(uNearShadow,vec3(s.xy+stepSize*vec2(float(i),float(j)),s.z-.00041));
      }
      shade=mix(shade,bright/16.,smoothstep(.012,.105,edge));
    }
  }
  if(uPlayerCaster){
    vec3 q=(uPlayerMatrix*vec4(p+n*.011,1.)).xyz*.5+.5;
    if(all(greaterThan(q,vec3(.004)))&&all(lessThan(q,vec3(.996)))){
      const float stepSize=.003;
      float contact=texture(uPlayerShadow,vec3(q.xy+vec2(-stepSize,-stepSize),q.z-.001));
      contact+=texture(uPlayerShadow,vec3(q.xy+vec2(stepSize,-stepSize),q.z-.001));
      contact+=texture(uPlayerShadow,vec3(q.xy+vec2(-stepSize,stepSize),q.z-.001));
      contact+=texture(uPlayerShadow,vec3(q.xy+vec2(stepSize,stepSize),q.z-.001));
      shade=min(shade,contact*.25);
    }
  }
  return shade;
}
vec3 terrain(vec2 p, vec2 tags){
  vec2 p2=mat2(.81,.586,-.586,.81)*p;
  float area=noise(p*.085);
  float flecks=noise(p*1.21);
  vec3 lawn=tex(36.,p*.72), wild=tex(44.,p2*.72);
  vec3 base=mix(lawn,wild,smoothstep(.31,.67,area)*.82);
  float forest=smoothstep(22.,40.,-p.x+area*6.)+smoothstep(27.,47.,-p.y-area*7.);
  if(forest>.01){
    vec3 decay=mix(tex(39.,p*.93),tex(69.,p2*.88),flecks);
    vec3 forestBase=mix(decay,tex(70.,p*.63),smoothstep(.44,.79,area)*.75);
    base=mix(base,forestBase,clamp(forest,0.,1.)*mix(.48,.87,flecks));
  }
  float flower=1.-smoothstep(.34,1.,length((p-vec2(32,19))/vec2(13.,10.)));
  if(flower>.01){
    vec3 blooms=mix(tex(64.,p*.75),tex(67.,p2*.75),smoothstep(.30,.74,flecks));
    base=mix(base,blooms,flower*.72);
  }
  float little=smoothstep(.58,.81,area)*smoothstep(.22,.68,flecks);
  base=mix(base,tex(63.,p2*.95),little*.63);
  vec3 gravel=mix(tex(12.,p*.98),tex(12.,p2*1.71),.47);
  gravel*=.96+area*.19;
  float edge=(flecks-.5)*.49+sin(p.x*3.71+p.y*5.4)*.074+(area-.5)*.7;
  float path=1.-smoothstep(-.58,.58,tags.x+edge);
  base=mix(base,gravel,path);
  base=mix(base,tex(37.,p*.83),smoothstep(.58,.80,area)*smoothstep(.24,.47,1.-abs(tags.x-.4))*(1.-path)*.34);
  if(tags.y<1.17){
    vec3 wet=mix(tex(71.,p*.57)*.79,tex(14.,p2*.58),smoothstep(.21,.78,flecks)*.79);
    vec3 transition=mix(tex(42.,p2*.68),tex(38.,p*.83),smoothstep(.4,.73,area));
    base=mix(base,transition,(1.-smoothstep(1.04,1.17,tags.y))*smoothstep(.3,.68,flecks+.2)*.84);
    base=mix(base,wet,1.-smoothstep(.99,1.065,tags.y));
  }
  return base*mix(.77,1.15,area);
}
void main() {
  if(uReflection==1&&vPosition.y<-.12)discard;
  bool canopy=vMaterial>=${CANOPY_FIRST}.;
  bool running=vMaterial==${RUNNING_WATER}.;
  if(canopy&&!visibleLeaf(vUv))discard;
  vec3 n=normalize(vNormal);
  if(vMaterial>=0. && vMaterial!=40. && uWind!=1 && !gl_FrontFacing) n=-n;
  if(vMaterial==40. || uWind>0) n=normalize(vec3(n.x*.55,abs(n.y)*.7+.43,n.z*.55));
  vec3 p=vPosition;
  vec3 base;
  if(vMaterial==-10.)base=terrain(p.xz,vUv);
  else if(vMaterial<0.)base=vec3(1.);
  else if(canopy)base=tex(vMaterial-${CANOPY_FIRST}.,vUv*1.63)*(.85+noise(vUv*8.)*.37);
  else if(running){
    vec2 flow=vec2(vUv.x+sin(p.z*2.89+uClock*1.92)*.045,vUv.y-uClock*.44);
    base=mix(tex(19.,flow),tex(23.,flow*1.27),.47)*vec3(.83,1.03,1.11)+.067;
  }else base=tex(vMaterial,vUv);
  base*=vTint;
  float direct=max(0.,dot(n,uSun));
  float sh=shadow(p,n);
  float leafLight = (uWind==1?.14:0.)*max(0.,dot(-n,uSun));
  float lift = .21+.27*clamp(n.y*.5+.5,0.,1.);
  if(vMaterial==-10.){
    float dapple=noise(p.xz*.41);
    lift*=mix(.85,1.05,dapple);
  }
  vec3 light=uSkyTint*lift + uSunColor*(direct*.80*mix(.12,1.,sh)+leafLight);
  vec3 rgb=base*light;
  if(uGlass||running||vMaterial==1.||vMaterial==3.||vMaterial==60.||vMaterial==14.||vMaterial==121.||vMaterial==120.){
    vec3 h=normalize(uSun+normalize(uEye-p));
    rgb+=uSunColor*pow(max(0.,dot(n,h)),running?28.:37.)*(running?.88:.235)*sh;
  }
  if(vMaterial==-4.&&base.r>.86&&base.g>.69) rgb+=base*.13;
  rgb=mix(rgb,uMist,fog(p)*.90);
  float alpha=1.;
  if(uGlass){
    float facing=abs(dot(n,normalize(uEye-p)));
    alpha=.22+.33*pow(1.-facing,2.);
    rgb=mix(rgb,vTint*.51,.34);
  }
  color=vec4(displayColor(rgb),alpha);
}`;

const SCREEN_VERTEX = `#version 300 es
out vec2 vScreen;
void main(){
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  vScreen=p*2.-1.;
  gl_Position=vec4(vScreen,1.,1.);
}`;

const SKY_FRAGMENT = `#version 300 es
precision highp float;
${CORE}
in vec2 vScreen;
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uLens;
out vec4 color;
void main(){
  vec3 ray=normalize(uForward+uRight*vScreen.x*uLens.x+uUp*vScreen.y*uLens.y);
  float up=max(0.,ray.y);
  vec3 high=uSkyTint*vec3(.337,.55,.76);
  vec3 rgb=mix(uMist*1.21,high,pow(up,.49));
  float sun=max(0.,dot(ray,uSun));
  rgb+=uSunColor*(pow(sun,15.)*.18+pow(sun,180.)*.29+smoothstep(.99968,.99984,sun)*2.52);
  vec2 cloud=ray.xz/(.53+abs(ray.y))*8.+vec2(uClock*.009,0.);
  float fn=noise(cloud*.65)*.53+noise(cloud*1.54)*.28+noise(cloud*3.13)*.13+noise(cloud*6.05)*.06;
  float cloudMask=smoothstep(.49,.72,fn)*smoothstep(.005,.17,ray.y);
  rgb=mix(rgb,vec3(.84,.83,.73)+uSunColor*.09*pow(sun,4.),cloudMask*.62);
  if(ray.y<0.&&uEye.y>${SEA_LEVEL}.){
    float travel=(uEye.y-(${SEA_LEVEL}.))/max(.00005,-ray.y);
    vec2 p=uEye.xz+ray.xz*travel;
    float close=1.-smoothstep(125.,1250.,travel);
    vec2 ripple=vec2(sin(p.x*.48+p.y*.21+uClock*.63),cos(p.y*.43-p.x*.20-uClock*.53));
    vec3 body=vec3(.027,.126,.168);
    if(close>.01)body=mix(body,tex(18.,p*.031+ripple*.024)*vec3(.66,.98,1.05)+vec3(.022,.085,.10),close*.64);
    float reflectedSun=pow(max(0.,dot(vec3(ray.x,-ray.y,ray.z),uSun)),25.)*.35;
    vec3 ocean=mix(body,uMist*.88,clamp(travel/1090.,.03,.96))+uSunColor*reflectedSun;
    rgb=mix(rgb,ocean,smoothstep(0.,.019,-ray.y));
  }else if(uEye.y<${SEA_LEVEL}.){
    rgb=mix(vec3(.012,.071,.090),rgb,smoothstep(.03,.72,ray.y));
  }
  color=vec4(displayColor(rgb),1.);
}`;

const WATER_FRAGMENT = `#version 300 es
precision highp float;
${CORE}
in vec3 vPosition;
uniform sampler2D uReflected;
uniform mat4 uReflectMatrix;
uniform bool uHasReflection;
out vec4 color;
void main(){
  vec2 p=vPosition.xz;
  float sd=pondDistance(p);
  if(sd>1.004) discard;
  float t=uClock;
  vec2 n1=vec2(sin(p.x*1.09+p.y*2.22+t*1.15),cos(p.x*1.81-p.y*1.15+t*.87));
  vec2 n2=vec2(cos(p.x*4.12-p.y*3.54+t*1.91),sin(p.x*2.14+p.y*4.12-t*2.29));
  vec2 w=n1*.027+n2*.011;
  vec3 N=normalize(vec3(w.x,1.,w.y)),V=normalize(uEye-vPosition),H=normalize(uSun+V);
  float depth=1.-smoothstep(.62,1.,sd);
  vec2 uv=p*.139+w*.43;
  vec3 shallow=tex(19.,uv+vec2(t*.009,-t*.005));
  if(sd>.87)shallow=mix(shallow,tex(79.,p*.54+w*.25)*vec3(.72,.91,1.),smoothstep(.87,.997,sd)*.46);
  vec3 green=tex(26.,uv*.85+vec2(-t*.004,t*.005));
  vec3 deep=tex(18.,uv*.72+vec2(t*.004,t*.002));
  vec3 body=mix(mix(shallow*.77,green*.59,.50),deep*.62+vec3(.016,.040,.042),depth);
  body*=.70+.29*noise(p*.27);
  vec4 projected=uReflectMatrix*vec4(vPosition,1.);
  vec2 reflectedUV=projected.xy/projected.w*.5+.5+w*.27;
  vec3 reflected=uMist*.57;
  if(uHasReflection && all(greaterThan(reflectedUV,vec2(.008))) && all(lessThan(reflectedUV,vec2(.992)))) {
    reflected=pow(texture(uReflected,reflectedUV).rgb,vec3(2.2));
  }
  float fresnel=pow(1.-max(0.,dot(V,N)),3.2);
  vec3 result=mix(body,reflected,.22+.66*fresnel);
  float specular=pow(max(0.,dot(N,H)),156.);
  result+=uSunColor*specular*(uOutputMode==0?.62+depth*.25:1.43+depth*.41);
  float stripes=.5+.5*sin(p.x*2.6+p.y*4.1+t*2.7+n1.x*.8);
  result+=uSkyTint*.055*pow(stripes,5.)*fresnel;
  vec3 foam=tex(23.,p*.28+vec2(.0,t*.018));
  result+=foam*.19*smoothstep(.956,1.0,sd)*smoothstep(.25,.72,noise(p*.55));
  result=mix(result,uMist,fog(vPosition)*.77);
  color=vec4(displayColor(result),1.);
}`;

const SHADOW_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=2) in vec2 aUv;
layout(location=3) in float aMaterial;
uniform mat4 uMatrix;
out vec2 vUv;
flat out float vMaterial;
void main(){vUv=aUv;vMaterial=aMaterial;gl_Position=uMatrix*vec4(aPosition,1.);}
`;
const SHADOW_FRAGMENT = `#version 300 es
precision highp float;
${CORE}
in vec2 vUv;
flat in float vMaterial;
void main(){
  if(vMaterial>=${CANOPY_FIRST}.&&!visibleLeaf(vUv))discard;
  if(vMaterial==${RUNNING_WATER}.)discard;
}
`;

function makeProgram(gl,vs,fs) {
  function compile(type,source) {
    const out=gl.createShader(type);
    gl.shaderSource(out,source);gl.compileShader(out);
    if(!gl.getShaderParameter(out,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(out));
    return out;
  }
  const program=gl.createProgram(), vertex=compile(gl.VERTEX_SHADER,vs), fragment=compile(gl.FRAGMENT_SHADER,fs);
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  const uniforms={};
  for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++) {
    const {name}=gl.getActiveUniform(program,i);
    uniforms[name]=gl.getUniformLocation(program,name);
  }
  return {program,uniforms};
}

function unit(v) {
  const n=Math.hypot(...v)||1;
  return v.map(x=>x/n);
}
function dot(a,b) {return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b) {return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function multiply(a,b) {
  const o=new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++) {
    for(let n=0;n<4;n++) o[c*4+r]+=a[n*4+r]*b[c*4+n];
  }
  return o;
}
function camera(eye, forward) {
  const f=unit(forward), right=unit(cross(f,[0,1,0])), up=cross(right,f), behind=f.map(v=>-v);
  return {right,up,forward:f,matrix:new Float32Array([
    right[0],up[0],behind[0],0,
    right[1],up[1],behind[1],0,
    right[2],up[2],behind[2],0,
    -dot(right,eye),-dot(up,eye),-dot(behind,eye),1,
  ])};
}
function perspective(aspect,lens,near,far) {
  return new Float32Array([
    1/(aspect*lens),0,0,0, 0,1/lens,0,0,
    0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0,
  ]);
}
function orthographic(size, near, far) {
  return new Float32Array([1/size,0,0,0,0,1/size,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);
}

const LIGHTING = Object.freeze({sun:unit([-0.48,.69,-.46]),light:[.99,.91,.70],sky:[.79,.91,.99],mist:[.38,.47,.43]});

async function loadTextures(gl){
  const sheets=await loadMaterialSheets();
  const out=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,out);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1+Math.floor(Math.log2(TILE_SIZE)),gl.SRGB8_ALPHA8,TILE_SIZE,TILE_SIZE,MATERIAL_COUNT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.MIRRORED_REPEAT);
  const anisotropic=gl.getExtension('EXT_texture_filter_anisotropic');
  if(anisotropic)gl.texParameterf(gl.TEXTURE_2D_ARRAY,anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
    Math.min(6,gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  readMaterialTiles(sheets,(i,pixels)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,TILE_SIZE,TILE_SIZE,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels));
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
}

function upload(gl,data,split=false,dynamic=false){
  const spatial=split?spatialMesh(data):{vertices:data,ranges:[]};
  const vao=gl.createVertexArray(),buffer=gl.createBuffer();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,spatial.vertices,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
  let offset=0;
  for(const [i,size] of [3,3,2,1,3].entries()){
    gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,48,offset);offset+=size*4;
  }
  gl.bindVertexArray(null);
  return {vao,buffer,count:data.length/12,ranges:spatial.ranges};
}
function shadowTarget(gl,size,unit) {
  const fbo=gl.createFramebuffer(),texture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,size,size,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);
  gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if(!ok) throw new Error('Shadow framebuffer unavailable');
  return {fbo,size};
}
function reflectionTarget(gl,w,h,old) {
  if(old) {gl.deleteFramebuffer(old.fbo);gl.deleteTexture(old.texture);gl.deleteRenderbuffer(old.depth);}
  const fbo=gl.createFramebuffer(),texture=gl.createTexture(),depth=gl.createRenderbuffer();
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
  gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return {fbo,texture,depth,w,h,ok,matrix:null};
}

export async function createRenderer(canvas) {
  const mobile=matchMedia('(pointer:coarse)').matches;
  const gl=canvas.getContext('webgl2',{antialias:!mobile,alpha:false,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL 2 is unavailable');
  const world=makeProgram(gl,VERTEX,WORLD_FRAGMENT);
  const sky=makeProgram(gl,SCREEN_VERTEX,SKY_FRAGMENT);
  const water=makeProgram(gl,VERTEX,WATER_FRAGMENT);
  const shadow=makeProgram(gl,SHADOW_VERTEX,SHADOW_FRAGMENT);
  await loadTextures(gl);

  function prepare(){
    const data=buildWorld({economy:mobile});
    const collision=createCollision(data);
    const meshes=Object.fromEntries(Object.entries(data).map(([key,vertices])=>[key,upload(gl,vertices,key!=='water'&&key!=='glass')]));
    return {meshes,collision};
  }
  const {meshes,collision}=prepare(),avatar=createAvatar(),time=LIGHTING;
  const first={x:5,y:0,z:25.5,bodyYaw:0,speed:0,phase:0,grounded:true,swimming:false,vy:0};
  meshes.avatar=upload(gl,avatar.pose(first),false,true);
  const far=shadowTarget(gl,mobile?1192:1792,1),actorShadow=shadowTarget(gl,384,4);
  let near,nearMatrix,nearFocus,actorMatrix,reflected,reflectedAt,lastReflection=0;
  let quality={...defaults},mode=0,superAvailable=true;
  const screen=gl.createVertexArray();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);

  function draw(name,planes=null){
    const item=meshes[name];
    gl.bindVertexArray(item.vao);
    if(planes&&item.ranges.length){
      for(const range of item.ranges)if(visible(range,planes))gl.drawArrays(gl.TRIANGLES,range.offset,range.count);
    }else gl.drawArrays(gl.TRIANGLES,0,item.count);
  }
  function depthView(target,focus,extent,parts,distance,detail=false){
    const eye=time.sun.map((x,i)=>focus[i]+x*distance);
    const matrix=multiply(orthographic(extent,.25,distance*2.03),camera(eye,time.sun.map(x=>-x)).matrix);
    const planes=detail?viewPlanes(matrix):null;
    gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.viewport(0,0,target.size,target.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(detail?1.07:1.35,1.75);
    gl.useProgram(shadow.program);gl.uniformMatrix4fv(shadow.uniforms.uMatrix,false,matrix);
    for(const name of parts)draw(name,planes);
    gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return matrix;
  }
  const farMatrix=depthView(far,[0,0,-5],73,['solid','terrain','leaf'],113);
  function detailShadow(state){
    if(quality.shadows!=='super'||!superAvailable)return;
    if(!near){
      try{near=shadowTarget(gl,Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),mobile?2048:3072),3);}
      catch{superAvailable=false;return;}
    }
    if(!nearFocus||Math.hypot(state.x-nearFocus[0],state.z-nearFocus[2])>9.3){
      nearFocus=[Math.round(state.x/5)*5,Math.max(1.35,state.y),Math.round(state.z/5)*5];
      nearMatrix=depthView(near,nearFocus,29,['solid','terrain','leaf','grass'],104,true);
      reflectedAt=null;
    }
  }
  function environment(u,eye,clock,output){
    gl.uniform3fv(u.uEye??null,eye);gl.uniform3fv(u.uSun,time.sun);
    gl.uniform3fv(u.uSunColor,time.light);gl.uniform3fv(u.uSkyTint,time.sky);
    gl.uniform3fv(u.uMist,time.mist);gl.uniform1f(u.uClock,clock);gl.uniform1i(u.uTextures??null,0);
    gl.uniform1i(u.uOutputMode,output);
  }
  function lightWorld(eye,matrix,clock,mirror){
    gl.useProgram(world.program);
    const u=world.uniforms;
    environment(u,eye,clock,mirror?0:mode);
    gl.uniformMatrix4fv(u.uMatrix,false,matrix);gl.uniformMatrix4fv(u.uLightMatrix,false,farMatrix);
    gl.uniform1i(u.uShadow,1);gl.uniform1f(u.uShadowTexel,1/far.size);
    const detail=quality.shadows==='super'&&Boolean(nearFocus);
    gl.uniform1i(u.uSuper,detail?1:0);gl.uniform1i(u.uNearShadow,detail?3:1);
    gl.uniformMatrix4fv(u.uNearMatrix,false,detail?nearMatrix:farMatrix);
    gl.uniform1f(u.uNearTexel,1/(detail?near.size:far.size));
    gl.uniformMatrix4fv(u.uPlayerMatrix,false,actorMatrix);
    gl.uniform1i(u.uPlayerShadow,4);gl.uniform1i(u.uPlayerCaster,mirror?0:1);
    gl.uniform1i(u.uReflection,mirror?1:0);
    gl.uniform1i(u.uGlass,0);
    return u;
  }
  function scene(eye,view,projection,lensX,lensY,clock,mirror,showPlayer){
    const matrix=multiply(projection,view.matrix),planes=viewPlanes(matrix);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.useProgram(sky.program);
    const su=sky.uniforms;
    environment(su,eye,clock,mirror?0:mode);
    gl.uniform3fv(su.uForward,view.forward);gl.uniform3fv(su.uRight,view.right);gl.uniform3fv(su.uUp,view.up);
    gl.uniform2f(su.uLens,lensX,lensY);
    gl.bindVertexArray(screen);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);
    const u=lightWorld(eye,matrix,clock,mirror);
    gl.uniform1i(u.uWind,0);
    if(!showPlayer)gl.uniform1i(u.uPlayerCaster,0);
    draw('solid',planes);if(showPlayer)draw('avatar');
    if(!mirror)draw('terrain',planes);
    gl.uniform1i(u.uWind,1);draw('leaf',planes);
    if(!mirror){gl.uniform1i(u.uWind,2);draw('grass',planes);}
    return matrix;
  }
  function frame(state){
    const {x,y,z,yaw,pitch,clock,actor}=state;
    const {width:w,height:h}=renderDimensions(canvas.clientWidth,canvas.clientHeight,quality,mobile,devicePixelRatio||1);
    if(canvas.width!==w||canvas.height!==h||!reflected){
      canvas.width=w;canvas.height=h;
      const scale=Math.min(.44,(mobile?390:610)/Math.max(w,h));
      reflected=reflectionTarget(gl,Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)),reflected);
      reflectedAt=null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,meshes.avatar.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,avatar.pose(actor));
    actorMatrix=depthView(actorShadow,[actor.x,actor.y+.76,actor.z],2.45,['avatar'],7,true);
    detailShadow(state);
    const eye=[x,y,z],f=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
    const aspect=w/h,lens=Math.min(.75,Math.max(.51,.59/aspect**.16)),projection=perspective(aspect,lens,.073,172);
    const ax=pond.x-x,az=pond.z-z;
    const mirror=reflected.ok&&y>WET_LEVEL&&Math.hypot(ax,az)<59&&ax*f[0]+az*f[2]>-27;
    const moved=!reflectedAt||Math.hypot(x-reflectedAt.x,z-reflectedAt.z)>.17||Math.abs(yaw-reflectedAt.yaw)>.027||Math.abs(pitch-reflectedAt.pitch)>.024;
    if(mirror&&(!reflectedAt||moved&&clock-lastReflection>.044||clock-lastReflection>1.4)){
      gl.bindFramebuffer(gl.FRAMEBUFFER,reflected.fbo);gl.viewport(0,0,reflected.w,reflected.h);
      const other=[x,WET_LEVEL*2-y,z];
      reflected.matrix=scene(other,camera(other,[f[0],-f[1],f[2]]),projection,lens*aspect,lens,clock,true,state.showPlayer);
      reflectedAt={x,z,yaw,pitch};lastReflection=clock;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
    const matrix=scene(eye,camera(eye,f),projection,lens*aspect,lens,clock,false,state.showPlayer);
    gl.useProgram(water.program);
    const u=water.uniforms;
    environment(u,eye,clock,mode);
    gl.uniformMatrix4fv(u.uMatrix,false,matrix);gl.uniformMatrix4fv(u.uReflectMatrix,false,reflected.matrix||matrix);
    gl.uniform1i(u.uWind,0);gl.uniform1i(u.uReflected,2);gl.uniform1i(u.uHasReflection,mirror&&reflected.matrix?1:0);
    draw('water');
    const glass=lightWorld(eye,matrix,clock,false);
    gl.uniform1i(glass.uPlayerCaster,state.showPlayer?1:0);gl.uniform1i(glass.uGlass,1);gl.uniform1i(glass.uWind,0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    draw('glass');gl.depthMask(true);gl.disable(gl.BLEND);
    return true;
  }
  return {
    kind:'webgl',collision,frame,
    configure(value,native=false){
      if(value.shadows!==quality.shadows){nearFocus=null;reflectedAt=null;}
      quality=value;mode=value.hdr?(native?2:1):0;
    },
    info(){return {width:canvas.width,height:canvas.height,internalWidth:canvas.width,internalHeight:canvas.height,superShadows:quality.shadows==='super'&&superAvailable};},
  };
}

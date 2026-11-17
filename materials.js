export const TILE_SIZE = 28;
export const SMALL_TILE_SIZE = 14;
export const BASE_MATERIAL_COUNT = 151;
// 151–287 are reserved for the existing source archive.
export const EXPLORATION_FIRST = 288;
export const EXPLORATION_SHEETS = 14;
export const MATERIAL_COUNT = BASE_MATERIAL_COUNT + EXPLORATION_SHEETS * 9;
export const CANOPY_FIRST = 512;
export const RUNNING_WATER = 511;

export const material = Object.freeze({
  teak:72, burntWood:73, endGrain:74, castIron:75, rope:76, grating:77, cobbles:78, pondPebbles:79, rivets:80,
  steppingStone:81, rakedGravel:82, wetBasalt:83, granite:84, bamboo:85, lattice:86, shingles:87, cushionMoss:88, riverGravel:89,
  greenSteel:90, brick:91, frosted:92, flutedGlass:93, terracotta:94, pottingSoil:95, pumice:96, pine:97, sageTile:98,
  limestone:99, roseGranite:100, fanPavers:101, rainStone:102, relief:103, bronze:104, limewash:105, darkOak:106, mosaic:107,
  iris:108, whiteClover:109, hosta:110, azalea:111, hydrangea:112, redMaple:113, pampas:114, lavender:115, mossBark:116,
  aggregate:117, plaster:118, rubber:119, hammeredCopper:120, brass:121, blueEnamel:122, perforated:123, ceramic:124, oak:125,
  greenMaple:126, oakLeaf:127, aspen:128, willow:129, camellia:130, velvetMoss:131, starMoss:132, basaltMoss:133, barkMoss:134,
  ivy:135, creeper:136, wisteria:137, creepingFig:138, fern:139, wildStrawberry:140, beachGrass:141, plantain:142,
  mugwort:143, coastalClover:144, mustard:145, switchgrass:146, chard:147, kale:148, cabbage:149, rice:150,
});

// The two atlases have 12 columns. IDs here identify detail-sized surfaces
// such as foliage, fittings and small props.
const small = new Set([
  7,31,32,33,40,47,53,61,62,65,66,68,74,76,77,80,88,103,104,108,109,
  110,111,112,113,114,115,116,119,120,121,123,126,127,128,129,130,131,
  132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,
  315,316,317,319,320,321,322,323,334,336,337,338,339,340,341,
  351,352,353,354,355,356,357,358,359,369,370,371,374,375,376,382,383,
  400,401,403,408,409,411,
]);
const materialIds = Array.from({length:MATERIAL_COUNT},(_,i)=>
  i<BASE_MATERIAL_COUNT?i:EXPLORATION_FIRST+i-BASE_MATERIAL_COUNT);
export const ATLAS_COLS = 12;
export const textureGroups = [
  {file:'tiles-large.webp',size:TILE_SIZE,ids:materialIds.filter(id=>!small.has(id))},
  {file:'tiles-small.webp',size:SMALL_TILE_SIZE,ids:materialIds.filter(id=>small.has(id))},
];

export async function loadMaterialSheets(){
  return Promise.all(textureGroups.map(async group=>{
    const {file,size,ids}=group;
    const image=new Image();
    image.src=new URL(`assets/${file}`,import.meta.url);
    await image.decode();
    if(image.naturalWidth!==size*ATLAS_COLS||
       image.naturalHeight!==size*Math.ceil(ids.length/ATLAS_COLS)){
      throw new Error(`Invalid texture atlas: ${file}`);
    }
    return {image,...group};
  }));
}

export function readMaterialTiles({image,size,ids},each){
  const staging=document.createElement('canvas');
  staging.width=image.naturalWidth;staging.height=image.naturalHeight;
  const ctx=staging.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  ids.forEach((id,layer)=>{
    const x=layer%ATLAS_COLS*size,y=Math.floor(layer/ATLAS_COLS)*size;
    each(id,ctx.getImageData(x,y,size,size).data,layer);
  });
}

const sharpness=128;
const fract=x=>x-Math.floor(x);
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function noise(x,y) {
  const i=Math.floor(x),j=Math.floor(y),a=fract(x),b=fract(y),f=a*a*(3-2*a),g=b*b*(3-2*b);
  return ((1-f)*hash(i,j)+f*hash(i+1,j))*(1-g)+((1-f)*hash(i,j+1)+f*hash(i+1,j+1))*g;
}
export const canopyMask=(()=>{
  const out=new Uint8Array(sharpness*sharpness);
  for(let j=0;j<sharpness;j++)for(let i=0;i<sharpness;i++){
    const u=i/(sharpness-1),v=j/(sharpness-1);
    const edge=1-Math.hypot((u-.5)*2.04,(v-.5)*2.15),specks=noise(u*29,v*29)*.56+noise(u*11,v*11)*.44;
    if(edge+(specks-.49)*.86>=.035&&specks+edge*.28>=.37)out[j*sharpness+i]=1;
  }
  return out;
})();
export function canopyVisible(u,v) {
  return canopyMask[Math.round(Math.min(1,Math.max(0,v))*(sharpness-1))*sharpness+Math.round(Math.min(1,Math.max(0,u))*(sharpness-1))]===1;
}

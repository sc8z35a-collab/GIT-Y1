export const TILE_SIZE = 85;
export const SHEET_COUNT = 17;
export const MATERIAL_COUNT = 151;
export const CANOPY_FIRST = 200;
export const RUNNING_WATER = 160;

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

export async function loadMaterialSheets(){
  return Promise.all(Array.from({length:SHEET_COUNT},async (_,i)=>{
    const image=new Image();
    image.src=new URL(`assets/tiles-${String(i).padStart(2,'0')}.webp`,import.meta.url);
    await image.decode();
    if(image.naturalWidth!==TILE_SIZE*3||image.naturalHeight!==TILE_SIZE*3)
      throw new Error('Invalid texture atlas');
    return image;
  }));
}
export function readMaterialTiles(sheets,each){
  const staging=document.createElement('canvas');
  staging.width=staging.height=TILE_SIZE*3;
  const ctx=staging.getContext('2d',{willReadFrequently:true});
  sheets.forEach((image,sheet)=>{
    ctx.drawImage(image,0,0);
    for(let n=0;n<9&&sheet*9+n<MATERIAL_COUNT;n++)
      each(sheet*9+n,ctx.getImageData(n%3*TILE_SIZE,Math.floor(n/3)*TILE_SIZE,TILE_SIZE,TILE_SIZE).data);
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

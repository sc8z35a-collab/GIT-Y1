export const defaults=Object.freeze({resolution:'auto',fps:60,hdr:false,shadows:'standard'});
export function normalizeGraphics(v){
  return {resolution:v?.resolution==='1.5k'?'1.5k':'auto',fps:Number(v?.fps)===120?120:60,
    hdr:v?.hdr===true||v?.hdr==='on',shadows:v?.shadows==='super'?'super':'standard'};
}
export function renderDimensions(w,h,quality,mobile,dpr=1){
  w=Math.max(1,w);h=Math.max(1,h);
  const budget=mobile?(quality.fps===120?720000:920000):(quality.fps===120?1180000:1510000);
  const f=quality.resolution==='1.5k'?Math.min(1440/Math.min(w,h),2560/Math.max(w,h)):
    Math.min(dpr,mobile?1.23:1.42,Math.sqrt(budget/(w*h)));
  return {width:Math.max(1,Math.round(w*f)),height:Math.max(1,Math.round(h*f))};
}
export function createFramePacer(){
  let next=null,lastRate=0;
  return (time,rate)=>{
    const step=1000/rate;
    if(next===null||lastRate!==rate||time-next>220)next=time;
    lastRate=rate;
    if(time+.85<next)return false;
    next+=step;
    if(next<=time)next=time+step;
    return true;
  };
}

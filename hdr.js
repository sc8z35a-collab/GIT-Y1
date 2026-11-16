const shaderSource=`
@vertex fn v(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(p[i],0,1);
}
@group(0) @binding(0) var image:texture_2d<f32>;
@fragment fn f(@builtin(position) p:vec4f)->@location(0) vec4f {
  let byte=textureLoad(image,vec2i(p.xy),0).rgb;
  let v0=byte*byte;
  let linear=v0/max(vec3f(.024),vec3f(1)-v0);
  let l=max(linear.r,max(linear.g,linear.b));
  let peak=.83+2.95*(1.0-exp(-max(0.0,l-.83)/2.95));
  let c=linear*(min(l,peak)/max(.0001,l));
  return vec4f(select(12.92*c,1.055*pow(c,vec3f(1.0/2.4))-vec3f(.055),c>vec3f(.0031308)),1);
}
`;
export async function createHdrOutput(canvas,onLoss){
  const adapter=await navigator.gpu?.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)return null;
  const device=await adapter.requestDevice(),context=canvas.getContext('webgpu');
  if(!context){device.destroy();return null;}
  let pipeline;
  device.pushErrorScope('validation');
  try{
    context.configure({device,format:'rgba16float',colorSpace:'srgb',alphaMode:'opaque',toneMapping:{mode:'extended'}});
    const shader=device.createShaderModule({code:shaderSource});
    pipeline=await device.createRenderPipelineAsync({layout:'auto',
      vertex:{module:shader,entryPoint:'v'},fragment:{module:shader,entryPoint:'f',targets:[{format:'rgba16float'}]}});
  }catch{}
  const unavailable=await device.popErrorScope()||!pipeline||
    (context.getConfiguration&&!['extended'].includes(context.getConfiguration()?.toneMapping?.mode));
  if(unavailable){context.unconfigure();device.destroy();return null;}
  let texture,bindings,w=0,h=0,lost=false;
  function fail(){if(lost)return;lost=true;canvas.hidden=true;onLoss();}
  device.lost.then(fail);
  device.addEventListener('uncapturederror',event=>{event.preventDefault();fail();});
  return {
    present(source){
      if(lost)return false;
      if(w!==source.width||h!==source.height){
        w=canvas.width=source.width;h=canvas.height=source.height;
        texture?.destroy();
        texture=device.createTexture({size:[w,h],format:'rgba8unorm',
          usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
        bindings=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()}]});
      }
      device.queue.copyExternalImageToTexture({source},{texture,colorSpace:'srgb'},[w,h]);
      const encoder=device.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',clearValue:[0,0,0,1],storeOp:'store'}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);pass.end();
      device.queue.submit([encoder.finish()]);
      canvas.hidden=false;
      return true;
    },
    hide(){canvas.hidden=true;},
  };
}

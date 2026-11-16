export function spatialMesh(data,cell=22){
  const groups=new Map();
  const groupAt=i=>Math.floor((data[i]+data[i+12]+data[i+24])/(3*cell))
    +256*Math.floor((data[i+2]+data[i+14]+data[i+26])/(3*cell));
  for(let i=0;i<data.length;i+=36){
    const id=groupAt(i);
    let group=groups.get(id);
    if(!group){
      group={offset:0,count:0,cursor:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
      groups.set(id,group);
    }
    group.count+=3;
    for(let v=0;v<36;v+=12)for(let k=0;k<3;k++){
      const x=data[i+v+k];
      if(x<group.min[k])group.min[k]=x;
      if(x>group.max[k])group.max[k]=x;
    }
  }
  let offset=0;
  for(const g of groups.values()){g.offset=offset;g.cursor=offset*12;offset+=g.count;}
  const vertices=new Float32Array(data.length);
  for(let i=0;i<data.length;i+=36){
    const g=groups.get(groupAt(i));
    for(let k=0;k<36;k++)vertices[g.cursor++]=data[i+k];
  }
  const ranges=Array.from(groups.values(),({offset,count,min,max})=>({offset,count,
    center:min.map((x,k)=>(x+max[k])*.5),radius:Math.hypot(max[0]-min[0],max[1]-min[1],max[2]-min[2])*.5+.05}));
  return {vertices,ranges};
}
export function viewPlanes(matrix){
  const result=[];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const v=[3,7,11,15].map(i=>matrix[i]+sign*matrix[i-3+axis]),scale=Math.hypot(v[0],v[1],v[2]);
    result.push(v.map(x=>x/scale));
  }
  return result;
}
export function visible({center,radius},planes){
  return planes.every(p=>p[0]*center[0]+p[1]*center[1]+p[2]*center[2]+p[3]>=-radius);
}

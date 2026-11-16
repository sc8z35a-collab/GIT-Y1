export const parkBoundary=Object.freeze({x:64,z:57});
export const cliff=Object.freeze({x:parkBoundary.x+1,z:parkBoundary.z+1});
export const SEA_LEVEL=-28;
export const LAKE_LEVEL=-.13;

export function onIsland(x,z){
  return Math.abs(x)<=cliff.x&&Math.abs(z)<=cliff.z;
}

export function cliffWall(mesh,height) {
  const corners=[[-cliff.x,-cliff.z],[cliff.x,-cliff.z],[cliff.x,cliff.z],[-cliff.x,cliff.z]];
  const textures=[13,11,83,133,15,10,9,14];
  for(let side=0;side<4;side++){
    const a=corners[side],b=corners[(side+1)%4], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const segments=Math.ceil(length/1.8);
    const nx=[0,1,0,-1][side],nz=[-1,0,1,0][side],rows=9;
    const ring=[];
    for(let j=0;j<=segments;j++){
      const f=j/segments,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
      const crust=height(x,z);
      const points=[];
      const joint=(j===0||j===segments)?0:Math.sin(j*.62+side*2.5)*.76+Math.sin(j*1.83)*.43;
      for(let k=0;k<=rows;k++){
        const t=k/rows;
        const shelf=(j===0||j===segments?0:(k===0?0:Math.sin(t*12+joint*1.7)*.47+joint)*Math.min(1,t*3)+t*.54);
        const y=crust+(SEA_LEVEL-8-crust)*t+Math.sin(t*5.8)*joint*.23;
        points.push([x+nx*shelf,y,z+nz*shelf]);
      }
      ring.push(points);
    }
    for(let j=0;j<segments;j++)for(let k=0;k<rows;k++){
      const seed=(j*31+k*17+side*53)%97;
      const material=k<3&&seed%3===0?11:k<5&&seed%7===0?133:k>6?14:textures[seed%textures.length];
      const shade=.78+.19*Math.sin(j*.96+k*2.26)**2, uv=j*.67,v=k*1.64;
      mesh.quad(ring[j][k],ring[j][k+1],ring[j+1][k+1],ring[j+1][k],material,[shade*.86,shade*.92,shade*.95],[[uv,v],[uv,v+1.64],[uv+.67,v+1.64],[uv+.67,v]]);
    }
  }
}

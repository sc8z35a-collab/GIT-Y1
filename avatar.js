import {Mesh} from './world.js';
const cloth=[.16,.33,.32],seams=[.23,.42,.38],trousers=[.31,.34,.29];
const skin=[.76,.58,.44], boot=[.18,.15,.12],backpack=[.65,.50,.28];

function torso(g){
  g.orb(0,1.062,.015,.203,.348,.128,-4,cloth,6,10,.025);
  g.orb(0,1.28,-.01,.211,.144,.128,-4,seams,4,10,.021);
  g.box(0,.791,0,.312,.077,.21,-4,[.21,.25,.22]);
  g.tube([0,1.355,0],[0,1.489,0],.075,.061,-4,seams,8);
  g.box(0,1.108,-.125,.025,.40,.018,-4,[.39,.46,.39]);
  g.orb(0,1.13,.158,.165,.245,.115,-4,backpack,6,12,.047);
  g.box(0,1.10,.249,.214,.17,.046,-4,[.52,.39,.24]);
  g.tube([-.123,1.315,-.1],[-.135,1.012,-.127],.020,.018,-4,[.42,.35,.25],5);
  g.tube([.123,1.315,-.1],[.135,1.012,-.127],.020,.018,-4,[.42,.35,.25],5);
  g.box(0,1.075,.278,.155,.012,.012,-4,[.84,.72,.50]);
  g.tube([-.06,1.371,.148],[.06,1.371,.148],.018,.019,-4,[.43,.33,.19],6);
}
function head(g){
  g.orb(0,1.566,-.006,.117,.137,.112,-4,skin,7,12,.013);
  g.orb(0,1.658,.016,.123,.073,.114,-4,[.21,.17,.13],5,11,.024);
  g.orb(0,1.668,.004,.134,.070,.134,-4,[.28,.33,.26],5,12,.026);
  g.box(0,1.64,-.125,.182,.018,.130,-4,[.28,.33,.26]);
  g.orb(0,1.563,-.11,.023,.030,.026,-4,skin,3,6,.016);
  for(const side of [-1,1]){
    g.orb(side*.107,1.563,.003,.023,.041,.027,-4,skin,3,7,.020);
    g.box(side*.050,1.596,-.107,.029,.010,.010,-4,[.19,.16,.13]);
  }
}
function arm(g,side){
  const x=side*.214;
  g.tube([x,1.307,0],[x+side*.032,1.116,.018],.079,.055,-4,cloth,8);
  g.tube([x+side*.032,1.119,.018],[x+side*.040,.931,-.019],.056,.041,-4,cloth,8);
  g.tube([x+side*.038,.977,-.005],[x+side*.041,.937,-.022],.042,.043,-4,[.19,.30,.28],7);
  g.orb(x+side*.041,.914,-.020,.041,.055,.038,-4,skin,5,8,.023);
}
function leg(g,side){
  const x=side*.101;
  g.tube([x,.798,0],[x+side*.010,.423,.018],.086,.062,-4,trousers,8);
  g.tube([x+side*.010,.423,.018],[x+side*.014,.131,.005],.062,.047,-4,trousers,8);
  g.orb(x+side*.014,.090,-.059,.066,.071,.126,-4,boot,5,9,.026);
  g.box(x+side*.014,.028,-.066,.129,.035,.237,-4,[.10,.095,.085],0);
}

export function createAvatar(){
  const pieces=[];
  function part(draw,side,kind,pivot){
    const mesh=new Mesh();draw(mesh,side);pieces.push({vertices:mesh.packed(),side,kind,pivot});
  }
  part(torso,0,'body',0);part(head,0,'head',1.45);
  for(const s of [-1,1]){
    part(arm,s,'arm',1.30);part(leg,s,'leg',.78);
  }
  const result=new Float32Array(pieces.reduce((size,p)=>size+p.vertices.length,0));
  return {
    pose(actor){
      let offset=0;
      const yaw=actor.bodyYaw,cs=Math.cos(yaw),sn=Math.sin(yaw);
      const pace=Math.min(1,actor.speed/3.25);
      const swim=actor.swimming, jump=actor.grounded||swim?0:Math.max(-.11,Math.min(.36,actor.vy*.071));
      for(const {vertices,side,kind,pivot} of pieces){
        let angle=0;
        if(kind==='arm')angle=Math.sin(actor.phase)*side*pace*.53+jump+(swim?-.82:0);
        if(kind==='leg')angle=-Math.sin(actor.phase)*side*pace*.48-jump*.61+(swim?.34:0);
        const sa=Math.sin(angle),ca=Math.cos(angle);
        const bob=Math.abs(Math.sin(actor.phase))*pace*.027;
        for(let i=0;i<vertices.length;i+=12){
          const x=vertices[i],y=vertices[i+1]-pivot,z=vertices[i+2];
          const yp=y*ca-z*sa+pivot+bob,zp=y*sa+z*ca;
          result[offset]=actor.x+x*cs-zp*sn;
          result[offset+1]=actor.y+yp;
          result[offset+2]=actor.z+x*sn+zp*cs;
          const nx=vertices[i+3],ny=vertices[i+4],nz=vertices[i+5];
          const ny2=ny*ca-nz*sa,nz2=ny*sa+nz*ca;
          result[offset+3]=nx*cs-nz2*sn;result[offset+4]=ny2;result[offset+5]=nx*sn+nz2*cs;
          for(let j=6;j<12;j++)result[offset+j]=vertices[i+j];
          offset+=12;
        }
      }
      return result;
    },
  };
}

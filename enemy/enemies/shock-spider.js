import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,capsule,diamond,bodyMaterial,makeMaterial,THREE}=ctx;
  const carapace=makeMaterial(0x56399a,.2,.42);
  const carapaceLight=makeMaterial(0x9c7de4,.28,.38);
  const chitin=makeMaterial(0x10101c,.035,.58);
  const jointMetal=makeMaterial(0x29314d,.08,.74);
  const conductor=makeMaterial(0x8797b7,.18,.7);
  const electric=new THREE.MeshBasicMaterial({color:0x9a7cff});
  const electricWhite=new THREE.MeshBasicMaterial({color:0xe4dcff});
  const danger=new THREE.MeshBasicMaterial({color:0xff496c});
  const up=new THREE.Vector3(0,1,0);

  const attach=(rig,member)=>{
    rig.attach(member);
    member.userData.basePosition=member.position.clone();member.userData.baseRotation=member.rotation.clone();member.userData.baseScale=member.scale.clone();
  };
  const makeRig=(name,position,members=[])=>{
    const node=new THREE.Group();node.name=name;node.position.set(...position);ctx.group.add(node);
    members.forEach((member)=>attach(node,member));
    node.userData.basePosition=node.position.clone();node.userData.baseRotation=node.rotation.clone();node.userData.baseScale=node.scale.clone();
    return node;
  };
  const glow=(geometry,material,scale,position,rotation=[0,0,0],name="glow")=>{
    const mesh=add(geometry,material,scale,position,rotation,name);
    if(!parts.glows.includes(mesh))parts.glows.push(mesh);
    return mesh;
  };
  const segment=(start,end,radius,material,name)=>{
    const direction=new THREE.Vector3().subVectors(end,start),length=direction.length(),midpoint=new THREE.Vector3().addVectors(start,end).multiplyScalar(.5);
    const mesh=add(cylinder,material,[radius,length,radius],midpoint.toArray(),[0,0,0],name);
    mesh.quaternion.setFromUnitVectors(up,direction.normalize());
    mesh.userData.baseRotation=mesh.rotation.clone();mesh.userData.baseScale=mesh.scale.clone();
    return mesh;
  };

  // Layered abdomen with a contained electrostatic generator.
  const abdomen=[];
  abdomen.push(add(capsule,chitin,[.92,.9,1.15],[0,.55,-.36],[Math.PI/2,0,0]));
  abdomen.push(add(sphere,bodyMaterial,[.84,.52,.94],[0,.57,-.38]));
  abdomen.push(add(sphere,carapace,[.72,.42,.82],[0,.72,-.42]));
  for(let index=0;index<4;index++)abdomen.push(add(torus,index%2?conductor:carapaceLight,[.68-index*.065,.68-index*.065,.68-index*.065],[0,.62,-.25-index*.17],[Math.PI/2,0,0]));
  const abdomenCoil=glow(torus,electric,[.7,.7,.7],[0,.64,-.39],[Math.PI/2,0,0],"e07-abdomen-coil");
  const abdomenCore=glow(diamond,electricWhite,[.24,.18,.18],[0,.74,-.93],[0,0,Math.PI/4],"e07-abdomen-core");
  abdomen.push(abdomenCoil,abdomenCore);
  for(const side of [-1,1])for(const z of [-.25,-.55,-.82])abdomen.push(add(cone,carapaceLight,[.09,.25,.09],[side*.48,.83,z],[0,0,side*.2]));
  parts.body=makeRig("e07-abdomen",[0,.55,-.36],abdomen);

  // Armored cephalothorax and a clustered predatory eye arrangement.
  const head=[];
  head.push(add(sphere,chitin,[.65,.42,.6],[0,.52,.42]));
  head.push(add(sphere,carapaceLight,[.58,.37,.54],[0,.59,.48]));
  head.push(add(box,carapace,[.68,.2,.46],[0,.72,.4],[-.08,0,0]));
  const eyes=[];
  const eyeLayout=[[-.19,.64,.77],[.19,.64,.77],[-.08,.57,.83],[.08,.57,.83],[-.29,.6,.67],[.29,.6,.67]];
  eyeLayout.forEach(([x,y,z],index)=>{
    const eye=glow(sphere,index<2?danger:electricWhite,[index<2?.105:.07,index<2?.105:.07,.055],[x,y,z],[0,0,0],"e07-eye");head.push(eye);eyes.push(eye);
  });
  const foreheadCoil=glow(torus,electric,[.28,.28,.28],[0,.76,.65],[Math.PI/2,0,0],"e07-forehead-coil");head.push(foreheadCoil);
  parts.head=makeRig("e07-head",[0,.52,.42],head);

  // Conductive articulated mandibles close around the target during attacks.
  const mandibles=[];
  for(const side of [-1,1]){
    const members=[];
    members.push(add(cylinder,chitin,[.075,.36,.075],[side*.19,.38,.83],[Math.PI/2,0,side*.28]));
    const fang=glow(cone,electricWhite,[.12,.4,.12],[side*.2,.3,1.03],[Math.PI/2,0,side*.16],"e07-fang");members.push(fang);
    members.push(add(torus,conductor,[.12,.12,.12],[side*.19,.4,.76],[Math.PI/2,0,0]));
    const mandible=makeRig(side<0?"e07-left-mandible":"e07-right-mandible",[side*.14,.43,.72],members);mandible.userData.shockSpiderSide=side;
    attach(parts.head,mandible);mandibles.push(mandible);parts.jaws.push(mandible);
  }

  // Eight genuinely articulated legs: hip, upper bone, charged knee, lower
  // bone and hooked foot. Each joint can move independently in the gait.
  const legSets=[];
  for(const side of [-1,1])for(let row=0;row<4;row++){
    const z=.5-row*.3;
    const hipPoint=new THREE.Vector3(side*.36,.48,z);
    const kneePoint=new THREE.Vector3(side*(.74+row*.045),.31,z+(row-1.5)*.055);
    const footPoint=new THREE.Vector3(side*(1.08+row*.055),.075,z+(row-1.5)*.13);
    const upper=segment(hipPoint,kneePoint,.07,jointMetal,"e07-upper-leg");
    const hipArmor=add(sphere,carapace,[.16,.14,.16],hipPoint.toArray());
    const hipNode=makeRig(`e07-hip-${side}-${row}`,hipPoint.toArray(),[upper,hipArmor]);
    const lower=segment(kneePoint,footPoint,.055,chitin,"e07-lower-leg");
    const kneeArmor=add(sphere,carapaceLight,[.13,.13,.13],kneePoint.toArray());
    const kneeGlow=glow(torus,electric,[.14,.14,.14],kneePoint.toArray(),[Math.PI/2,0,0],"e07-knee-coil");
    const foot=add(cone,chitin,[.11,.34,.11],[footPoint.x,footPoint.y,footPoint.z+.12],[Math.PI/2,0,side*.12],"e07-hook-foot");
    const kneeNode=makeRig(`e07-knee-${side}-${row}`,kneePoint.toArray(),[lower,kneeArmor,kneeGlow,foot]);
    attach(hipNode,kneeNode);
    hipNode.userData.shockSpiderSide=side;hipNode.userData.shockSpiderRow=row;
    kneeNode.userData.shockSpiderSide=side;kneeNode.userData.shockSpiderRow=row;
    parts.legs.push(hipNode);legSets.push({side,row,hip:hipNode,knee:kneeNode,foot,kneeGlow});
  }

  // Dorsal capacitor pylons and a central lightning crown.
  const capacitors=[];
  for(const side of [-1,1]){
    const pylon=add(cylinder,conductor,[.1,.38,.1],[side*.28,1.03,-.3]);capacitors.push(pylon);attach(parts.body,pylon);
    const cap=glow(sphere,electricWhite,[.13,.13,.13],[side*.28,1.25,-.3],[0,0,0],"e07-capacitor");capacitors.push(cap);attach(parts.body,cap);
  }
  const crown=glow(diamond,electric,[.21,.36,.21],[0,1.1,-.28],[0,0,0],"e07-lightning-crown");attach(parts.body,crown);

  parts.shockSpider={abdomenCoil,abdomenCore,foreheadCoil,eyes,mandibles,legSets,capacitors,crown};
}

function signature({level,base,tone,noise}){
  noise(.1,level*.8);
  tone(base*1.7,.08,level,"sawtooth",.35);
  tone(base*3.2,.025,level*.65,"square",.5,.035);
  tone(base*.62,.11,level*.38,"triangle",.42,.07);
}

export default defineEnemy({
  id:7,name:"Shock Spider",slug:"shock-spider",
  stats:{health:75,damage:10,speed:3.7,range:1.5,cooldown:1.25,color:0x8d6bd1,scale:0.72,style:"leaper"},
model:{build:buildModel,builder:"shock-spider",flying:false,surface:"organic",hazardArmor:false},
sound:{base:410,wave:"triangle",attack:1.6,recipe:"shock",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"leap",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Electric Leap",handler:"electricLeap",cooldown:8,maxRange:7,requiresLineOfSight:true,color:0xa77cff,targetDistance:10,projectile:false,indicator:{type:"damage",radius:2.2,anchor:"target"}},
});

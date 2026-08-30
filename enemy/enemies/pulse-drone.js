import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,diamond,bodyMaterial,makeMaterial,THREE}=ctx;
  const voidMetal=makeMaterial(0x07151d,.035,.9);
  const gunMetal=makeMaterial(0x1b3540,.08,.78);
  const cyanArmor=makeMaterial(0x4aa5a3,.22,.56);
  const paleArmor=makeMaterial(0xa2e9df,.24,.48);
  const violetArmor=makeMaterial(0x485699,.18,.66);
  const pulseBlue=new THREE.MeshBasicMaterial({color:0x37fff2});
  const pulseWhite=new THREE.MeshBasicMaterial({color:0xd9fffb});
  const hotViolet=new THREE.MeshBasicMaterial({color:0x8d7dff});

  const attach=(rig,member)=>{
    rig.attach(member);
    member.userData.basePosition=member.position.clone();member.userData.baseRotation=member.rotation.clone();member.userData.baseScale=member.scale.clone();
  };
  const makeRig=(name,position,members)=>{
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

  // Armored gyroscopic hull wrapped around a visible pulse reactor.
  const hull=[];
  hull.push(add(sphere,voidMetal,[.82,.34,.78],[0,.76,0]));
  hull.push(add(cylinder,bodyMaterial,[.78,.28,.78],[0,.76,0]));
  hull.push(add(torus,cyanArmor,[.82,.82,.82],[0,.76,0],[Math.PI/2,0,0]));
  hull.push(add(torus,paleArmor,[.63,.63,.63],[0,.88,0],[Math.PI/2,0,0]));
  hull.push(add(cylinder,gunMetal,[.42,.17,.42],[0,.98,0]));
  hull.push(add(sphere,paleArmor,[.38,.2,.38],[0,1.07,-.01]));
  const reactorCage=glow(torus,hotViolet,[.31,.31,.31],[0,.77,.51],[0,0,0],"e06-reactor-cage");
  const reactor=glow(diamond,pulseBlue,[.27,.27,.18],[0,.77,.58],[0,0,Math.PI/4],"e06-reactor");
  const reactorLens=glow(sphere,pulseWhite,[.1,.1,.055],[0,.77,.73],[0,0,0],"e06-reactor-lens");
  hull.push(reactorCage,reactor,reactorLens);
  parts.body=makeRig("e06-core-hull",[0,.76,0],hull);

  // Concentric gyro bands make the silhouette unmistakably energy-driven.
  const gyroBands=[];
  const gyroA=glow(torus,pulseBlue,[1.02,1.02,1.02],[0,.76,0],[Math.PI/2,0,0],"e06-gyro-a");
  const gyroB=glow(torus,hotViolet,[.9,.9,.9],[0,.76,0],[Math.PI/2,Math.PI/2,0],"e06-gyro-b");
  const gyroC=glow(torus,pulseWhite,[.79,.79,.79],[0,.76,0],[0,Math.PI/2,0],"e06-gyro-c");
  gyroBands.push(gyroA,gyroB,gyroC);parts.rings.push(...gyroBands);

  // Four articulated stabilizer petals surround the hull.
  const stabilizers=[];
  for(let index=0;index<4;index++){
    const angle=index*Math.PI/2,x=Math.sin(angle)*.72,z=Math.cos(angle)*.72;
    const members=[];
    members.push(add(sphere,gunMetal,[.15,.15,.15],[x,.79,z]));
    members.push(add(box,cyanArmor,[.32,.1,.52],[Math.sin(angle)*.86,.79,Math.cos(angle)*.86],[0,angle,0]));
    members.push(add(diamond,paleArmor,[.2,.09,.32],[Math.sin(angle)*1.08,.79,Math.cos(angle)*1.08],[0,angle,0]));
    const tip=glow(sphere,pulseBlue,[.075,.075,.075],[Math.sin(angle)*1.24,.79,Math.cos(angle)*1.24],[0,0,0],"e06-stabilizer-tip");members.push(tip);
    const stabilizer=makeRig(`e06-stabilizer-${index}`,[x,.79,z],members);stabilizer.userData.pulseDroneAngle=angle;stabilizers.push(stabilizer);
  }

  // Twin side nacelles contain burst cannons and vectored hover thrusters.
  const nacelles=[],thrusters=[],muzzles=[];
  for(const side of [-1,1]){
    const x=side*.67,members=[];
    members.push(add(sphere,voidMetal,[.2,.2,.2],[x,.76,0]));
    members.push(add(box,gunMetal,[.34,.3,.64],[side*.79,.76,-.02],[0,side*.1,side*.04]));
    members.push(add(box,paleArmor,[.32,.1,.48],[side*.79,.94,-.03],[0,side*.1,side*.04]));
    members.push(add(cone,cyanArmor,[.2,.48,.2],[side*.79,.76,-.53],[-Math.PI/2,0,0]));
    const thruster=glow(cone,hotViolet,[.14,.4,.14],[side*.79,.76,-.67],[-Math.PI/2,0,0],"e06-thruster");members.push(thruster);thrusters.push(thruster);
    const barrel=add(cylinder,voidMetal,[.085,.72,.085],[side*.8,.66,.43],[Math.PI/2,0,0],"e06-pulse-cannon");members.push(barrel);parts.weapons.push(barrel);
    members.push(add(cylinder,cyanArmor,[.14,.19,.14],[side*.8,.66,.69],[Math.PI/2,0,0]));
    const muzzle=glow(torus,pulseWhite,[.14,.14,.14],[side*.8,.66,.82],[Math.PI/2,0,0],"e06-muzzle");members.push(muzzle);muzzle.visible=false;muzzles.push(muzzle);
    for(const z of [.12,.31,.5])members.push(add(box,violetArmor,[.055,.22,.055],[side*.98,.78,z],[0,0,side*.18]));
    const nacelle=makeRig(side<0?"e06-left-nacelle":"e06-right-nacelle",[x,.76,0],members);nacelle.userData.pulseDroneSide=side;nacelles.push(nacelle);
  }

  // Underslung sensor array keeps a clear visual front and adds targeting detail.
  const sensor=[];
  sensor.push(add(cylinder,voidMetal,[.29,.16,.29],[0,.48,.18]));
  sensor.push(add(sphere,gunMetal,[.31,.22,.31],[0,.42,.28]));
  sensor.push(add(cone,paleArmor,[.23,.38,.23],[0,.4,.54],[Math.PI/2,0,0]));
  const eye=glow(sphere,pulseWhite,[.12,.12,.07],[0,.43,.7],[0,0,0],"e06-sensor-eye");sensor.push(eye);
  const eyeIris=glow(sphere,hotViolet,[.055,.055,.035],[0,.43,.76],[0,0,0],"e06-sensor-iris");sensor.push(eyeIris);
  parts.head=makeRig("e06-sensor-head",[0,.48,.18],sensor);

  // Retractable EMP projector under the chassis.
  const projector=[];
  projector.push(add(cylinder,gunMetal,[.2,.22,.2],[0,.31,-.05]));
  projector.push(add(cone,voidMetal,[.24,.3,.24],[0,.16,-.05],[0,0,Math.PI]));
  const projectorCore=glow(diamond,pulseBlue,[.16,.19,.16],[0,.13,-.05],[0,0,0],"e06-emp-projector");projector.push(projectorCore);
  const projectorRing=glow(torus,pulseWhite,[.28,.28,.28],[0,.14,-.05],[Math.PI/2,0,0],"e06-projector-ring");projector.push(projectorRing);parts.rings.push(projectorRing);
  const projectorRig=makeRig("e06-emp-rig",[0,.31,-.05],projector);

  parts.pulseDrone={reactorCage,reactor,reactorLens,gyroBands,stabilizers,nacelles,thrusters,muzzles,eye,eyeIris,projectorRig,projectorCore,projectorRing};
}

function signature({level,base,tone}){
  [1,1.35,1.8].forEach((ratio,index)=>tone(base*ratio,.045,level*.78,"square",.6,index*.055));
  tone(base*.5,.1,level*.38,"sine",.5,.1);
}

export default defineEnemy({
  id:6,name:"Pulse Drone",slug:"pulse-drone",
  stats:{health:60,damage:12,speed:2.8,range:13,cooldown:0.8,color:0x43f4d0,scale:0.78,style:"burst"},
model:{build:buildModel,builder:"pulse-drone",flying:true,surface:"metal",hazardArmor:false},
  sound:{base:290,wave:"square",attack:2.1,recipe:"pulse",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.3,skillMotion:"pulse",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"EMP Pulse",handler:"empPulse",cooldown:10,maxRange:7,requiresLineOfSight:true,color:0x37fff2,targetDistance:7,projectile:false,indicator:{type:"damage",radius:7,anchor:"self"}},
});

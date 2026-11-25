import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {group,parts,box,cylinder,torus,capsule,diamond,bodyMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,THREE}=ctx;
  const black=makeMaterial(0x080d12,.015,.92);
  const charcoal=makeMaterial(0x202a31,.025,.88);
  const armor=makeMaterial(0x671b25,.09,.82);
  const armorLight=makeMaterial(0x9e3340,.12,.76);
  const bronze=makeMaterial(0x9d7138,.055,.88);
  const steel=makeMaterial(0x71878a,.025,.94);
  bodyMaterial.color.setHex(0x4e151d);bodyMaterial.emissive.setHex(0x21070a);bodyMaterial.metalness=.84;bodyMaterial.roughness=.32;
  accentMaterial.color.setHex(0x8d6330);accentMaterial.emissive.setHex(0x2d1605);accentMaterial.metalness=.88;accentMaterial.roughness=.28;
  glowMaterial.color.setHex(0xff6a45);redGlow.color.setHex(0xff3153);

  const child=(parent,geometry,material,scale,position,rotation=[0,0,0])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(...scale);mesh.position.set(...position);mesh.rotation.set(...rotation);
    mesh.userData.basePosition=mesh.position.clone();mesh.userData.baseRotation=mesh.rotation.clone();mesh.userData.baseScale=mesh.scale.clone();parent.add(mesh);return mesh;
  };
  const makeRig=(position)=>{
    const rig=new THREE.Group();rig.position.set(...position);rig.userData.basePosition=rig.position.clone();rig.userData.baseRotation=rig.rotation.clone();rig.userData.baseScale=rig.scale.clone();group.add(rig);return rig;
  };
  const titan={arms:[],legs:[],shoulderRings:[],pistons:[],core:null,coreRing:null,halo:null,visor:null,backVents:[]};
  parts.titanGuardian=titan;

  // One continuous armored hull; overlapping wedges remove the box-stack look.
  const torso=makeRig([0,1.3,0]);parts.body=torso;
  child(torso,box,black,[1.7,.72,1.12],[0,-.04,0]);
  child(torso,capsule,bodyMaterial,[2.35,.63,1.62],[0,.08,-.04],[Math.PI/2,0,0]);
  child(torso,box,armor,[1.48,.27,.75],[0,.3,-.08],[-.07,0,0]);
  child(torso,box,armorLight,[1.34,.22,.48],[0,.25,.4],[-.16,0,0]);
  child(torso,box,charcoal,[1.4,.16,.34],[0,-.34,.24],[.08,0,0]);
  for(const side of [-1,1]){
    child(torso,box,side<0?bronze:steel,[.19,.48,.88],[side*.82,.02,-.02],[0,side*.04,side*.08]);
    child(torso,cylinder,steel,[.045,.56,.045],[side*.62,-.04,.46],[0,0,-side*.18]);
    const rearVent=child(torso,torus,glowMaterial,[.18,.18,.18],[side*.42,.06,-.59]);titan.backVents.push(rearVent);
  }

  // A single contained reactor replaces the oversized decorative rings.
  titan.coreRing=child(torso,torus,bronze,[.48,.48,.48],[0,-.02,.585]);
  titan.core=child(torso,diamond,redGlow,[.31,.31,.12],[0,-.02,.62],[0,0,Math.PI/4]);
  child(torso,torus,black,[.34,.34,.34],[0,-.02,.65]);
  child(torso,diamond,glowMaterial,[.2,.2,.09],[0,-.02,.68],[0,0,Math.PI/4]);

  // The helmet is socketed directly into the hull instead of floating on a neck.
  const head=makeRig([0,1.85,.34]);parts.head=head;
  child(head,box,black,[.82,.44,.57],[0,-.06,0],[-.05,0,0]);
  child(head,capsule,charcoal,[1.22,.37,.88],[0,.05,-.03],[Math.PI/2,0,0]);
  child(head,box,armor,[.72,.18,.45],[0,.18,-.02],[-.12,0,0]);
  child(head,box,black,[.67,.15,.16],[0,-.08,.32],[-.08,0,0]);
  titan.visor=child(head,box,redGlow,[.52,.055,.028],[0,-.045,.42],[-.08,0,0]);
  child(head,box,bronze,[.18,.06,.36],[-.39,.08,.02],[0,0,-.18]);
  child(head,box,steel,[.18,.06,.36],[.39,.08,.02],[0,0,.18]);
  titan.halo=child(head,torus,glowMaterial,[.34,.34,.34],[0,-.24,-.12],[Math.PI/2,0,0]);

  // Connected armored cannon pods form both shoulders and weapons.
  for(const side of [-1,1]){
    const pod=makeRig([side*.98,1.46,.02]);parts.arms.push(pod);
    child(pod,box,charcoal,[.58,.5,.68],[0,.02,0],[0,side*.05,side*.08]);
    child(pod,capsule,side<0?armor:armorLight,[.9,.42,.9],[0,.07,-.03],[Math.PI/2,0,0]);
    child(pod,box,bronze,[.14,.34,.48],[-side*.28,-.02,.02],[0,0,-side*.1]);
    const cannon=child(pod,cylinder,black,[.2,.78,.2],[0,-.12,.48],[Math.PI/2,0,0]);parts.weapons.push(cannon);
    child(pod,cylinder,steel,[.09,.65,.09],[side*.2,-.22,.34],[Math.PI/2,0,0]);
    const muzzle=child(pod,torus,redGlow,[.27,.27,.27],[0,-.12,.875]);titan.shoulderRings.push(muzzle);
    child(pod,cylinder,glowMaterial,[.11,.12,.11],[0,-.12,.91],[Math.PI/2,0,0]);
    const piston=child(pod,cylinder,steel,[.045,.42,.045],[-side*.2,-.34,-.05],[0,0,-side*.16]);titan.pistons.push(piston);
    titan.arms.push({side,group:pod,cannon,muzzle});
  }

  // Four compact siege legs remain visibly connected beneath the hull.
  for(const side of [-1,1])for(const row of [-1,1]){
    const leg=makeRig([side*.68,.91,row*.44]);parts.legs.push(leg);
    child(leg,capsule,armor,[.48,.76,.48],[side*.04,-.14,row*.02],[row*.1,0,-side*.16]);
    const knee=child(leg,diamond,side*row<0?bronze:steel,[.3,.27,.32],[side*.1,-.43,row*.1],[0,0,Math.PI/4]);
    child(leg,capsule,black,[.34,.67,.36],[side*.15,-.66,0],[-row*.12,0,side*.18]);
    const piston=child(leg,cylinder,steel,[.045,.48,.045],[-side*.08,-.49,row*.14],[row*.1,0,-side*.1]);titan.pistons.push(piston);
    const foot=child(leg,box,charcoal,[.48,.18,.65],[side*.18,-.91,.22+row*.06],[0,0,-side*.05]);
    child(leg,box,side<0?steel:bronze,[.32,.08,.29],[side*.2,-.96,.52+row*.06],[-.05,0,-side*.05]);
    titan.legs.push({side,row,group:leg,knee,foot,piston});
  }

  // A restrained waist stabilizer completes the machinery without visual noise.
  const waist=child(group,torus,bronze,[.67,.67,.67],[0,.78,-.03],[Math.PI/2,0,0]);parts.rings.push(waist);
  const waistGlow=child(group,torus,glowMaterial,[.55,.55,.55],[0,.785,-.03],[Math.PI/2,0,0]);parts.rings.push(waistGlow);
  parts.glows.push(titan.core,titan.coreRing,titan.halo,titan.visor,...titan.shoulderRings,...titan.backVents,waistGlow);
}

function signature({level,base,tone,noise}){tone(base,.38,level*1.4,"sawtooth",.32);tone(base*2.2,.12,level*.6,"square",.55,.08);noise(.18,level*.8,.04);}

export default defineEnemy({
  id:19,name:"Titan Guardian",slug:"titan-guardian",
  stats:{health:700,damage:45,speed:1.2,range:15,cooldown:1.8,color:0xc64d4d,scale:1.65,style:"titan"},
  model:{build:buildModel,builder:"titan-guardian",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:46,wave:"sawtooth",attack:1.2,recipe:"titan",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.5,skillMotion:"stomp",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Titan Stomp",handler:"titanStomp",cooldown:10,maxRange:10,requiresLineOfSight:true,color:0xff4d55,targetDistance:10,projectile:false,indicator:{type:"damage",radius:10,anchor:"self"}},
});

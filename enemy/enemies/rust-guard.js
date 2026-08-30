import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,diamond,bodyMaterial,makeMaterial,THREE}=ctx;
  const blackIron=makeMaterial(0x101619,.025,.9);
  const oldIron=makeMaterial(0x384047,.055,.82);
  const rust=makeMaterial(0x8b4329,.16,.56);
  const brightRust=makeMaterial(0xd16a32,.28,.48);
  const brass=makeMaterial(0xa77939,.2,.72);
  const oxide=makeMaterial(0x39786d,.2,.5);
  const ember=new THREE.MeshBasicMaterial({color:0xff6a28});
  const hotMetal=new THREE.MeshBasicMaterial({color:0xffb14b});

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

  // A low, broad furnace-like chassis wrapped in mismatched salvaged armor.
  const torso=[];
  torso.push(add(box,blackIron,[.76,.65,.46],[0,1.07,0]));
  torso.push(add(box,bodyMaterial,[.9,.55,.5],[0,1.13,.015],[.035,0,0]));
  torso.push(add(box,rust,[.78,.12,.56],[0,1.47,.015],[-.04,0,0]));
  torso.push(add(box,oldIron,[.66,.17,.49],[0,.77,-.015]));
  torso.push(add(box,brightRust,[.65,.38,.105],[0,1.18,.34],[-.08,0,0]));
  for(const side of [-1,1]){
    torso.push(add(box,oldIron,[.12,.32,.1],[side*.31,1.19,.405],[0,0,side*.08]));
    torso.push(add(cylinder,brass,[.055,.035,.055],[side*.31,1.34,.47],[Math.PI/2,0,0]));
    torso.push(add(cylinder,brass,[.055,.035,.055],[side*.31,1.06,.47],[Math.PI/2,0,0]));
  }
  const furnaceRing=glow(torus,hotMetal,[.2,.2,.2],[0,1.2,.467],[Math.PI/2,0,0],"e05-furnace-ring");
  const furnace=glow(diamond,ember,[.15,.15,.065],[0,1.2,.51],[0,0,Math.PI/4],"e05-furnace");
  torso.push(furnaceRing,furnace);
  parts.body=makeRig("e05-torso",[0,1.06,0],torso);

  // Exhaust stack and chained trophies follow the torso instead of floating.
  const back=[];
  for(const side of [-1,1]){
    back.push(add(cylinder,blackIron,[.1,.48,.1],[side*.28,1.42,-.39]));
    back.push(add(cylinder,rust,[.145,.12,.145],[side*.28,1.68,-.39]));
    back.push(add(torus,oxide,[.15,.15,.15],[side*.28,1.56,-.39],[Math.PI/2,0,0]));
  }
  for(let index=0;index<4;index++)back.push(add(torus,blackIron,[.08,.08,.08],[-.39,.98-index*.12,-.34],[Math.PI/2,index*.24,0]));
  back.forEach((member)=>attach(parts.body,member));

  // Brutalist helmet: layered brow, glowing slit, cheek armor and iron jaw.
  const head=[];
  head.push(add(box,blackIron,[.58,.42,.44],[0,1.72,.02]));
  head.push(add(box,rust,[.68,.17,.51],[0,1.92,0],[-.07,0,0]));
  head.push(add(box,brightRust,[.47,.13,.5],[0,2.055,-.015],[.03,0,0]));
  head.push(add(box,oldIron,[.52,.19,.08],[0,1.74,.255],[0,0,0]));
  const visor=glow(box,ember,[.39,.055,.025],[0,1.78,.312],[0,0,0],"e05-visor");head.push(visor);
  for(const side of [-1,1]){
    head.push(add(box,oldIron,[.16,.27,.1],[side*.25,1.62,.265],[0,0,side*.12]));
    head.push(add(cone,rust,[.11,.38,.11],[side*.29,2.17,-.02],[0,0,side*.24]));
    head.push(add(cylinder,brass,[.075,.04,.075],[side*.31,1.77,.32],[Math.PI/2,0,0]));
  }
  for(const x of [-.16,0,.16])head.push(add(box,blackIron,[.075,.19,.055],[x,1.58,.315],[.1,0,0]));
  parts.head=makeRig("e05-head",[0,1.62,0],head);

  // Heavy asymmetrical arms: shield side is wider, weapon side is reinforced.
  for(const side of [-1,1]){
    const x=side*.61,members=[];
    members.push(add(sphere,blackIron,[.18,.18,.18],[x,1.43,0]));
    members.push(add(box,side<0?oldIron:rust,[side<0?.43:.37,.27,.52],[side*(side<0?.65:.62),1.47,.015],[0,0,side*.12]));
    members.push(add(box,blackIron,[.24,.45,.25],[x,1.16,0]));
    members.push(add(box,side<0?rust:oldIron,[.29,.29,.31],[x,.98,.035],[0,0,side*.04]));
    members.push(add(cylinder,brass,[.14,.08,.14],[x,.82,.03]));
    for(const y of [1.09,1.25])members.push(add(box,brightRust,[.27,.045,.035],[x,y,.205]));
    parts.arms.push(makeRig(side<0?"e05-shield-arm":"e05-weapon-arm",[x,1.4,0],members));
  }

  // A scarred tower shield with a glowing furnace viewport.
  const shieldParts=[];
  const shield=add(box,blackIron,[.57,.82,.12],[-.67,.91,.43],[0,.08,.02],"e05-tower-shield");shieldParts.push(shield);
  shieldParts.push(add(box,rust,[.5,.73,.075],[-.67,.91,.515],[0,.08,.02]));
  shieldParts.push(add(box,oldIron,[.39,.12,.04],[-.67,1.18,.58],[0,.08,.02]));
  shieldParts.push(add(box,oldIron,[.39,.12,.04],[-.67,.65,.58],[0,.08,.02]));
  const shieldCore=glow(diamond,ember,[.13,.13,.035],[-.67,.91,.605],[0,.08,Math.PI/4],"e05-shield-core");shieldParts.push(shieldCore);
  for(const side of [-1,1])for(const y of [.67,1.15])shieldParts.push(add(cylinder,brass,[.045,.035,.045],[-.67+side*.2,y,.61],[Math.PI/2,0,0]));
  shieldParts.forEach((member)=>attach(parts.arms[0],member));

  // A chipped powered cleaver is readable from every angle and fits Charge.
  const weaponParts=[];
  const weapon=add(cylinder,blackIron,[.075,.76,.075],[.66,.92,.42],[Math.PI/2,0,0],"e05-cleaver-handle");weaponParts.push(weapon);
  weaponParts.push(add(cylinder,brass,[.12,.11,.12],[.66,.92,.76],[Math.PI/2,0,0]));
  const blade=add(box,oldIron,[.34,.54,.095],[.66,.99,1.05],[-.16,0,.06],"e05-cleaver-blade");weaponParts.push(blade);
  weaponParts.push(add(cone,oldIron,[.28,.38,.1],[.66,.72,1.11],[0,0,Math.PI]));
  weaponParts.push(add(box,rust,[.09,.45,.11],[.78,1.01,1.08],[-.16,0,.06]));
  const bladeEdge=glow(box,hotMetal,[.055,.48,.025],[.49,.99,1.13],[-.16,0,.06],"e05-cleaver-edge");weaponParts.push(bladeEdge);
  for(const z of [.88,1.03,1.18])weaponParts.push(add(cylinder,brightRust,[.04,.04,.04],[.82,1.13,z],[Math.PI/2,0,0]));
  weaponParts.forEach((member)=>attach(parts.arms[1],member));parts.weapons.push(weapon);

  // Wide armored legs and oversized magnetic boots sell the guard's weight.
  for(const side of [-1,1]){
    const x=side*.27,members=[];
    members.push(add(sphere,blackIron,[.17,.17,.17],[x,.73,0]));
    members.push(add(box,rust,[.29,.38,.3],[x,.54,.02],[0,0,side*.035]));
    members.push(add(cylinder,brass,[.14,.09,.14],[x,.32,.06]));
    members.push(add(box,oldIron,[.28,.27,.29],[x,.2,.1],[.1,0,0]));
    members.push(add(box,blackIron,[.36,.13,.56],[x,.045,.2],[-.04,0,0]));
    members.push(add(box,brightRust,[.18,.045,.04],[x,.35,.235]));
    parts.legs.push(makeRig(side<0?"e05-left-leg":"e05-right-leg",[x,.72,0],members));
  }

  parts.rustGuard={furnaceRing,furnace,visor,exhausts:back.filter((part)=>part.geometry===cylinder),shield,shieldCore,weapon,blade,bladeEdge};
}

function signature({level,base,tone,noise}){
  tone(base*.7,.18,level,"sawtooth",.45);
  tone(base*.42,.12,level*.6,"square",.36,.08);
  noise(.1,level*.65,.045);
}

export default defineEnemy({
  id:5,name:"Rust Guard",slug:"rust-guard",
  stats:{health:65,damage:10,speed:2.4,range:1.35,cooldown:1,color:0x9a6548,scale:0.9,style:"melee"},
model:{build:buildModel,builder:"rust-guard",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:78,wave:"sawtooth",attack:1.1,recipe:"rust",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"dash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Charge",handler:"charge",cooldown:9,maxRange:7,requiresLineOfSight:true,color:0xff7b45,targetDistance:10,projectile:false},
});

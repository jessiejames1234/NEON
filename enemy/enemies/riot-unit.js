import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,diamond,bodyMaterial,makeMaterial,THREE}=ctx;
  const voidMetal=makeMaterial(0x0c171d,.025,.88);
  const darkSteel=makeMaterial(0x293a43,.07,.78);
  const riotBlue=makeMaterial(0x4a7d8e,.18,.58);
  const armorLight=makeMaterial(0x8dbbc5,.2,.55);
  const warning=makeMaterial(0xd77b32,.22,.62);
  const rubber=makeMaterial(0x071015,.01,.18);
  const cyan=new THREE.MeshBasicMaterial({color:0x62edff});
  const red=new THREE.MeshBasicMaterial({color:0xff405d});
  const shieldGlass=new THREE.MeshPhysicalMaterial({color:0x78d7e3,roughness:.18,metalness:.12,transparent:true,opacity:.34,transmission:.18,depthWrite:true});

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

  // Reinforced exoskeleton with overlapping anti-impact plates.
  const torso=[];
  torso.push(add(box,voidMetal,[.78,.7,.47],[0,1.08,0]));
  torso.push(add(box,bodyMaterial,[.92,.58,.52],[0,1.15,0],[.025,0,0]));
  torso.push(add(box,darkSteel,[.82,.14,.57],[0,1.48,.01],[-.04,0,0]));
  torso.push(add(box,riotBlue,[.68,.38,.11],[0,1.21,.34],[-.08,0,0]));
  torso.push(add(box,voidMetal,[.6,.16,.48],[0,.75,0]));
  for(const side of [-1,1]){
    torso.push(add(box,armorLight,[.15,.31,.09],[side*.33,1.2,.42],[0,0,side*.06]));
    torso.push(add(cylinder,warning,[.055,.035,.055],[side*.33,1.34,.48],[Math.PI/2,0,0]));
    torso.push(add(cylinder,warning,[.055,.035,.055],[side*.33,1.07,.48],[Math.PI/2,0,0]));
  }
  const chestRing=glow(torus,cyan,[.18,.18,.18],[0,1.21,.47],[Math.PI/2,0,0],"e08-chest-ring");
  const chestCore=glow(diamond,cyan,[.13,.13,.05],[0,1.21,.515],[0,0,Math.PI/4],"e08-chest-core");
  torso.push(chestRing,chestCore);parts.body=makeRig("e08-torso",[0,1.07,0],torso);

  // Backpack hydraulics and emergency identification lights.
  const backpack=[];
  backpack.push(add(box,voidMetal,[.55,.52,.18],[0,1.16,-.38]));
  for(const side of [-1,1]){
    backpack.push(add(cylinder,darkSteel,[.09,.43,.09],[side*.21,1.19,-.52]));
    backpack.push(add(cylinder,armorLight,[.125,.08,.125],[side*.21,1.43,-.52]));
  }
  const emergencyLeft=glow(box,red,[.15,.065,.08],[-.18,1.58,-.42],[0,0,0],"e08-red-light");
  const emergencyRight=glow(box,cyan,[.15,.065,.08],[.18,1.58,-.42],[0,0,0],"e08-blue-light");
  backpack.push(emergencyLeft,emergencyRight);backpack.forEach((member)=>attach(parts.body,member));

  // Low-profile riot helmet with armored cheeks and a wide luminous visor.
  const head=[];
  head.push(add(box,voidMetal,[.58,.4,.45],[0,1.75,.02]));
  head.push(add(box,riotBlue,[.68,.18,.51],[0,1.94,0],[-.06,0,0]));
  head.push(add(box,armorLight,[.52,.1,.5],[0,2.075,-.015],[.04,0,0]));
  head.push(add(box,rubber,[.47,.18,.06],[0,1.75,.255]));
  const visor=glow(box,red,[.4,.07,.025],[0,1.79,.31],[0,0,0],"e08-visor");head.push(visor);
  for(const side of [-1,1]){
    head.push(add(box,darkSteel,[.16,.27,.12],[side*.28,1.64,.24],[0,0,side*.09]));
    head.push(add(cylinder,warning,[.075,.04,.075],[side*.32,1.79,.31],[Math.PI/2,0,0]));
  }
  head.push(add(box,voidMetal,[.36,.11,.08],[0,1.57,.28],[.12,0,0]));
  parts.head=makeRig("e08-head",[0,1.64,0],head);

  // Independent arm rigs: shield arm stays forward while baton arm can strike.
  for(const side of [-1,1]){
    const x=side*.64,members=[];
    members.push(add(sphere,voidMetal,[.19,.19,.19],[x,1.45,0]));
    members.push(add(box,armorLight,[side<0?.46:.38,.28,.53],[side*(side<0?.68:.65),1.49,.01],[0,0,side*.12]));
    members.push(add(box,darkSteel,[.25,.45,.26],[x,1.17,0]));
    members.push(add(box,riotBlue,[.3,.29,.32],[x,.98,.04],[0,0,side*.035]));
    members.push(add(cylinder,rubber,[.14,.11,.14],[x,.81,.04]));
    members.push(add(box,warning,[.27,.045,.035],[x,1.1,.22]));
    parts.arms.push(makeRig(side<0?"e08-shield-arm":"e08-baton-arm",[x,1.42,0],members));
  }

  // Multi-layer shield: steel frame, translucent viewport, energy rails,
  // impact dampers and lower ground wedge all move with the left arm.
  const shieldParts=[];
  const shield=add(box,voidMetal,[1.02,1.3,.12],[-.42,.92,.62],[0,.08,.015],"e08-riot-shield");shieldParts.push(shield);
  shieldParts.push(add(box,riotBlue,[.93,1.2,.07],[-.42,.92,.715],[0,.08,.015]));
  const glass=add(box,shieldGlass,[.72,.3,.035],[-.42,1.27,.775],[0,.08,.015],"e08-shield-viewport");shieldParts.push(glass);
  shieldParts.push(add(box,rubber,[.78,.065,.04],[-.42,1.08,.77],[0,.08,.015]));
  shieldParts.push(add(box,darkSteel,[.73,.25,.045],[-.42,.71,.77],[0,.08,.015]));
  for(const side of [-1,1]){
    shieldParts.push(add(box,armorLight,[.1,1.12,.055],[-.42+side*.43,.92,.78],[0,.08,.015]));
    for(const y of [.43,1.41])shieldParts.push(add(cylinder,warning,[.065,.04,.065],[-.42+side*.43,y,.835],[Math.PI/2,0,0]));
  }
  const shieldRailLeft=glow(box,cyan,[.045,.93,.025],[-.78,.88,.85],[0,.08,.015],"e08-shield-rail");
  const shieldRailRight=glow(box,cyan,[.045,.93,.025],[-.06,.88,.85],[0,.08,.015],"e08-shield-rail");
  const shieldCore=glow(diamond,cyan,[.17,.17,.035],[-.42,.72,.855],[0,.08,Math.PI/4],"e08-shield-core");
  shieldParts.push(shieldRailLeft,shieldRailRight,shieldCore);
  shieldParts.forEach((member)=>attach(parts.arms[0],member));

  // Telescoping shock baton gives E08 a readable offensive side.
  const batonParts=[];
  const baton=add(cylinder,rubber,[.09,.78,.09],[.67,.92,.47],[Math.PI/2,0,0],"e08-shock-baton");batonParts.push(baton);
  batonParts.push(add(cylinder,darkSteel,[.14,.18,.14],[.67,.92,.15],[Math.PI/2,0,0]));
  batonParts.push(add(cylinder,armorLight,[.13,.5,.13],[.67,.92,.72],[Math.PI/2,0,0]));
  for(const z of [.53,.72,.91])batonParts.push(add(torus,warning,[.15,.15,.15],[.67,.92,z],[Math.PI/2,0,0]));
  const batonCoil=glow(torus,cyan,[.18,.18,.18],[.67,.92,1.08],[Math.PI/2,0,0],"e08-baton-coil");batonParts.push(batonCoil);
  const batonTip=glow(diamond,cyan,[.14,.14,.22],[.67,.92,1.2],[0,0,0],"e08-baton-tip");batonParts.push(batonTip);
  batonParts.forEach((member)=>attach(parts.arms[1],member));parts.weapons.push(baton);

  // Wide hydraulic legs and magnetic anti-slip boots resist bash recoil.
  const pistons=[];
  for(const side of [-1,1]){
    const x=side*.28,members=[];
    members.push(add(sphere,voidMetal,[.17,.17,.17],[x,.75,0]));
    members.push(add(box,darkSteel,[.3,.4,.31],[x,.55,.02],[0,0,side*.04]));
    const piston=add(cylinder,warning,[.07,.34,.07],[x,.48,.19]);members.push(piston);pistons.push(piston);
    members.push(add(cylinder,rubber,[.14,.1,.14],[x,.31,.07]));
    members.push(add(box,riotBlue,[.29,.28,.31],[x,.19,.11],[.1,0,0]));
    members.push(add(box,voidMetal,[.38,.14,.58],[x,.04,.21],[-.04,0,0]));
    members.push(add(box,armorLight,[.2,.045,.04],[x,.34,.25]));
    parts.legs.push(makeRig(side<0?"e08-left-leg":"e08-right-leg",[x,.74,0],members));
  }

  parts.riotUnit={chestRing,chestCore,emergencyLeft,emergencyRight,visor,shield,glass,shieldRails:[shieldRailLeft,shieldRailRight],shieldCore,baton,batonCoil,batonTip,pistons};
}

function signature({level,base,tone,noise}){
  tone(base*.65,.15,level*1.2,"square",.42);
  noise(.055,level*.35,.025);
  tone(base*2.4,.035,level*.4,"triangle",.8,.09);
  tone(base*.38,.09,level*.35,"sawtooth",.4,.12);
}

export default defineEnemy({
  id:8,name:"Riot Unit",slug:"riot-unit",
  stats:{health:110,damage:12,speed:1.9,range:1.5,cooldown:1.1,color:0x55717b,scale:1.05,style:"shield"},
model:{build:buildModel,builder:"riot-unit",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:68,wave:"square",attack:0.9,recipe:"shield",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.1,skillMotion:"dash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Shield Bash",handler:"shieldBash",cooldown:8,maxRange:6,requiresLineOfSight:true,color:0x83e8ff,targetDistance:10,projectile:false},
});

import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,torus,diamond,bodyMaterial,redGlow,makeMaterial,THREE}=ctx;
  const armorDark=makeMaterial(0x101c25,.04,.82);
  const armorMid=makeMaterial(0x315b6a,.1,.72);
  const armorLight=makeMaterial(0x79bed0,.16,.58);
  const rubber=makeMaterial(0x071015,.01,.15);
  const warning=makeMaterial(0xffa640,.35,.5);
  const cyan=new THREE.MeshBasicMaterial({color:0x49ffe0});
  const warningGlow=new THREE.MeshBasicMaterial({color:0xff8b35});

  const attach=(rig,member)=>{
    rig.attach(member);
    member.userData.basePosition=member.position.clone();
    member.userData.baseRotation=member.rotation.clone();
    member.userData.baseScale=member.scale.clone();
  };
  const rig=(name,position,members)=>{
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

  // Compact, layered torso: a patrol unit with a narrow waist and heavy upper armor.
  const torso=[];
  torso.push(add(box,armorDark,[.64,.58,.42],[0,1.12,0]));
  torso.push(add(box,bodyMaterial,[.76,.5,.48],[0,1.2,.015],[.03,0,0]));
  torso.push(add(box,armorLight,[.58,.34,.12],[0,1.27,.28],[-.08,0,0]));
  torso.push(add(box,armorMid,[.7,.13,.5],[0,1.49,-.01]));
  torso.push(add(box,armorDark,[.5,.18,.42],[0,.84,0]));
  for(const side of [-1,1]){
    torso.push(add(box,warning,[.12,.08,.13],[side*.22,1.39,.36],[0,0,side*.12]));
    torso.push(add(cylinder,armorDark,[.06,.1,.06],[side*.31,1.05,.3],[Math.PI/2,0,0]));
  }
  const chestHalo=glow(torus,cyan,[.19,.19,.19],[0,1.28,.352],[Math.PI/2,0,0],"e04-chest-halo");
  const chestCore=glow(diamond,cyan,[.17,.17,.08],[0,1.28,.39],[0,0,Math.PI/4],"e04-chest-core");
  torso.push(chestHalo,chestCore);
  parts.body=rig("e04-torso",[0,1.08,0],torso);

  // Back-mounted radio, cooling stack and rotating patrol beacon.
  const backpack=[];
  backpack.push(add(box,armorDark,[.48,.5,.17],[0,1.2,-.36]));
  backpack.push(add(box,armorMid,[.32,.31,.1],[0,1.23,-.49]));
  for(const y of [1.1,1.22,1.34])backpack.push(add(box,armorLight,[.24,.035,.035],[0,y,-.555]));
  backpack.push(add(cylinder,armorDark,[.035,.45,.035],[-.24,1.72,-.33]));
  const antennaTip=glow(sphere,warningGlow,[.06,.06,.06],[-.24,1.98,-.33],[0,0,0],"e04-radio-light");
  const beaconBase=add(cylinder,armorDark,[.17,.07,.17],[0,1.88,-.04]);
  const beacon=glow(cylinder,warningGlow,[.11,.08,.11],[0,1.96,-.04],[0,0,0],"e04-beacon");
  const beaconGuard=add(torus,warning,[.14,.14,.14],[0,1.96,-.04],[Math.PI/2,0,0]);
  backpack.push(antennaTip,beaconBase,beacon,beaconGuard);
  backpack.forEach((member)=>attach(parts.body,member));

  // Helmet and recessed multi-layer tactical visor.
  const headMembers=[];
  headMembers.push(add(box,armorDark,[.56,.38,.42],[0,1.71,.02]));
  headMembers.push(add(box,armorMid,[.65,.17,.47],[0,1.89,0]));
  headMembers.push(add(box,armorLight,[.52,.12,.5],[0,2.02,-.015],[-.08,0,0]));
  headMembers.push(add(box,rubber,[.46,.19,.06],[0,1.73,.245]));
  const visor=glow(box,redGlow,[.38,.075,.025],[0,1.76,.285],[0,0,0],"e04-visor");
  headMembers.push(visor);
  for(const side of [-1,1]){
    headMembers.push(add(cylinder,armorLight,[.13,.07,.13],[side*.34,1.77,.01],[0,0,Math.PI/2]));
    headMembers.push(add(cylinder,armorDark,[.08,.08,.08],[side*.38,1.77,.01],[0,0,Math.PI/2]));
  }
  const scanLens=glow(sphere,cyan,[.07,.07,.035],[.16,1.76,.322],[0,0,0],"e04-scan-lens");
  headMembers.push(scanLens);
  parts.head=rig("e04-head",[0,1.62,0],headMembers);

  // Arms are individually rigged so the carbine can aim while the shield braces.
  const shoulderLights=[];
  for(const side of [-1,1]){
    const x=side*.58;
    const members=[];
    members.push(add(sphere,armorDark,[.17,.17,.17],[x,1.43,0]));
    members.push(add(box,armorLight,[.37,.22,.48],[side*.61,1.48,.015],[0,0,side*.13]));
    members.push(add(box,armorDark,[.23,.43,.24],[x,1.17,0]));
    members.push(add(box,armorMid,[.27,.27,.29],[x,1.03,.025]));
    members.push(add(cylinder,rubber,[.13,.12,.13],[x,.91,.02]));
    const light=glow(box,side<0?cyan:warningGlow,[.11,.035,.035],[side*.64,1.59,.285],[0,0,side*.13],"e04-shoulder-light");
    members.push(light);shoulderLights.push(light);
    const armRig=rig(side<0?"e04-left-arm":"e04-right-arm",[x,1.4,0],members);
    parts.arms.push(armRig);
  }

  // Right-hand burst carbine with a visible energy cell and vented barrel.
  const gun=[];
  const weapon=add(box,armorDark,[.22,.22,.78],[.58,.91,.48],[-.05,0,0],"e04-carbine");gun.push(weapon);
  gun.push(add(box,armorMid,[.27,.14,.48],[.58,.98,.43],[-.05,0,0]));
  gun.push(add(box,rubber,[.12,.3,.15],[.58,.73,.28],[-.18,0,0]));
  gun.push(add(cylinder,armorLight,[.075,.48,.075],[.58,.94,.93],[Math.PI/2,0,0]));
  gun.push(add(cylinder,armorDark,[.12,.12,.12],[.58,.94,1.22],[Math.PI/2,0,0]));
  for(const z of [.62,.78,.94])gun.push(add(box,armorLight,[.25,.035,.045],[.58,1.105,z]));
  const weaponCell=glow(box,cyan,[.09,.18,.08],[.75,.9,.48],[0,0,0],"e04-weapon-cell");gun.push(weaponCell);
  const muzzle=glow(torus,warningGlow,[.13,.13,.13],[.58,.94,1.32],[Math.PI/2,0,0],"e04-muzzle");gun.push(muzzle);muzzle.visible=false;
  gun.forEach((member)=>attach(parts.arms[1],member));
  parts.weapons.push(weapon);

  // Left forearm carries an asymmetrical riot shield with emissive edge markers.
  const shield=add(box,armorDark,[.4,.56,.1],[-.64,1.02,.31],[0,.08,.05],"e04-shield");
  const shieldPlate=add(box,armorMid,[.34,.47,.055],[-.64,1.02,.39],[0,.08,.05]);
  const shieldCore=glow(diamond,cyan,[.12,.12,.035],[-.64,1.02,.445],[0,.08,Math.PI/4],"e04-shield-core");
  const shieldTop=add(box,warning,[.28,.045,.04],[-.64,1.25,.45],[0,.08,.05]);
  [shield,shieldPlate,shieldCore,shieldTop].forEach((member)=>attach(parts.arms[0],member));

  // Reverse-jointed armored legs give E04 a purposeful military silhouette.
  for(const side of [-1,1]){
    const x=side*.25,members=[];
    members.push(add(sphere,armorDark,[.16,.16,.16],[x,.77,0]));
    members.push(add(box,armorMid,[.25,.38,.27],[x,.59,.015],[0,0,side*.04]));
    members.push(add(cylinder,rubber,[.13,.12,.13],[x,.38,.03]));
    members.push(add(box,armorLight,[.24,.3,.25],[x,.23,.1],[.12,0,0]));
    members.push(add(box,armorDark,[.29,.12,.48],[x,.05,.16],[-.04,0,0]));
    members.push(add(box,warning,[.12,.045,.04],[x,.38,.19]));
    parts.legs.push(rig(side<0?"e04-left-leg":"e04-right-leg",[x,.76,0],members));
  }

  parts.patrolBot={chestCore,chestHalo,antennaTip,beaconBase,beacon,visor,scanLens,shoulderLights,weapon,muzzle,weaponCell,shield};
}

function signature({level,base,tone,noise}){
  tone(base,.055,level,"square",1);
  tone(base*1.5,.07,level*.8,"square",.72,.075);
  tone(base*.52,.1,level*.4,"sawtooth",.45,.11);
  noise(.035,level*.25,.04);
}

export default defineEnemy({
  id:4,name:"Patrol Bot",slug:"patrol-bot",
  stats:{health:50,damage:8,speed:2.2,range:11,cooldown:1.55,color:0x5b8795,scale:0.85,style:"ranged"},
model:{build:buildModel,builder:"patrol-bot",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:185,wave:"square",attack:1.55,recipe:"radio",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.5,skillMotion:"scanning",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Scanning Lock",handler:"scanningLock",cooldown:8,maxRange:11,requiresLineOfSight:true,color:0x43f4d0,targetDistance:10,projectile:true,indicator:{type:"damage",radius:1.1,anchor:"target"}},
});

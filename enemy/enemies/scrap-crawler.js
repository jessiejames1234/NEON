import {defineEnemy} from "../define-enemy.js";
import {alignCrawlerSegment} from "../model-utils.js";

function buildModel(ctx){
  const {add,group,parts,box,sphere,cylinder,cone,torus,capsule,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,THREE}=ctx;
  const oxidized=makeMaterial(0x245f5b,.09,.62),steel=makeMaterial(0x718481,.035,.78),rust=makeMaterial(0x713a22,.045,.58),brass=makeMaterial(0xc08a2b,.08,.7),rubber=makeMaterial(0x0b1115,.01,.22),warning=makeMaterial(0xd9a536,.1,.62);
  bodyMaterial.color.setHex(0x294d4b);bodyMaterial.emissive.setHex(0x102421);bodyMaterial.metalness=.66;bodyMaterial.roughness=.48;
  accentMaterial.color.setHex(0x52736f);accentMaterial.emissive.setHex(0x172e2b);accentMaterial.metalness=.72;accentMaterial.roughness=.4;

  // Low armored core: a compact salvage chassis instead of a stack of unrelated boxes.
  parts.body=add(capsule,darkMaterial,[.7,.5,1.16],[0,.39,-.08],[Math.PI/2,0,0]);
  add(capsule,bodyMaterial,[.62,.42,1.04],[0,.44,-.07],[Math.PI/2,0,0]);
  add(box,rubber,[.55,.105,.83],[0,.195,-.07]);
  add(box,oxidized,[.64,.1,.78],[0,.555,-.08]);

  // Interlocking dorsal armor and a recessed central service spine.
  const dorsalPlates=[
    {scale:[.54,.075,.25],position:[0,.665,-.4],rotation:[-.035,0,0],material:accentMaterial},
    {scale:[.59,.085,.28],position:[0,.69,-.1],rotation:[.012,0,0],material:bodyMaterial},
    {scale:[.52,.073,.23],position:[0,.665,.2],rotation:[.04,0,0],material:accentMaterial},
  ];
  dorsalPlates.forEach((plate,index)=>{const armor=add(box,plate.material,plate.scale,plate.position,plate.rotation);armor.userData.crawlerPlateIndex=index;parts.crawlerArmor.push(armor);});
  add(box,rubber,[.2,.035,.68],[0,.745,-.09]);
  for(const z of [-.36,-.1,.16]){add(box,steel,[.14,.025,.018],[0,.77,z]);for(const x of [-.24,.24])add(sphere,brass,[.022,.018,.022],[x,.735,z]);}

  // Armored hip housings and visible hydraulic rams make the legs feel functional.
  for(const side of [-1,1]){
    const frontPod=add(box,oxidized,[.12,.27,.33],[side*.49,.43,.24],[0,side*.035,side*.045]);
    const rearPod=add(box,side<0?rust:accentMaterial,[.115,.25,.3],[side*.48,.42,-.36],[0,-side*.03,-side*.04]);
    parts.crawlerArmor.push(frontPod,rearPod);
    add(box,rubber,[.135,.12,.2],[side*.5,.285,-.08]);
    const piston=add(cylinder,brass,[.033,.31,.033],[side*.515,.28,-.08],[Math.PI/2,0,0]);piston.userData.crawlerSide=side;parts.crawlerPistons.push(piston);
  }

  // Wedge-shaped sensor head with one readable visor and protected optics.
  parts.head=add(sphere,oxidized,[.48,.29,.4],[0,.42,.59],[-.06,0,0],"head");
  add(box,darkMaterial,[.49,.13,.25],[0,.31,.67],[.08,0,0],"head");
  add(box,rubber,[.39,.075,.045],[0,.435,.79],[-.04,0,0],"head");
  for(const x of [-.13,0,.13]){const eye=add(sphere,redGlow,[.045,.048,.025],[x,.44,.822],[0,0,0],"head");parts.crawlerEyes.push(eye);}
  add(box,brass,[.13,.055,.055],[0,.34,.81],[.08,0,0],"head");
  for(const side of [-1,1]){
    add(box,warning,[.09,.1,.22],[side*.31,.38,.63],[0,0,side*.08],"head");
    const feeler=add(cylinder,darkMaterial,[.018,.3,.018],[side*.18,.67,.66],[.66,0,side*.2],"head");feeler.userData.crawlerSide=side;parts.crawlerFeelers.push(feeler);

    // Twin powered mandibles: armored roots, black drill bodies, replaceable brass tips.
    const jawRoot=add(box,side<0?rust:oxidized,[.085,.085,.265],[side*.17,.265,.9],[.025,side*.12,side*.065],"head");
    const drill=add(cone,darkMaterial,[.105,.39,.105],[side*.12,.245,1.18],[Math.PI/2,0,side*.1],"head");
    const tip=add(cone,brass,[.07,.12,.07],[side*.12,.245,1.42],[Math.PI/2,0,side*.1],"head");
    for(const jaw of [jawRoot,drill,tip]){jaw.userData.crawlerSide=side;parts.jaws.push(jaw);}
    add(torus,brass,[.15,.15,.15],[side*.12,.245,1.0],[Math.PI/2,0,0],"head");
    for(let toothIndex=0;toothIndex<3;toothIndex+=1){
      const angle=toothIndex*Math.PI*.72+(side>0?Math.PI*.3:0),radius=.072,z=1.08+toothIndex*.115;
      const tooth=add(box,toothIndex===1?steel:brass,[.018,.04,.038],[side*.12+Math.cos(angle)*radius,.245+Math.sin(angle)*radius,z],[0,0,angle],"head");
      tooth.userData.crawlerSide=side;tooth.userData.drillPhase=angle;tooth.userData.drillRadius=radius;tooth.userData.drillCenterX=side*.12;tooth.userData.drillCenterY=.245;parts.crawlerDrills.push(tooth);
    }
  }

  // One real head rig keeps the shell, visor, eyes, antennae and tools together.
  const headPivot=new THREE.Vector3(0,.4,.61),headRig=new THREE.Group();headRig.name="crawler-head-rig";headRig.position.copy(headPivot);headRig.userData.basePosition=headRig.position.clone();headRig.userData.baseRotation=headRig.rotation.clone();headRig.userData.baseScale=headRig.scale.clone();
  const headChildren=group.children.filter((child)=>child.name==="head");
  for(const child of headChildren){group.remove(child);child.position.sub(headPivot);child.userData.basePosition.copy(child.position);headRig.add(child);}
  for(const tooth of parts.crawlerDrills){tooth.userData.drillCenterX-=headPivot.x;tooth.userData.drillCenterY-=headPivot.y;}
  group.add(headRig);parts.head=headRig;

  // Hidden reusable malfunction rig for stunned and death effects.
  const smokeOrigins=[[-.26,.55,-.28],[.22,.48,-.04],[-.08,.58,.22],[.28,.52,.32]];
  smokeOrigins.forEach((origin,index)=>{const smokeMaterial=new THREE.MeshBasicMaterial({color:index%2?0x172126:0x0b1115,transparent:true,opacity:0,depthWrite:false});const puff=add(sphere,smokeMaterial,[.16,.12,.16],origin);puff.visible=false;puff.userData.crawlerDamageFx=true;puff.userData.fxPhase=index*.23;parts.crawlerSmoke.push(puff);});
  const sparkOrigins=[[-.3,.58,-.08],[.31,.47,.18],[-.13,.66,.3],[.17,.62,-.35],[0,.5,.46],[.34,.34,-.18]];
  sparkOrigins.forEach((origin,index)=>{const sparkMaterial=new THREE.MeshBasicMaterial({color:index%2?0x59c8ff:0xb7f4ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});const spark=add(box,sparkMaterial,[.018,.11,.018],origin,[index*.7,0,index*1.1]);spark.visible=false;spark.userData.crawlerDamageFx=true;spark.userData.fxPhase=index*.71;parts.crawlerSparks.push(spark);});

  // Six wide articulated legs with armored knees and ground-gripping feet.
  const rows=[{z:.35,sweep:.15,reach:.76},{z:-.02,sweep:0,reach:.82},{z:-.39,sweep:-.15,reach:.75}];
  for(const side of [-1,1])rows.forEach((row,rowIndex)=>{
    const hip=new THREE.Vector3(side*.4,.34,row.z),knee=new THREE.Vector3(side*.62,.2,row.z+row.sweep),ankle=new THREE.Vector3(side*row.reach,.055,row.z+row.sweep*1.75);
    const upper=add(cylinder,steel,[1,1,1],[0,0,0]),joint=add(sphere,rowIndex===1?rust:brass,[.092,.085,.092],knee.toArray()),lower=add(cylinder,oxidized,[1,1,1],[0,0,0]);
    const foot=add(capsule,rubber,[.19,.06,.22],[side*(row.reach+.065),.035,ankle.z+.04],[0,side*Math.PI/2,-row.sweep*.65]);
    alignCrawlerSegment(upper,hip,knee,.058);alignCrawlerSegment(lower,knee,ankle,.05);
    for(const segment of [upper,lower]){segment.userData.basePosition.copy(segment.position);segment.userData.baseRotation.copy(segment.rotation);segment.userData.baseScale.copy(segment.scale);}
    parts.crawlerLegSets.push({side,rowIndex,upper,joint,lower,foot,hip:hip.clone(),knee:knee.clone(),ankle:ankle.clone()});parts.legs.push(upper,joint,lower,foot);
  });

  // Rear excavation drive, exhausts and a small status lamp.
  add(box,darkMaterial,[.38,.25,.22],[0,.39,-.68]);
  add(torus,rust,[.24,.24,.24],[0,.4,-.82],[Math.PI/2,0,0]);
  add(sphere,steel,[.14,.14,.08],[0,.4,-.845]);
  for(const side of [-1,1]){add(cylinder,darkMaterial,[.055,.25,.055],[side*.28,.69,-.48],[0,0,-side*.07]);add(torus,glowMaterial,[.07,.07,.07],[side*.28,.815,-.495],[Math.PI/2,0,0]);}
  add(box,glowMaterial,[.09,.025,.04],[0,.285,-.805]);
}
const motor={filterType:"lowpass",filterFrequency:620,q:1.35,vibratoRate:8.2,vibratoDepth:5.5};
const strainedMotor={filterType:"lowpass",filterFrequency:880,q:1.6,vibratoRate:13,vibratoDepth:11,vibratoWave:"triangle"};
const metal={filterType:"bandpass",filterFrequency:1380,q:3.2,attack:.002};
const heavyMetal={filterType:"bandpass",filterFrequency:720,q:2.4,attack:.002};
const grit={filterType:"bandpass",filterFrequency:1050,q:.9};
const dirt={filterType:"lowpass",filterFrequency:540,q:.8};
const sparks={filterType:"highpass",filterFrequency:1850,q:1.5};

function signature({attack,death,idle,level,base,tone,noise}){
  if(death){crawlerSoundEvents.death(level,{tone,noise});return;}
  if(idle){crawlerSoundEvents.idle(level,{tone,noise});return;}
  if(attack){crawlerSoundEvents.attack(level,{tone,noise});return;}
  crawlerSoundEvents.hurt(level,{tone,noise});
}

const crawlerSoundEvents={
  spawn(volume,{tone,noise}){
    tone(39,.42,volume*.72,"triangle",2.85,0,motor);
    tone(78,.31,volume*.5,"sawtooth",1.65,.07,strainedMotor);
    noise(.11,volume*.42,.08,heavyMetal);
    tone(317,.045,volume*.54,"triangle",.48,.22,metal);
    tone(521,.028,volume*.34,"sine",.72,.31,{filterType:"bandpass",filterFrequency:2100,q:4,attack:.002});
  },
  idle(volume,{tone,noise}){
    tone(54,.36,volume*.43,"sawtooth",1.07,0,motor);
    tone(109,.22,volume*.22,"triangle",.94,.035,{...motor,vibratoRate:5.4,vibratoDepth:3});
    noise(.045,volume*.18,.105,grit);
    tone(287,.038,volume*.37,"triangle",.52,.14,metal);
    tone(173,.05,volume*.25,"square",1.28,.245,{filterType:"bandpass",filterFrequency:1180,q:2.7,attack:.002});
  },
  step(volume,{tone,noise}){
    tone(41,.085,volume*.66,"triangle",.48,0,{filterType:"lowpass",filterFrequency:240,q:1.2,attack:.002});
    noise(.047,volume*.53,.004,heavyMetal);
    tone(293,.032,volume*.35,"triangle",.43,.016,metal);
  },
  attack(volume,{tone,noise}){
    tone(57,.24,volume*.72,"sawtooth",4.8,0,strainedMotor);
    tone(114,.2,volume*.4,"square",2.65,.025,{...strainedMotor,filterFrequency:1250,vibratoRate:22,vibratoDepth:18});
    noise(.18,volume*.76,.035,grit);
    tone(337,.055,volume*.58,"triangle",.31,.13,metal);
    tone(49,.17,volume*.84,"triangle",.38,.19,{filterType:"lowpass",filterFrequency:260,q:1.4,attack:.002});
    noise(.07,volume*.56,.205,heavyMetal);
  },
  hurt(volume,{tone,noise}){
    noise(.105,volume*.76,0,sparks);
    tone(428,.075,volume*.72,"sawtooth",.19,0,{filterType:"bandpass",filterFrequency:1800,q:2.5,attack:.002,vibratoRate:31,vibratoDepth:24});
    tone(69,.18,volume*.68,"triangle",.42,.028,{filterType:"lowpass",filterFrequency:310,q:1.4,attack:.002});
    tone(817,.024,volume*.38,"square",.36,.082,{filterType:"highpass",filterFrequency:1550,q:2.2,attack:.001});
  },
  stunned(volume,{tone,noise}){
    tone(66,.34,volume*.53,"sawtooth",.76,0,{...strainedMotor,vibratoRate:17,vibratoDepth:15});
    noise(.22,volume*.46,0,sparks);
    [0,.067,.154,.263].forEach((delay,index)=>{
      tone(index%2?693:421,.027,volume*(.5-index*.055),"square",.24,delay,{filterType:"highpass",filterFrequency:1600,q:2.8,attack:.001});
      if(index===1||index===3)noise(.026,volume*.32,delay,sparks);
    });
  },
  death(volume,{tone,noise}){
    tone(104,.34,volume,"sawtooth",.19,0,{...strainedMotor,vibratoRate:19,vibratoDepth:14});
    noise(.32,volume*.88,.015,heavyMetal);
    tone(47,.72,volume*.84,"triangle",.22,.12,{filterType:"lowpass",filterFrequency:250,q:1.5,attack:.004});
    [
      [.07,311,1,.6],[.18,197,.42,.54],[.32,433,.3,.43],[.49,151,.24,.36],
    ].forEach(([delay,frequency,endRatio,level])=>{
      tone(frequency,.065,volume*level,"triangle",endRatio,delay,metal);
      noise(.052,volume*level*.8,delay,grit);
    });
    tone(29,.16,volume*.58,"square",.7,.64,{filterType:"lowpass",filterFrequency:180,q:1.2,attack:.002});
  },
};
function burrowSound(phase,volume,{tone,noise}){
  if(phase==="enter"){
    tone(132,.9,volume*.88,"sawtooth",.24,0,{...strainedMotor,vibratoRate:24,vibratoDepth:21});
    tone(49,.96,volume*.74,"triangle",.57,.025,{filterType:"lowpass",filterFrequency:310,q:1.3,attack:.01});
    noise(.82,volume*.76,0,dirt);noise(.42,volume*.42,.12,grit);
    [0,.115,.235,.365,.505,.66,.82].forEach((delay,index)=>tone(118+index*9,.042,volume*(.46+index*.035),index%2?"square":"triangle",.38,delay,heavyMetal));
  }else if(phase==="travel"){
    tone(43,.24,volume*.76,"triangle",.82,0,{filterType:"lowpass",filterFrequency:230,q:1.2,vibratoRate:12,vibratoDepth:3});
    tone(91,.1,volume*.34,"sawtooth",.68,.018,{...motor,filterFrequency:460,vibratoRate:21,vibratoDepth:8});
    noise(.19,volume*.5,0,dirt);noise(.075,volume*.28,.025,grit);
  }else{
    tone(38,.78,volume*.92,"sawtooth",5.2,0,{...strainedMotor,vibratoRate:20,vibratoDepth:17});
    noise(.52,volume*.9,0,dirt);noise(.28,volume*.58,.1,grit);
    tone(52,.22,volume*.9,"triangle",.31,.05,{filterType:"lowpass",filterFrequency:270,q:1.5,attack:.003});
    [0,.085,.18,.29,.425,.58,.75].forEach((delay,index)=>tone(97+index*41,.058,volume*(.52+index*.03),index<3?"square":"triangle",1.35,delay,index<3?heavyMetal:metal));
  }
}

export default defineEnemy({
  id:1,name:"Scrap Crawler",slug:"scrap-crawler",
  stats:{health:55,damage:5,speed:2.5,range:1.2,cooldown:1.1,color:0x7e8c82,scale:0.65,style:"melee"},
model:{build:buildModel,builder:"scrap-crawler",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:92,wave:"square",attack:1.15,recipe:"scrape",signature,events:crawlerSoundEvents,burrow:burrowSound},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:4,skillMotion:"burrow",stunnedDuration:2.2,deathDuration:2.4,vanishDuration:1},
skill:{name:"Burrow",handler:"scrapBurrow",cooldown:5,minDistance:4,maxRange:9,requiresLineOfSight:true,color:0xd8883b,targetDistance:10,projectile:false,indicator:{type:"damage",radius:.42,anchor:"origin"}},
});

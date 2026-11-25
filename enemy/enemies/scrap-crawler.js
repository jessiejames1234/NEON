import {defineEnemy} from "../define-enemy.js";
import {alignCrawlerSegment,placeCrawlerLegAccessories} from "../model-utils.js";

// E01's current identity is a compact autonomous tunnel borer. The broad
// beetle shell, integrated auger and six mining legs form one clean silhouette
// instead of the previous tower of salvage parts.
function buildModel(ctx){
  const {add,group,parts,box,sphere,cylinder,cone,torus,capsule,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,THREE}=ctx;
  const armor=makeMaterial(0x174f55,.1,.78);
  const armorEdge=makeMaterial(0x4f7778,.035,.9);
  const blackSteel=makeMaterial(0x071418,.015,.92);
  const tungsten=makeMaterial(0x82928d,.025,.94);
  const copper=makeMaterial(0xb46c26,.07,.76);
  const hazard=makeMaterial(0xe2a72b,.08,.7);
  const burnt=makeMaterial(0x47291f,.025,.7);
  bodyMaterial.color.setHex(0x123b40);bodyMaterial.emissive.setHex(0x061b1e);bodyMaterial.metalness=.82;bodyMaterial.roughness=.35;
  accentMaterial.color.setHex(0x2b6870);accentMaterial.emissive.setHex(0x0b3035);accentMaterial.metalness=.86;accentMaterial.roughness=.29;
  glowMaterial.color.setHex(0x44f6df);

  // Monolithic belly and beetle carapace.
  parts.body=add(sphere,blackSteel,[1.5,.72,2.08],[0,.48,-.12]);
  add(sphere,bodyMaterial,[1.42,.67,1.98],[0,.55,-.12]);
  add(box,blackSteel,[1.18,.16,1.62],[0,.17,-.12]);
  const centerShell=add(sphere,armor,[1.38,.35,1.14],[0,.75,-.16]);parts.crawlerArmor.push(centerShell);
  const frontShell=add(sphere,accentMaterial,[1.3,.3,.68],[0,.69,.42],[-.08,0,0]);parts.crawlerArmor.push(frontShell);
  const rearShell=add(sphere,armorEdge,[1.18,.27,.64],[0,.67,-.7],[.08,0,0]);parts.crawlerArmor.push(rearShell);
  add(box,glowMaterial,[.045,.024,.7],[0,.925,-.13]);
  // Two restrained field repairs preserve the "Scrap" identity without
  // covering the silhouette in loose decoration.
  add(box,burnt,[.31,.025,.2],[-.34,.925,-.48],[0,.14,.08]);
  add(box,copper,[.23,.027,.07],[.29,.922,.15],[0,-.24,0]);

  // Recessed power turbine: visible and luminous, but protected inside the shell.
  add(cylinder,blackSteel,[.27,.055,.27],[0,.865,-.43]);
  add(torus,tungsten,[.27,.27,.27],[0,.915,-.43],[Math.PI/2,0,0]);
  add(torus,glowMaterial,[.18,.18,.18],[0,.921,-.43],[Math.PI/2,0,0]);

  // Heavy side carapaces hide the hips and create a wide beetle silhouette.
  for(const side of [-1,1]){
    const sidePlate=add(sphere,side<0?armor:accentMaterial,[.5,.56,1.34],[side*.69,.49,-.12],[0,side*.035,side*.03]);
    parts.crawlerArmor.push(sidePlate);
    add(box,blackSteel,[.13,.2,.9],[side*.82,.29,-.12]);
    add(box,glowMaterial,[.025,.05,.72],[side*.87,.48,-.12]);
    add(box,hazard,[.1,.15,.25],[side*.83,.52,.54],[0,side*.07,side*.07]);
    add(box,burnt,[.1,.14,.24],[side*.81,.45,-.73],[0,-side*.06,-side*.05]);
  }
  add(box,burnt,[.025,.22,.34],[-.865,.5,-.24],[0,0,-.08]);
  add(box,tungsten,[.027,.11,.22],[.866,.43,.23],[0,0,.12]);

  // Low armored sensor head. Everything named "head" is re-parented to one
  // pivot so attacks, burrowing and stunned motion remain fully articulated.
  parts.head=add(sphere,armor,[1.04,.57,.76],[0,.42,.82],[-.08,0,0],"head");
  add(box,blackSteel,[.96,.2,.45],[0,.28,.92],[.08,0,0],"head");
  add(sphere,armorEdge,[.96,.24,.52],[0,.59,.84],[-.12,0,0],"head");
  add(box,hazard,[.27,.035,.19],[0,.705,.83],[-.18,0,0],"head");
  add(box,blackSteel,[.75,.1,.055],[0,.46,1.18],[-.02,0,0],"head");
  const visor=add(box,redGlow,[.57,.045,.025],[0,.47,1.215],[-.02,0,0],"head");parts.crawlerEyes.push(visor);
  for(const side of [-1,1]){
    const optic=add(sphere,redGlow,[.055,.055,.03],[side*.39,.47,1.225],[0,0,0],"head");parts.crawlerEyes.push(optic);
    add(box,blackSteel,[.16,.22,.42],[side*.57,.38,.88],[0,side*.1,side*.08],"head");
    add(box,tungsten,[.1,.13,.27],[side*.62,.3,1.08],[0,side*.14,side*.05],"head");
    const feeler=add(cylinder,armorEdge,[.02,.36,.02],[side*.49,.65,1.04],[Math.PI/2-side*.1,0,side*.3],"head");
    feeler.userData.crawlerSide=side;parts.crawlerFeelers.push(feeler);

    // Side mandibles brace the bore and open during the melee strike.
    const jawRoot=add(box,copper,[.12,.12,.34],[side*.35,.23,1.17],[.06,side*.13,side*.07],"head");
    const jawBlade=add(cone,tungsten,[.115,.44,.115],[side*.4,.2,1.48],[Math.PI/2,0,-side*.11],"head");
    const jawHook=add(cone,hazard,[.07,.2,.07],[side*.46,.18,1.74],[Math.PI/2,0,-side*.19],"head");
    for(const jaw of [jawRoot,jawBlade,jawHook]){jaw.userData.crawlerSide=side;parts.jaws.push(jaw);}
  }

  // One large integrated auger replaces the former dangling tool cluster.
  add(cylinder,blackSteel,[.25,.36,.25],[0,.23,1.23],[Math.PI/2,0,0],"head");
  add(torus,copper,[.3,.3,.3],[0,.23,1.39],[0,0,0],"head");
  add(torus,glowMaterial,[.23,.23,.23],[0,.23,1.415],[0,0,0],"head");
  add(cone,tungsten,[.27,.94,.27],[0,.23,1.82],[Math.PI/2,0,0],"head");
  // Tapered auger bands and attached cutting lugs connect the collar to the tip.
  add(torus,copper,[.225,.225,.225],[0,.23,1.56],[0,0,0],"head");
  add(torus,blackSteel,[.17,.17,.17],[0,.23,1.73],[0,0,0],"head");
  add(torus,copper,[.11,.11,.11],[0,.23,1.88],[0,0,0],"head");
  [[1.5,.215,0],[1.5,.215,Math.PI],[1.66,.155,Math.PI*.5],[1.66,.155,Math.PI*1.5],[1.81,.095,.35],[1.81,.095,Math.PI+.35]].forEach(([z,radius,angle],toothIndex)=>{
    const tooth=add(box,toothIndex%2?copper:hazard,[.105,.045,.055],[Math.cos(angle)*radius,.23+Math.sin(angle)*radius,z],[0,0,angle],"head");
    tooth.userData.crawlerSide=1;tooth.userData.drillPhase=angle;tooth.userData.drillRadius=radius;tooth.userData.drillCenterX=0;tooth.userData.drillCenterY=.23;parts.crawlerDrills.push(tooth);
  });

  const headPivot=new THREE.Vector3(0,.4,.82),headRig=new THREE.Group();
  headRig.name="crawler-head-rig";headRig.position.copy(headPivot);headRig.userData.basePosition=headRig.position.clone();headRig.userData.baseRotation=headRig.rotation.clone();headRig.userData.baseScale=headRig.scale.clone();
  const headChildren=group.children.filter((child)=>child.name==="head");
  for(const child of headChildren){group.remove(child);child.position.sub(headPivot);child.userData.basePosition.copy(child.position);headRig.add(child);}
  for(const tooth of parts.crawlerDrills){tooth.userData.drillCenterX-=headPivot.x;tooth.userData.drillCenterY-=headPivot.y;}
  group.add(headRig);parts.head=headRig;

  // Six splayed hydraulic mining legs, built as a stable alternating tripod.
  const rows=[{z:.48,sweep:.22,reach:1.26},{z:-.05,sweep:0,reach:1.34},{z:-.58,sweep:-.22,reach:1.22}];
  for(const side of [-1,1])rows.forEach((row,rowIndex)=>{
    const hip=new THREE.Vector3(side*.67,.36,row.z),knee=new THREE.Vector3(side*.96,.2,row.z+row.sweep),ankle=new THREE.Vector3(side*row.reach,.055,row.z+row.sweep*1.72);
    const upper=add(cylinder,blackSteel,[1,1,1],[0,0,0]);
    const joint=add(sphere,rowIndex===1?hazard:copper,[.145,.13,.145],knee.toArray());
    const lower=add(cylinder,rowIndex===1?tungsten:armorEdge,[1,1,1],[0,0,0]);
    const foot=add(capsule,tungsten,[.29,.085,.34],[side*(row.reach+.08),.035,ankle.z+.07],[0,side*Math.PI/2,-row.sweep*.55]);
    const brace=add(cylinder,copper,[1,1,1],[0,0,0]);
    const kneeArmor=add(box,side<0&&rowIndex===2?burnt:armor,[.2,.13,.25],knee.toArray(),[0,side*.08,0]);
    const ankleArmor=add(box,blackSteel,[.22,.1,.27],ankle.toArray(),[0,side*.06,0]);
    const toes=[0,1].map((toeIndex)=>add(cone,toeIndex===0?tungsten:hazard,[.055,.2,.055],[0,0,0],[Math.PI/2,0,0]));
    alignCrawlerSegment(upper,hip,knee,.075);alignCrawlerSegment(lower,knee,ankle,.065);
    for(const segment of [upper,lower]){segment.userData.basePosition.copy(segment.position);segment.userData.baseRotation.copy(segment.rotation);segment.userData.baseScale.copy(segment.scale);}
    const leg={side,rowIndex,upper,joint,lower,foot,brace,kneeArmor,ankleArmor,toes,hip:hip.clone(),knee:knee.clone(),ankle:ankle.clone()};
    placeCrawlerLegAccessories(leg,hip,knee,ankle);parts.crawlerLegSets.push(leg);parts.legs.push(upper,joint,lower,foot,brace,kneeArmor,ankleArmor,...toes);
  });

  // Exposed hydraulic rams communicate weight without adding a tall profile.
  for(const side of [-1,1]){
    const piston=add(cylinder,copper,[.04,.38,.04],[side*.6,.3,-.04],[Math.PI/2,0,0]);piston.userData.crawlerSide=side;parts.crawlerPistons.push(piston);
    add(cylinder,blackSteel,[.11,.3,.11],[side*.35,.36,-.89],[Math.PI/2,0,0]);
    add(torus,glowMaterial,[.115,.115,.115],[side*.35,.36,-1.05],[0,0,0]);
  }
  // The rear is an exposed replacement drive rather than a flat bumper.
  add(cylinder,blackSteel,[.35,.3,.35],[0,.38,-1.02],[Math.PI/2,0,0]);
  add(torus,copper,[.36,.36,.36],[0,.38,-1.19],[0,0,0]);
  add(torus,glowMaterial,[.25,.25,.25],[0,.38,-1.205],[0,0,0]);
  add(sphere,blackSteel,[.18,.18,.05],[0,.38,-1.23]);
  add(box,armorEdge,[.16,.28,.18],[-.4,.42,-1.08],[0,0,-.13]);
  add(box,burnt,[.14,.22,.16],[.4,.38,-1.08],[0,0,.2]);
  add(box,glowMaterial,[.13,.028,.025],[0,.16,-1.12]);

  // Reusable damage effects retain the existing stunned/death presentation.
  const smokeOrigins=[[-.3,.66,-.42],[.28,.58,-.12],[-.16,.72,.24],[.31,.56,.42]];
  smokeOrigins.forEach((origin,index)=>{const smokeMaterial=new THREE.MeshBasicMaterial({color:index%2?0x172126:0x0b1115,transparent:true,opacity:0,depthWrite:false});const puff=add(sphere,smokeMaterial,[.16,.12,.16],origin);puff.visible=false;puff.userData.crawlerDamageFx=true;puff.userData.fxPhase=index*.23;parts.crawlerSmoke.push(puff);});
  const sparkOrigins=[[-.42,.57,-.15],[.4,.5,.2],[-.14,.81,.28],[.18,.76,-.51],[0,.5,.7],[.48,.35,-.35]];
  sparkOrigins.forEach((origin,index)=>{const sparkMaterial=new THREE.MeshBasicMaterial({color:index%2?0x59c8ff:0xb7f4ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});const spark=add(box,sparkMaterial,[.018,.11,.018],origin,[index*.7,0,index*1.1]);spark.visible=false;spark.userData.crawlerDamageFx=true;spark.userData.fxPhase=index*.71;parts.crawlerSparks.push(spark);});
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

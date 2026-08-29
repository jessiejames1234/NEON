import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,diamond,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,THREE}=ctx;
  const burntMaterial=makeMaterial(0x17100e,.015,.82);
  const rustMaterial=makeMaterial(0x87451f,.055,.7);
  const wingMaterial=makeMaterial(0x294b62,.09,.76);
  const warningMaterial=makeMaterial(0xd49b32,.13,.62);

  // A sharp floating diamond replaces E01's long rectangular crawler chassis.
  // The off-center spine and plates make the airframe look twisted by impact.
  parts.body=add(diamond,bodyMaterial,[1.02,.52,1.34],[0,.91,-.03],[0,.08,.04]);
  add(box,darkMaterial,[.38,.3,1.18],[-.12,.94,-.08],[0,-.05,-.08]);
  add(box,wingMaterial,[.78,.12,.46],[-.2,1.23,-.22],[.04,-.12,.03]);
  add(box,burntMaterial,[.5,.1,.38],[.3,1.16,-.38],[-.08,.2,.08]);
  add(box,rustMaterial,[.32,.09,.3],[.46,1.25,-.08],[.14,.24,.16]);

  // One large cyclops gimbal gives E02 a unique face instead of E01's row of
  // eyes. The crooked lower guard makes the impact damage visible from ahead.
  parts.head=add(sphere,darkMaterial,[.46,.4,.43],[-.06,.86,.78],[0,0,0],"head");
  add(torus,warningMaterial,[.44,.44,.44],[-.06,.86,1.01],[0,0,.12],"head");
  const eye=add(sphere,redGlow,[.2,.2,.075],[-.06,.86,1.045],[0,0,0],"head");
  add(box,burntMaterial,[.54,.1,.2],[.03,.62,.83],[.12,.08,-.18],"head");

  // Intact left lift wing and ducted fan.
  add(box,darkMaterial,[.92,.11,.18],[-.85,.93,-.12],[0,-.12,-.03]);
  const intactWing=add(box,wingMaterial,[.72,.14,.52],[-.82,1.02,-.15],[.02,-.18,.02]);
  add(box,accentMaterial,[.3,.09,.64],[-1.18,1.04,-.18],[.02,-.12,0]);
  add(torus,wingMaterial,[.7,.7,.7],[-1.42,.94,-.19],[Math.PI/2,0,-.08]);
  add(cylinder,darkMaterial,[.13,.24,.13],[-1.42,.94,-.19]);
  const workingRotor=add(box,accentMaterial,[.88,.035,.14],[-1.42,.97,-.19],[0,0,0]);parts.rotors.push(workingRotor);
  add(sphere,glowMaterial,[.1,.055,.1],[-1.42,1.01,-.19]);

  // Destroyed right lift assembly: no complete fan ring and no working rotor.
  // The detached-looking ring segments, bent hub, and hanging cable make the
  // word "Broken" readable directly from the silhouette.
  add(box,burntMaterial,[.62,.12,.18],[.73,.9,-.1],[.08,.2,-.18]);
  add(box,rustMaterial,[.42,.18,.38],[.72,1.02,-.04],[-.16,.24,.2]);
  const brokenHub=add(cylinder,rustMaterial,[.13,.34,.13],[1.06,.81,-.12],[0,0,.32]);
  const brokenBladeUpper=add(box,rustMaterial,[.48,.07,.13],[1.27,.99,-.18],[0,.34,.32]);
  const brokenBladeLower=add(box,burntMaterial,[.3,.06,.12],[1.14,.65,-.05],[0,-.42,-.48]);
  const brokenShard=add(cone,rustMaterial,[.14,.38,.14],[1.48,.79,-.31],[0,0,-.92]);
  const hangingCable=add(cylinder,darkMaterial,[.035,.62,.035],[.95,.5,-.03],[.25,0,.18]);
  const faultLight=add(sphere,redGlow,[.065,.065,.065],[1.05,.2,.03]);

  // Persistent localized malfunction effects. These use E01's inexpensive
  // reusable smoke/spark runtime, but every emitter is confined to E02's
  // destroyed right lift assembly.
  [[.82,.88,-.02],[.98,.76,-.09],[1.13,.86,-.17],[1.28,.97,-.25],[1.39,.78,-.16]].forEach((origin,index)=>{
    const smokeMaterial=new THREE.MeshBasicMaterial({color:index%2?0x141b20:0x090d10,transparent:true,opacity:0,depthWrite:false});
    const puff=add(sphere,smokeMaterial,[.13,.1,.13],origin);puff.visible=false;puff.userData.crawlerDamageFx=true;puff.userData.fxPhase=index*.31;parts.crawlerSmoke.push(puff);
  });
  [[.82,.91,.01],[.96,.81,-.04],[1.08,.68,-.02],[1.16,.93,-.19],[1.29,.82,-.1],[1.38,.98,-.25],[1.48,.74,-.17],[1.02,.58,-.01]].forEach((origin,index)=>{
    const sparkMaterial=new THREE.MeshBasicMaterial({color:index%2?0x58d8ff:0xd8f8ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const spark=add(box,sparkMaterial,[.015,.09,.015],origin,[index*.63,0,index*.91]);spark.visible=false;spark.userData.crawlerDamageFx=true;spark.userData.fxPhase=index*.77;parts.crawlerSparks.push(spark);
  });
  // Secondary emitters cover the complete airframe, but the runtime activates
  // them only for stunned and death states.
  const failureSmoke=[];
  [[-.86,1.04,-.15],[-.42,.83,.48],[-.08,1.18,-.3],[.34,.72,.42],[.38,.8,-.76],[0,.5,-.12]].forEach((origin,index)=>{
    const smokeMaterial=new THREE.MeshBasicMaterial({color:index%2?0x182026:0x080c0f,transparent:true,opacity:0,depthWrite:false});
    const puff=add(sphere,smokeMaterial,[.14,.105,.14],origin);puff.visible=false;puff.userData.crawlerDamageFx=true;puff.userData.fxPhase=index*.19;failureSmoke.push(puff);
  });
  const failureSparks=[];
  [[-1.38,.96,-.18],[-.78,1.08,-.12],[-.38,.52,.76],[-.08,.88,1.02],[.22,1.2,-.32],[.46,.54,.54],[.36,.76,-.88],[-.46,1.2,-.7],[0,.48,-.14],[.68,1.22,-.46]].forEach((origin,index)=>{
    const sparkMaterial=new THREE.MeshBasicMaterial({color:index%3===0?0xffb247:index%2?0x55d9ff:0xdafaff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const spark=add(box,sparkMaterial,[.016,.105,.016],origin,[index*.47,0,index*.83]);spark.visible=false;spark.userData.crawlerDamageFx=true;spark.userData.fxPhase=index*.59;failureSparks.push(spark);
  });

  // An underslung three-barrel barrage rack distinguishes its ranged role.
  add(box,burntMaterial,[.58,.24,.56],[-.08,.5,.46],[.08,0,0]);
  const barrageBarrels=[];
  for(const x of [-.22,-.06,.1]){
    const barrel=add(cylinder,darkMaterial,[.065,.7,.065],[x,.48,.83],[Math.PI/2,0,0]);parts.weapons.push(barrel);barrageBarrels.push(barrel);
    add(cylinder,glowMaterial,[.085,.04,.085],[x,.48,1.18],[Math.PI/2,0,0]);
  }

  // Only the left rear thruster still burns. The right is crushed and cold.
  add(cylinder,darkMaterial,[.2,.42,.2],[-.35,.82,-.77],[Math.PI/2,0,0]);
  add(torus,accentMaterial,[.31,.31,.31],[-.35,.82,-.98],[Math.PI/2,0,0]);
  const workingThruster=add(cone,glowMaterial,[.14,.34,.14],[-.35,.82,-1.15],[-Math.PI/2,0,0]);
  const deadThruster=add(cylinder,burntMaterial,[.2,.3,.2],[.38,.73,-.76],[Math.PI/2,.22,.18]);
  add(box,rustMaterial,[.28,.1,.22],[.48,.68,-.98],[.24,.18,.3]);

  // Uneven tail fins and an exposed lower reactor complete the wrecked
  // gunship profile without adding particle-heavy decoration.
  const intactTail=add(box,wingMaterial,[.12,.48,.42],[-.48,1.19,-.72],[-.18,0,-.28]);
  const damagedTail=add(box,rustMaterial,[.1,.28,.31],[.31,1.1,-.77],[.3,.14,.45]);
  const reactor=add(diamond,glowMaterial,[.25,.2,.25],[0,.5,-.12],[0,0,0]);
  const reactorRing=add(torus,warningMaterial,[.46,.46,.46],[0,.5,-.12],[Math.PI/2,0,0]);parts.rings.push(reactorRing);
  add(box,darkMaterial,[.58,.07,.42],[0,.4,-.15],[.05,0,0]);

  // A snapped antenna and loose armor shard add damage details without making
  // the drone resemble a walking scrap creature.
  const antenna=add(cylinder,darkMaterial,[.03,.56,.03],[-.28,1.47,-.12],[0,0,-.48]);
  add(sphere,glowMaterial,[.05,.05,.05],[-.52,1.71,-.12]);
  const loosePlate=add(box,rustMaterial,[.35,.07,.25],[.68,1.32,-.48],[.28,-.3,.12]);

  parts.brokenDrone={
    eye,intactWing,workingRotor,brokenHub,brokenBladeUpper,brokenBladeLower,brokenShard,hangingCable,faultLight,
    barrageBarrels,workingThruster,deadThruster,intactTail,damagedTail,reactor,reactorRing,antenna,loosePlate,failureSmoke,failureSparks,
  };
}
function signature({level,base,tone}){[0,.045,.1].forEach((delay,index)=>tone(base*(index===1?2.15:1.25),.032,level*.75,"square",.7,delay));}

export default defineEnemy({
  id:2,name:"Broken Drone",slug:"broken-drone",
  stats:{health:30,damage:6,speed:2,range:10,cooldown:1.8,color:0x729c9a,scale:0.7,style:"ranged"},
model:{build:buildModel,builder:"broken-drone",flying:true,surface:"metal",hazardArmor:false},
sound:{base:245,wave:"sine",attack:1.8,recipe:"glitch",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.4,skillMotion:"rangedBurst",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Barrage",handler:"brokenDroneBarrage",cooldown:8,color:0x68e7ff,targetDistance:10,projectile:true},
});

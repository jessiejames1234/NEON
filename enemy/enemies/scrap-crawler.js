import {defineEnemy} from "../define-enemy.js";
import {alignCrawlerSegment} from "../model-utils.js";

function buildModel(ctx){
  const {add,parts,box,sphere,cylinder,cone,torus,capsule,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,THREE}=ctx;
  const rust=makeMaterial(0x633521,.045,.6),hazard=makeMaterial(0xa96c24,.075,.54),shell=makeMaterial(0x3d514f,.055,.5);
  bodyMaterial.color.setHex(0x344744);bodyMaterial.emissive.setHex(0x172522);accentMaterial.color.setHex(0x53635f);accentMaterial.emissive.setHex(0x202c2a);
  parts.body=add(capsule,darkMaterial,[.68,.54,1.12],[0,.38,-.08],[Math.PI/2,0,0]);add(capsule,bodyMaterial,[.59,.44,.98],[0,.43,-.08],[Math.PI/2,0,0]);add(box,darkMaterial,[.53,.1,.78],[0,.2,-.08]);
  for(const side of [-1,1]){parts.crawlerArmor.push(add(box,side<0?rust:shell,[.095,.25,.35],[side*.48,.45,.2],[0,side*.04,side*.05]),add(box,side>0?rust:shell,[.09,.23,.31],[side*.47,.43,-.34],[0,-side*.04,-side*.045]));const piston=add(cylinder,hazard,[.032,.3,.032],[side*.5,.27,-.06],[Math.PI/2,0,0]);piston.userData.crawlerSide=side;parts.crawlerPistons.push(piston);}
  parts.head=add(box,shell,[.56,.25,.39],[0,.39,.57],[-.08,0,0],"head");add(box,darkMaterial,[.47,.1,.3],[0,.275,.71],[.1,0,0],"head");add(box,darkMaterial,[.36,.06,.045],[0,.43,.79],[-.06,0,0],"head");
  for(const x of [-.135,-.045,.045,.135])add(sphere,redGlow,[.035,.038,.022],[x,.435,.815],[0,0,0],"head");
  for(const side of [-1,1]){add(box,hazard,[.085,.075,.2],[side*.275,.43,.62],[0,0,side*.09],"head");const feeler=add(cylinder,darkMaterial,[.018,.25,.018],[side*.13,.61,.7],[.78,0,side*.22],"head");feeler.userData.crawlerSide=side;parts.crawlerFeelers.push(feeler);for(const jaw of [add(box,side<0?rust:hazard,[.09,.095,.36],[side*.16,.265,.89],[.02,side*.18,side*.06],"head"),add(cone,darkMaterial,[.07,.25,.07],[side*.095,.245,1.075],[Math.PI/2,0,side*.12],"head")]){jaw.userData.crawlerSide=side;parts.jaws.push(jaw);}}
  const rows=[{z:.34,sweep:.13,reach:.72},{z:-.02,sweep:0,reach:.76},{z:-.38,sweep:-.13,reach:.7}];
  for(const side of [-1,1])rows.forEach((row,rowIndex)=>{const hip=new THREE.Vector3(side*.38,.33,row.z),knee=new THREE.Vector3(side*.59,.19,row.z+row.sweep),ankle=new THREE.Vector3(side*row.reach,.045,row.z+row.sweep*1.65);const upper=add(cylinder,darkMaterial,[1,1,1],[0,0,0]),joint=add(sphere,rowIndex===1?rust:hazard,[.09,.085,.09],knee.toArray()),lower=add(cylinder,rowIndex===1?rust:shell,[1,1,1],[0,0,0]),foot=add(box,darkMaterial,[.2,.055,.15],[side*(row.reach+.06),.035,ankle.z+.035],[0,-row.sweep*.7,0]);alignCrawlerSegment(upper,hip,knee,.055);alignCrawlerSegment(lower,knee,ankle,.048);for(const segment of [upper,lower]){segment.userData.basePosition.copy(segment.position);segment.userData.baseRotation.copy(segment.rotation);segment.userData.baseScale.copy(segment.scale);}parts.crawlerLegSets.push({side,rowIndex,upper,joint,lower,foot,hip:hip.clone(),knee:knee.clone(),ankle:ankle.clone()});parts.legs.push(upper,joint,lower,foot);});
  const plates=[[[.47,.075,.27],[-.018,.635,-.39],[-.035,.012,-.025]],[[.52,.085,.29],[.015,.655,-.12],[.018,-.012,.018]],[[.46,.072,.26],[-.025,.625,.16],[.045,.018,-.028]]];plates.forEach((p,index)=>{const armor=add(box,index===1?bodyMaterial:accentMaterial,...p);armor.userData.crawlerPlateIndex=index;parts.crawlerArmor.push(armor);});
  for(const z of [-.33,-.08,.15])add(cone,darkMaterial,[.045,.13,.045],[0,.735,z],[0,0,Math.PI]);add(cylinder,darkMaterial,[.065,.23,.065],[.23,.72,-.37],[0,0,-.08]);add(torus,darkMaterial,[.23,.23,.23],[0,.4,-.69],[Math.PI/2,0,0]);add(box,glowMaterial,[.04,.025,.15],[0,.29,-.68]);
}
function signature({attack,death,idle,level,base,tone,noise}){if(death){tone(base*1.25,.38,level*1.05,"sawtooth",.18);noise(.32,level*.9);[0,.08,.17].forEach((delay,index)=>tone(base*(1.8-index*.35),.055,level*.65,"square",.35,delay));}else if(idle){tone(base*.72,.16,level*.6,"sawtooth",1.12);tone(base*1.65,.035,level*.45,"square",.62,.12);}else{noise(attack?.15:.07,level*.55);tone(base,.12,level,"square",.48);tone(base*1.9,.035,level*.7,"triangle",.7,.075);}}
function burrowSound(phase,volume,{tone,noise}){if(phase==="enter"){tone(145,.48,volume,"sawtooth",.28);noise(.42,volume*.95);[0,.15,.3].forEach(delay=>tone(76,.08,volume*.75,"square",.55,delay));}else if(phase==="travel"){tone(54,.18,volume*.85,"triangle",.78);noise(.11,volume*.55);}else{tone(48,.58,volume,"sawtooth",4.2);noise(.34,volume);[0,.11,.22].forEach((delay,index)=>tone(105+index*58,.07,volume*.8,"square",1.35,delay));}}

export default defineEnemy({
  id:1,name:"Scrap Crawler",slug:"scrap-crawler",
  stats:{health:55,damage:5,speed:2.5,range:1.2,cooldown:1.1,color:0x7e8c82,scale:0.65,style:"melee"},
model:{build:buildModel,builder:"scrap-crawler",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:92,wave:"square",attack:1.15,recipe:"scrape",signature,burrow:burrowSound},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:4,skillMotion:"burrow",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Burrow",handler:"scrapBurrow",cooldown:5,color:0xd8883b,targetDistance:10,projectile:false,indicator:{type:"damage",radius:.42,anchor:"origin"}},
});

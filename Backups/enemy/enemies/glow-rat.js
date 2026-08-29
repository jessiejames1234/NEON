import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,box,sphere,cylinder,cone,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(sphere,bodyMaterial,[1.15,.56,.72],[0,.42,0]);parts.head=add(sphere,accentMaterial,[.55,.5,.6],[0,.48,.52],[0,0,0],"head");for(const side of [-1,1]){add(cone,glowMaterial,[.16,.32,.16],[side*.2,.84,.5],[0,0,side*.12],"head");for(const z of [-.25,.3])parts.legs.push(add(box,darkMaterial,[.13,.25,.13],[side*.34,.18,z]));for(const y of [-.05,.05])add(cylinder,glowMaterial,[.012,.55,.012],[side*.16,.45+y,.78],[Math.PI/2,0,side*.3]);add(cone,darkMaterial,[.08,.24,.08],[side*.18,.22,.72],[Math.PI/2,0,side*.22]);add(sphere,redGlow,[.045,.055,.035],[side*.13,.56,.77],[0,0,0],"head");}add(cylinder,accentMaterial,[.06,1.05,.06],[0,.46,-.82],[Math.PI/2,0,0]);add(sphere,glowMaterial,[.18,.1,.08],[0,.42,.82],[0,0,0],"head");}
function signature({level,base,tone}){tone(base*2.2,.09,level,"triangle",1.75);tone(base*3.1,.045,level*.55,"sine",.8,.055);}

export default defineEnemy({
  id:3,name:"Glow Rat",slug:"glow-rat",
  stats:{health:35,damage:8,speed:4.3,range:1.2,cooldown:1.4,color:0x9dbd62,scale:0.6,style:"skirmisher"},
model:{build:buildModel,builder:"glow-rat",flying:false,surface:"organic",hazardArmor:false},
sound:{base:330,wave:"triangle",attack:1.35,recipe:"squeak",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.6,skillMotion:"selfPulse",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Radiation Rush",handler:"glowRatRush",cooldown:9,color:0xb7ff4a,targetDistance:0,projectile:false,indicator:{type:"buff",radius:4,anchor:"self"}},
});

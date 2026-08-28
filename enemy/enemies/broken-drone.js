import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,box,sphere,cylinder,torus,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(sphere,bodyMaterial,[1,.72,1],[0,.75,0]);add(box,darkMaterial,[.95,.13,.22],[0,.73,0]);add(sphere,redGlow,[.13,.13,.08],[0,.75,.48],[0,0,0],"head");for(const side of [-1,1]){add(box,darkMaterial,[.7,.07,.08],[side*.65,.77,0]);parts.rotors.push(add(box,accentMaterial,[.62,.025,.08],[side*.98,.82,0]));add(torus,darkMaterial,[.5,.5,.5],[side*.98,.79,0],[Math.PI/2,0,0]);add(cylinder,glowMaterial,[.07,.22,.07],[side*.66,.58,.28],[Math.PI/2,0,0]);}add(box,accentMaterial,[.56,.12,.44],[0,1.04,-.08],[.12,0,0]);}
function signature({level,base,tone}){[0,.045,.1].forEach((delay,index)=>tone(base*(index===1?2.15:1.25),.032,level*.75,"square",.7,delay));}

export default defineEnemy({
  id:2,name:"Broken Drone",slug:"broken-drone",
  stats:{health:30,damage:6,speed:2,range:10,cooldown:1.8,color:0x729c9a,scale:0.7,style:"ranged"},
model:{build:buildModel,builder:"broken-drone",flying:true,surface:"metal",hazardArmor:false},
sound:{base:245,wave:"sine",attack:1.8,recipe:"glitch",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.4,skillMotion:"rangedBurst",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Barrage",handler:"brokenDroneBarrage",cooldown:8,color:0x68e7ff,targetDistance:10,projectile:true},
});

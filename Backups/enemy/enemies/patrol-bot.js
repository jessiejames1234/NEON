import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{});const {add,parts,box,sphere,cylinder,darkMaterial,accentMaterial,glowMaterial}=ctx;parts.weapons.push(add(box,darkMaterial,[.18,.18,.68],[.42,1.02,.42]));add(cylinder,glowMaterial,[.025,.5,.025],[-.24,1.95,-.08]);add(box,glowMaterial,[.22,.06,.06],[0,1.88,.03]);add(cylinder,accentMaterial,[.065,.25,.065],[.42,1.08,.76],[Math.PI/2,0,0]);add(box,accentMaterial,[.55,.18,.5],[0,1.48,-.02],[.08,0,0]);for(const x of [-.16,.16])add(sphere,glowMaterial,[.07,.07,.04],[x,1.7,.22],[0,0,0],"head");}
function signature({level,base,tone,noise}){tone(base,.055,level,"square",1);tone(base*1.5,.07,level*.8,"square",.72,.075);noise(.035,level*.25,.04);}

export default defineEnemy({
  id:4,name:"Patrol Bot",slug:"patrol-bot",
  stats:{health:50,damage:8,speed:2.2,range:11,cooldown:1.55,color:0x5b8795,scale:0.85,style:"ranged"},
model:{build:buildModel,builder:"patrol-bot",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:185,wave:"square",attack:1.55,recipe:"radio",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.5,skillMotion:"scanning",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Scanning Lock",handler:"scanningLock",cooldown:8,color:0x43f4d0,targetDistance:10,projectile:true,indicator:{type:"damage",radius:1.1,anchor:"target"}},
});

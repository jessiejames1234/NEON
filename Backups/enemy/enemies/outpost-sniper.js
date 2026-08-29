import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{helmetDark:true});const {add,parts,box,cylinder,darkMaterial,accentMaterial,redGlow}=ctx;parts.weapons.push(add(cylinder,darkMaterial,[.075,1.65,.075],[.35,1.05,.5],[Math.PI/2,0,0]));add(cylinder,redGlow,[.08,.18,.08],[.35,1.14,.15]);add(cylinder,redGlow,[.095,.26,.095],[.35,1.18,.24],[Math.PI/2,0,0]);add(box,darkMaterial,[.09,.38,.3],[.35,.95,.62]);add(box,accentMaterial,[.62,.08,.38],[0,1.9,-.05]);add(box,darkMaterial,[.48,.2,.5],[0,1.82,-.08],[-.14,0,0]);add(cylinder,redGlow,[.065,.42,.065],[.35,1.18,.88],[Math.PI/2,0,0]);}
function signature({level,base,tone}){tone(base*.45,.16,level*.7,"sine",3.2);tone(base*2.5,.045,level*1.25,"sawtooth",.25,.15);}

export default defineEnemy({
  id:10,name:"Outpost Sniper",slug:"outpost-sniper",
  stats:{health:80,damage:25,speed:1.5,range:19,cooldown:2.7,color:0xe45c5c,scale:0.9,style:"sniper"},
model:{build:buildModel,builder:"outpost-sniper",flying:false,surface:"metal",hazardArmor:true},
sound:{base:520,wave:"sawtooth",attack:2.3,recipe:"sniper",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.7,skillMotion:"sniper",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Sniper Laser",handler:"sniperLaser",cooldown:9,color:0xff334f,targetDistance:10,projectile:true,indicator:{type:"damage",radius:1,anchor:"target"}},
});

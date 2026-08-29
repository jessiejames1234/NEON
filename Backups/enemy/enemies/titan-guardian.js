import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{width:1.08,height:1.15,shoulderArmor:true,titan:true});const {add,parts,box,sphere,cylinder,torus,diamond,darkMaterial,accentMaterial,glowMaterial}=ctx;for(const side of [-1,1])parts.weapons.push(add(cylinder,darkMaterial,[.12,1,.12],[side*.72,1.62,.45],[Math.PI/2,0,0]));add(sphere,glowMaterial,[.25,.25,.1],[0,1.35,.29]);add(torus,glowMaterial,[.42,.42,.42],[0,1.35,.3]);for(const side of [-1,1]){add(box,accentMaterial,[.36,.42,.28],[side*.28,.3,.03]);add(diamond,glowMaterial,[.16,.25,.1],[side*.7,1.62,.13]);}add(box,darkMaterial,[.9,.28,.58],[0,1.72,-.04],[.08,0,0]);add(torus,accentMaterial,[.55,.55,.55],[0,1.35,.31]);}
function signature({level,base,tone,noise}){tone(base,.38,level*1.4,"sawtooth",.32);tone(base*2.2,.12,level*.6,"square",.55,.08);noise(.18,level*.8,.04);}

export default defineEnemy({
  id:19,name:"Titan Guardian",slug:"titan-guardian",
  stats:{health:700,damage:45,speed:1.2,range:15,cooldown:1.8,color:0xc64d4d,scale:1.65,style:"titan"},
model:{build:buildModel,builder:"titan-guardian",flying:false,surface:"metal",hazardArmor:true},
sound:{base:46,wave:"sawtooth",attack:1.2,recipe:"titan",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.5,skillMotion:"stomp",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Titan Stomp",handler:"titanStomp",cooldown:10,color:0xff4d55,targetDistance:10,projectile:false,indicator:{type:"damage",radius:10,anchor:"self"}},
});

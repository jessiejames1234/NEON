import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{});const {add,parts,box,sphere,cylinder,cone,torus,darkMaterial,accentMaterial,glowMaterial}=ctx;for(const side of [-1,1]){add(cylinder,accentMaterial,[.2,.72,.2],[side*.22,1.05,-.4]);add(sphere,glowMaterial,[.12,.12,.12],[side*.22,1.05,-.78]);}parts.weapons.push(add(cylinder,darkMaterial,[.09,1,.09],[.38,.98,.48],[Math.PI/2,0,0]));add(torus,darkMaterial,[.38,.38,.38],[0,1.02,-.43],[Math.PI/2,0,0]);add(cone,glowMaterial,[.13,.36,.13],[.38,.98,1],[Math.PI/2,0,0]);add(box,accentMaterial,[.5,.18,.13],[0,1.48,-.3]);add(cone,accentMaterial,[.18,.45,.18],[.38,.98,1.15],[Math.PI/2,0,0]);}
function signature({attack,level,base,tone,noise}){tone(base*.8,.14,level,"sawtooth",.45);noise(attack?.28:.12,level*.95,.035);}

export default defineEnemy({
  id:13,name:"Flame Trooper",slug:"flame-trooper",
  stats:{health:180,damage:15,speed:2.1,range:5,cooldown:0.65,color:0xff7d3c,scale:1,style:"flame"},
model:{build:buildModel,builder:"flame-trooper",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:125,wave:"sawtooth",attack:1.8,recipe:"flame",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.6,skillMotion:"flameWall",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Flame Wall",handler:"flameWall",cooldown:9,color:0xff6a32,targetDistance:10,projectile:true},
});

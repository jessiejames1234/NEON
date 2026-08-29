import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{});const {add,sphere,cylinder,cone,torus,darkMaterial,glowMaterial,makeMaterial}=ctx;add(cylinder,makeMaterial(0x75c64b,.45,.2),[.3,.82,.3],[0,1.03,-.42]);add(cylinder,glowMaterial,[.06,.5,.06],[.28,1.05,.34],[Math.PI/2,0,0]);for(const side of [-1,1]){add(torus,glowMaterial,[.3,.3,.3],[side*.22,1.05,-.4],[Math.PI/2,0,0]);add(cylinder,darkMaterial,[.035,.9,.035],[side*.34,1.08,-.18],[.4,0,side*.45]);add(cone,glowMaterial,[.09,.32,.09],[side*.28,.85,.61],[Math.PI/2,0,0]);}add(sphere,glowMaterial,[.2,.2,.2],[0,.98,-.62]);}
function signature({level,base,tone}){[0,.065,.13].forEach((delay,index)=>tone(base*(.75+index*.18),.09,level*.65,"sine",1.18,delay));}

export default defineEnemy({
  id:9,name:"Toxic Walker",slug:"toxic-walker",
  stats:{health:120,damage:8,speed:1.8,range:4,cooldown:0.75,color:0x75c64b,scale:1,style:"toxic"},
model:{build:buildModel,builder:"toxic-walker",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:115,wave:"sawtooth",attack:0.72,recipe:"toxic",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.8,skillMotion:"cloud",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Toxic Cloud",handler:"toxicCloud",cooldown:10,color:0x76ff52,targetDistance:3.2,projectile:false,indicator:{type:"damage",radius:3.6,anchor:"self"}},
});

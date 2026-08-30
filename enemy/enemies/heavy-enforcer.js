import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{width:.94,shoulderArmor:true});const {add,parts,box,cylinder,torus,darkMaterial,accentMaterial,glowMaterial}=ctx;parts.weapons.push(add(box,darkMaterial,[.46,.36,.9],[.52,1.05,.47]));for(let i=0;i<3;i++)parts.weaponRotors.push(add(cylinder,accentMaterial,[.055,1.05,.055],[.4+i*.11,1.05,.96],[Math.PI/2,0,0]));add(cylinder,accentMaterial,[.35,.5,.35],[.54,.98,.05],[Math.PI/2,0,0]);add(torus,darkMaterial,[.48,.48,.48],[.54,.98,.08],[Math.PI/2,0,0]);add(box,accentMaterial,[.68,.22,.42],[0,1.72,-.08]);add(cylinder,glowMaterial,[.12,.32,.12],[.54,.98,1.18],[Math.PI/2,0,0]);for(const side of [-1,1])add(box,darkMaterial,[.2,.48,.32],[side*.42,1.17,-.32],[0,0,side*.14]);}
function signature({level,base,tone,noise}){tone(base,.16,level,"square",1.8);[0,.035,.07,.105].forEach(delay=>noise(.025,level*.55,delay));}

export default defineEnemy({
  id:15,name:"Heavy Enforcer",slug:"heavy-enforcer",
  stats:{health:300,damage:22,speed:1.55,range:12,cooldown:0.72,color:0x77888c,scale:1.25,style:"heavy"},
model:{build:buildModel,builder:"heavy-enforcer",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:58,wave:"square",attack:1.5,recipe:"heavy",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.7,skillMotion:"barrage",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Minigun Burst",handler:"minigunBurst",cooldown:9,maxRange:12,requiresLineOfSight:true,color:0xffad46,targetDistance:10,projectile:false},
});

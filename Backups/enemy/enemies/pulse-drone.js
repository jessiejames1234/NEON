import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,box,sphere,cylinder,torus,diamond,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(cylinder,bodyMaterial,[1,.36,1],[0,.76,0]);parts.rings.push(add(torus,glowMaterial,[1.25,1.25,1.25],[0,.76,0],[Math.PI/2,0,0]));add(sphere,redGlow,[.14,.14,.12],[0,.76,.54],[0,0,0],"head");for(const side of [-1,1]){parts.weapons.push(add(cylinder,darkMaterial,[.09,.58,.09],[side*.42,.63,.26],[Math.PI/2,0,0]));add(box,accentMaterial,[.22,.12,.48],[side*.48,.93,-.12],[0,side*.18,0]);}for(let i=0;i<4;i++){const a=i*Math.PI/2;add(sphere,glowMaterial,[.1,.1,.1],[Math.sin(a)*.56,.77,Math.cos(a)*.56]);}add(cylinder,darkMaterial,[.26,.16,.26],[0,.48,0]);add(diamond,glowMaterial,[.28,.2,.28],[0,.78,.58],[0,0,0],"head");}
function signature({level,base,tone}){[1,1.35,1.8].forEach((ratio,index)=>tone(base*ratio,.045,level*.78,"square",.6,index*.055));}

export default defineEnemy({
  id:6,name:"Pulse Drone",slug:"pulse-drone",
  stats:{health:60,damage:12,speed:2.8,range:13,cooldown:0.8,color:0x43f4d0,scale:0.78,style:"burst"},
model:{build:buildModel,builder:"pulse-drone",flying:true,surface:"metal",hazardArmor:false},
  sound:{base:290,wave:"square",attack:2.1,recipe:"pulse",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.3,skillMotion:"pulse",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"EMP Pulse",handler:"empPulse",cooldown:10,color:0x37fff2,targetDistance:7,projectile:false,indicator:{type:"damage",radius:7,anchor:"self"}},
});

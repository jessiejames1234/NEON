import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,sphere,cone,torus,diamond,bodyMaterial,accentMaterial,glowMaterial}=ctx;parts.body=add(sphere,bodyMaterial,[.78,.95,.78],[0,.82,0]);add(sphere,glowMaterial,[.3,.5,.3],[0,.82,0]);for(let i=0;i<2;i++)parts.rings.push(add(torus,accentMaterial,[1.25+i*.32,1.25+i*.32,1.25+i*.32],[0,.82,0],[i?Math.PI/2:0,0,i?0:Math.PI/2]));for(let i=0;i<4;i++){const a=i*Math.PI/2;parts.rotors.push(add(cone,glowMaterial,[.14,.42,.14],[Math.sin(a)*.92,.82,Math.cos(a)*.92],[0,0,a]));}add(diamond,glowMaterial,[.48,.7,.48],[0,.82,0]);for(let i=0;i<3;i++)add(cone,accentMaterial,[.16,.52,.16],[(i-1)*.38,.82,-.48],[Math.PI,0,(i-1)*.16]);}
function signature({level,base,tone}){tone(base,.32,level*.72,"sine",.52);tone(base*1.5,.38,level*.52,"sine",.7,.04);}

export default defineEnemy({
  id:14,name:"Phantom Drone",slug:"phantom-drone",
  stats:{health:160,damage:20,speed:2.6,range:12,cooldown:1.6,color:0xa073ff,scale:0.82,style:"teleport"},
model:{build:buildModel,builder:"phantom-drone",flying:true,surface:"metal",hazardArmor:false},
sound:{base:440,wave:"sine",attack:0.65,recipe:"phantom",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.5,skillMotion:"phase",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Phantom Shift",handler:"phantomShift",cooldown:8,maxRange:10,requiresLineOfSight:true,color:0xb675ff,targetDistance:10,projectile:false},
});

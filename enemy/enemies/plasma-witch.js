import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,sphere,cylinder,cone,torus,diamond,bodyMaterial,darkMaterial,accentMaterial,glowMaterial}=ctx;parts.body=add(cone,bodyMaterial,[1.1,1.55,1.1],[0,.78,0],[0,0,Math.PI]);parts.head=add(sphere,accentMaterial,[.42,.5,.42],[0,1.55,0],[0,0,0],"head");add(cone,darkMaterial,[.62,.8,.62],[0,2.02,0]);parts.weapons.push(add(sphere,glowMaterial,[.32,.32,.32],[.72,1.15,.08]));for(const side of [-1,1]){parts.arms.push(add(cylinder,bodyMaterial,[.09,.78,.09],[side*.43,1.08,0],[0,0,side*.72]));add(diamond,glowMaterial,[.16,.26,.16],[side*.46,1.5,0]);}const staff=add(cylinder,darkMaterial,[.055,1.8,.055],[.72,.88,.08]);parts.weapons.push(staff);add(torus,glowMaterial,[.43,.43,.43],[.72,1.82,.08]);add(sphere,glowMaterial,[.16,.16,.16],[.72,1.82,.08]);add(torus,accentMaterial,[.52,.52,.52],[0,1.55,0],[Math.PI/2,0,0]);}
function signature({level,base,tone}){tone(base*.65,.24,level*.8,"triangle",2.4);tone(base*1.8,.17,level*.62,"sine",.55,.08);}

export default defineEnemy({
  id:16,name:"Plasma Witch",slug:"plasma-witch",
  stats:{health:260,damage:28,speed:2.2,range:14,cooldown:1.7,color:0xe05cff,scale:1,style:"homing"},
model:{build:buildModel,builder:"plasma-witch",flying:true,surface:"organic",hazardArmor:false},
sound:{base:390,wave:"triangle",attack:1.9,recipe:"plasma",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.8,skillMotion:"gravityOrb",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Gravity Orb",handler:"gravityOrb",cooldown:10,maxRange:13,requiresLineOfSight:true,color:0xea62ff,targetDistance:10,projectile:true,indicator:{type:"damage",radius:5,anchor:"target"}},
});

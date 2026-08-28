import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,sphere,cylinder,cone,torus,diamond,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(sphere,bodyMaterial,[1.2,1.2,1.2],[0,1.35,0]);add(sphere,glowMaterial,[.55,.55,.55],[0,1.35,0],[0,0,0],"head");for(let i=0;i<3;i++)parts.rings.push(add(torus,i===1?glowMaterial:accentMaterial,[1.55+i*.35,1.55+i*.35,1.55+i*.35],[0,1.35,0],[i===0?Math.PI/2:0,i===2?Math.PI/2:0,i===1?Math.PI/2:0]));for(let i=0;i<8;i++){const a=i*Math.PI/4;parts.rotors.push(add(sphere,i%2?accentMaterial:glowMaterial,[.13,.13,.13],[Math.sin(a)*1.65,1.35+Math.sin(a*2)*.35,Math.cos(a)*1.65]));}for(let i=0;i<6;i++){const a=i*Math.PI/3;add(cone,i%2?accentMaterial:darkMaterial,[.22,.85,.22],[Math.sin(a)*1.05,1.35+Math.cos(a)*.18,Math.cos(a)*1.05],[0,0,-a]);}add(cylinder,glowMaterial,[.16,2.4,.16],[0,1.35,0]);add(diamond,redGlow,[.72,.72,.72],[0,1.35,0],[0,0,0],"head");}
function signature({level,base,tone,noise}){[1,1.5,2.25].forEach((ratio,index)=>tone(base*ratio,.42-index*.06,level*(1-index*.18),index===1?"square":"sawtooth",.45,index*.055));noise(.25,level*.75,.08);}

export default defineEnemy({
  id:20,name:"The Outpost Core",slug:"the-outpost-core",
  stats:{health:1200,damage:60,speed:0.85,range:18,cooldown:1.35,color:0xff3f68,scale:2,style:"boss"},
model:{build:buildModel,builder:"the-outpost-core",flying:true,surface:"metal",hazardArmor:true},
  sound:{base:38,wave:"sawtooth",attack:2.2,recipe:"core",signature},
  animations:{idleDuration:3,locomotion:"hover",locomotionDuration:2.4,attackDuration:2.2,skillDuration:3,skillMotion:"core",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Core Protocol",handler:"coreProtocol",cooldown:7,color:0xff2f68,targetDistance:10,projectile:false,indicator:{type:"damage",radius:7,anchor:"target"}},
});

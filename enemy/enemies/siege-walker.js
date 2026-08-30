import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,box,torus,cone,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(box,bodyMaterial,[1.25,.62,1.2],[0,.95,0]);parts.head=add(box,accentMaterial,[.58,.4,.55],[0,1.35,.28],[0,0,0],"head");for(const side of [-1,1])for(const z of [-.38,.38]){parts.legs.push(add(ctx.cylinder,darkMaterial,[.12,1.05,.12],[side*.55,.45,z],[0,0,side*.32]));add(box,darkMaterial,[.36,.12,.4],[side*.72,.04,z]);}for(const side of [-1,1]){parts.weapons.push(add(box,accentMaterial,[.4,.36,.7],[side*.72,1.22,0]));for(let row=0;row<2;row++){add(ctx.cylinder,darkMaterial,[.08,.5,.08],[side*.72,1.17+row*.14,.4],[Math.PI/2,0,0]);add(torus,glowMaterial,[.1,.1,.1],[side*.72,1.17+row*.14,.64],[Math.PI/2,0,0]);}add(cone,accentMaterial,[.13,.4,.13],[side*.72,1.17,.9],[Math.PI/2,0,0]);}add(box,darkMaterial,[.62,.18,.5],[0,1.45,.38],[-.12,0,0],"head");add(box,redGlow,[.36,.055,.03],[0,1.46,.66],[0,0,0],"head");}
function signature({level,base,tone,noise}){tone(base*.55,.25,level*1.35,"sawtooth",.3);noise(.22,level,.02);tone(base*3.5,.045,level*.35,"square",.4,.12);}

export default defineEnemy({
  id:17,name:"Siege Walker",slug:"siege-walker",
  stats:{health:450,damage:35,speed:1.35,range:16,cooldown:2.3,color:0xb88a53,scale:1.4,style:"rocket"},
model:{build:buildModel,builder:"siege-walker",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:52,wave:"sawtooth",attack:0.8,recipe:"siege",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.8,skillMotion:"bombardment",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Bombardment",handler:"bombardment",cooldown:11,maxRange:15,requiresLineOfSight:true,color:0xff9b42,targetDistance:10,projectile:true,indicator:{type:"damage",radius:1.5,anchor:"target"}},
});

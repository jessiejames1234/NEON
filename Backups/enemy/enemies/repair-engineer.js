import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{});const {add,parts,box,sphere,cylinder,torus,darkMaterial,accentMaterial,glowMaterial}=ctx;add(box,accentMaterial,[.56,.72,.28],[0,1.05,-.36]);parts.rotors.push(add(cylinder,glowMaterial,[.035,.68,.035],[.25,1.72,-.22]));add(box,darkMaterial,[.42,.42,.12],[0,1.06,-.55]);add(sphere,glowMaterial,[.13,.13,.13],[0,1.06,-.64]);add(box,accentMaterial,[.08,.56,.08],[-.47,.82,.37],[0,0,-.45]);add(torus,glowMaterial,[.3,.3,.3],[0,1.08,-.67],[Math.PI/2,0,0]);for(const side of [-1,1])add(box,accentMaterial,[.12,.28,.1],[side*.52,.72,.33],[side*.2,0,side*.2]);}
function signature({level,base,tone}){[1,1.25,1.5,2].forEach((ratio,index)=>tone(base*ratio,.07,level*.62,"sine",.92,index*.065));}

export default defineEnemy({
  id:12,name:"Repair Engineer",slug:"repair-engineer",
  stats:{health:150,damage:10,speed:1.8,range:10,cooldown:2,color:0xf0bf57,scale:0.9,style:"healer"},
model:{build:buildModel,builder:"repair-engineer",flying:false,surface:"metal",hazardArmor:false},
sound:{base:360,wave:"sine",attack:1.45,recipe:"repair",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:2.2,skillDuration:2.8,skillMotion:"deploy",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Repair Station",handler:"repairStation",cooldown:10,color:0xffd35c,targetDistance:0,projectile:false,indicator:{type:"repair",radius:4.5,anchor:"self"}},
});

import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{width:.58,helmetDark:true});const {add,parts,box,cone,capsule,diamond,darkMaterial,glowMaterial}=ctx;for(const side of [-1,1]){parts.weapons.push(add(box,glowMaterial,[.07,.82,.14],[side*.58,.72,.32],[side*.25,0,side*.08]));add(cone,darkMaterial,[.12,.38,.12],[side*.48,1.57,-.12],[0,0,side*.72]);add(diamond,glowMaterial,[.12,.28,.08],[side*.54,1.08,.16],[0,0,side*.2]);}add(cone,darkMaterial,[.48,.58,.48],[0,2.03,-.08]);add(box,glowMaterial,[.26,.035,.035],[0,1.69,.22],[0,0,0],"head");add(capsule,darkMaterial,[.92,1.12,.75],[0,1.05,-.18]);}
function signature({level,base,tone}){tone(base*2.1,.22,level*.7,"sine",.28);tone(base*.72,.26,level*.5,"triangle",1.6,.035);}

export default defineEnemy({
  id:11,name:"Cloaked Hunter",slug:"cloaked-hunter",
  stats:{health:130,damage:18,speed:3.2,range:1.4,cooldown:1,color:0x7086a8,scale:0.88,style:"cloak"},
model:{build:buildModel,builder:"cloaked-hunter",flying:false,surface:"organic",hazardArmor:false},
sound:{base:205,wave:"triangle",attack:1.25,recipe:"cloak",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"shadowDash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Shadow Strike",handler:"cloakedStrike",cooldown:8,color:0x7b8fff,targetDistance:10,projectile:false},
});

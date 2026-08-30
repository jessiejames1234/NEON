import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{width:.58,helmetDark:true});const {add,parts,box,cone,diamond,darkMaterial,glowMaterial}=ctx;for(const side of [-1,1]){parts.weapons.push(add(box,glowMaterial,[.07,.82,.14],[side*.58,.72,.32],[side*.25,0,side*.08]));add(cone,glowMaterial,[.1,.5,.1],[side*.18,.7,-.22],[0,0,side*.2]);add(cone,darkMaterial,[.18,.55,.18],[side*.48,1.63,-.16],[0,0,side*.65]);add(diamond,glowMaterial,[.11,.22,.08],[side*.32,1.16,.28]);}add(box,darkMaterial,[.4,.3,.08],[0,1.68,.23],[0,0,0],"head");add(ctx.sphere,glowMaterial,[.08,.08,.04],[0,1.7,.29],[0,0,0],"head");}
function signature({level,base,tone}){tone(base*.45,.15,level*.7,"sine",4.2);tone(base*2.2,.11,level,"square",.3,.11);}

export default defineEnemy({
  id:18,name:"Void Assassin",slug:"void-assassin",
  stats:{health:350,damage:40,speed:4.2,range:1.5,cooldown:1.4,color:0x54408d,scale:0.95,style:"assassin"},
model:{build:buildModel,builder:"void-assassin",flying:false,surface:"organic",hazardArmor:false},
  sound:{base:275,wave:"square",attack:1.7,recipe:"void",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"shadowDash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Void Strike",handler:"voidStrike",cooldown:8,maxRange:9,requiresLineOfSight:true,color:0x7d55ff,targetDistance:10,projectile:false},
});

import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{shoulderArmor:true});const {add,parts,box,diamond,darkMaterial,accentMaterial,glowMaterial}=ctx;add(box,accentMaterial,[1.02,1.28,.1],[0,.92,.6],[0,0,0],"shield");add(box,glowMaterial,[.07,.85,.03],[0,.92,.66]);parts.arms[0].rotation.x=-1.05;parts.arms[0].userData.baseRotation.x=-1.05;for(const y of [1.57,.27])add(box,darkMaterial,[1.08,.07,.12],[0,y,.61]);for(const side of [-1,1])add(box,glowMaterial,[.045,1.2,.03],[side*.48,.92,.665]);add(box,darkMaterial,[.75,.2,.07],[0,1.3,.69],[0,0,0],"shield");add(diamond,glowMaterial,[.18,.18,.06],[0,.92,.69],[0,0,0],"shield");}
function signature({level,base,tone,noise}){tone(base*.65,.15,level*1.2,"square",.42);noise(.055,level*.35,.025);tone(base*2.4,.035,level*.4,"triangle",.8,.09);}

export default defineEnemy({
  id:8,name:"Riot Unit",slug:"riot-unit",
  stats:{health:110,damage:12,speed:1.9,range:1.5,cooldown:1.1,color:0x55717b,scale:1.05,style:"shield"},
model:{build:buildModel,builder:"riot-unit",flying:false,surface:"metal",hazardArmor:true},
  sound:{base:68,wave:"square",attack:0.9,recipe:"shield",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.1,skillMotion:"dash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Shield Bash",handler:"shieldBash",cooldown:8,color:0x83e8ff,targetDistance:10,projectile:false},
});

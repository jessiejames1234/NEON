import {defineEnemy} from "../define-enemy.js";
import {buildHumanoid} from "../model-utils.js";

function buildModel(ctx){buildHumanoid(ctx,{shoulderArmor:true});const {add,box,darkMaterial,accentMaterial}=ctx;add(box,accentMaterial,[.62,.25,.48],[0,.45,.02]);add(box,accentMaterial,[.58,.18,.52],[0,1.92,0]);add(box,darkMaterial,[.5,.11,.08],[0,1.69,.23],[0,0,0],"head");for(const side of [-1,1]){add(box,accentMaterial,[.27,.34,.28],[side*.5,.91,.02]);add(ctx.cone,accentMaterial,[.13,.34,.13],[side*.46,1.62,-.1],[0,0,side*.55]);}add(box,darkMaterial,[.66,.32,.5],[0,1.23,-.04],[.1,0,0]);}
function signature({level,base,tone,noise}){tone(base*.7,.18,level,"sawtooth",.45);noise(.1,level*.65,.045);}

export default defineEnemy({
  id:5,name:"Rust Guard",slug:"rust-guard",
  stats:{health:65,damage:10,speed:2.4,range:1.35,cooldown:1,color:0x9a6548,scale:0.9,style:"melee"},
model:{build:buildModel,builder:"rust-guard",flying:false,surface:"metal",hazardArmor:false},
  sound:{base:78,wave:"sawtooth",attack:1.1,recipe:"rust",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"dash",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Charge",handler:"charge",cooldown:9,color:0xff7b45,targetDistance:10,projectile:false},
});

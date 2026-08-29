import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){const {add,parts,sphere,cylinder,cone,torus,capsule,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;parts.body=add(sphere,bodyMaterial,[.9,.55,1],[0,.47,0]);parts.head=add(sphere,accentMaterial,[.55,.42,.5],[0,.48,.53],[0,0,0],"head");for(const side of [-1,1]){for(let row=0;row<4;row++){const leg=add(cylinder,darkMaterial,[.055,.72,.055],[side*(.42+row*.04),.28,.34-row*.22],[0,0,side*(.85+row*.08)]);parts.legs.push(leg);add(sphere,glowMaterial,[.075,.075,.075],leg.position.toArray());}add(sphere,redGlow,[.07,.07,.06],[side*.12,.54,.76],[0,0,0],"head");add(cone,glowMaterial,[.11,.3,.11],[side*.2,.35,.82],[Math.PI/2,0,side*.2]);}add(capsule,darkMaterial,[.8,.75,1],[0,.5,-.42],[Math.PI/2,0,0]);for(let i=0;i<3;i++)add(torus,accentMaterial,[.72-i*.12,.72-i*.12,.72-i*.12],[0,.51,-.35-i*.17],[Math.PI/2,0,0]);parts.rings.push(add(torus,glowMaterial,[.72,.72,.72],[0,.55,0],[Math.PI/2,0,0]));}
function signature({level,base,tone,noise}){noise(.1,level*.8);tone(base*1.7,.08,level,"sawtooth",.35);tone(base*3.2,.025,level*.65,"square",.5,.035);}

export default defineEnemy({
  id:7,name:"Shock Spider",slug:"shock-spider",
  stats:{health:75,damage:10,speed:3.7,range:1.5,cooldown:1.25,color:0x8d6bd1,scale:0.72,style:"leaper"},
model:{build:buildModel,builder:"shock-spider",flying:false,surface:"organic",hazardArmor:false},
sound:{base:410,wave:"triangle",attack:1.6,recipe:"shock",signature},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.2,skillMotion:"leap",stunnedDuration:2.2,deathDuration:2.4},
skill:{name:"Electric Leap",handler:"electricLeap",cooldown:8,color:0xa77cff,targetDistance:10,projectile:false,indicator:{type:"damage",radius:2.2,anchor:"target"}},
});

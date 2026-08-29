import * as THREE from "three";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

export {THREE};
export const unitBoxGeometry=new RoundedBoxGeometry(1,1,1,2,.075);
export const unitSphereGeometry=new THREE.SphereGeometry(.5,10,7);
export const unitCylinderGeometry=new THREE.CylinderGeometry(.5,.5,1,8);
export const unitConeGeometry=new THREE.ConeGeometry(.5,1,8);
export const unitTorusGeometry=new THREE.TorusGeometry(.5,.08,7,16);
export const unitCapsuleGeometry=new THREE.CapsuleGeometry(.28,.44,4,8);
export const unitDiamondGeometry=new THREE.OctahedronGeometry(.5,1);

let modelAnisotropy=1;
const armorTextures=new Map();
const segmentDirection=new THREE.Vector3(),segmentMidpoint=new THREE.Vector3(),segmentUp=new THREE.Vector3(0,1,0);
export const crawlerAnimatedHip=new THREE.Vector3(),crawlerAnimatedKnee=new THREE.Vector3(),crawlerAnimatedAnkle=new THREE.Vector3();

export function setEnemyModelAnisotropy(value){
  modelAnisotropy=Math.max(1,Number(value)||1);
  armorTextures.forEach((texture)=>{
    texture.anisotropy=modelAnisotropy;
    texture.needsUpdate=true;
  });
}

export function alignCrawlerSegment(mesh,start,end,radius){
  segmentDirection.subVectors(end,start);
  const length=Math.max(.001,segmentDirection.length());
  segmentMidpoint.addVectors(start,end).multiplyScalar(.5);
  mesh.position.copy(segmentMidpoint);mesh.scale.set(radius,length,radius);
  mesh.quaternion.setFromUnitVectors(segmentUp,segmentDirection.multiplyScalar(1/length));
}

function armorTexture(definition){
  if(armorTextures.has(definition.id))return armorTextures.get(definition.id);
  const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
  const context=canvas.getContext("2d"),baseColor=new THREE.Color(definition.stats.color);
  context.fillStyle=baseColor.getStyle();context.fillRect(0,0,128,128);
  const shade=context.createLinearGradient(0,0,128,128);
  shade.addColorStop(0,"rgba(255,255,255,.18)");shade.addColorStop(.45,"rgba(255,255,255,0)");shade.addColorStop(1,"rgba(0,0,0,.38)");
  context.fillStyle=shade;context.fillRect(0,0,128,128);
  let seed=definition.id*92821+17;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(definition.model.surface==="organic"){
    context.strokeStyle="rgba(210,235,230,.16)";context.lineWidth=2;
    for(let vein=0;vein<14;vein+=1){const x=random()*128,y=random()*128;context.beginPath();context.moveTo(x,y);context.bezierCurveTo(x+random()*28-14,y+random()*35-18,x+random()*38-19,y+random()*40-20,x+random()*48-24,y+random()*52-26);context.stroke();}
    context.fillStyle="rgba(5,8,18,.2)";for(let spot=0;spot<22;spot+=1){context.beginPath();context.arc(random()*128,random()*128,1+random()*4,0,Math.PI*2);context.fill();}
  }else{
    context.strokeStyle="rgba(8,16,20,.45)";context.lineWidth=3;
    for(let line=16;line<128;line+=32){context.beginPath();context.moveTo(line,0);context.lineTo(line,128);context.stroke();context.beginPath();context.moveTo(0,line);context.lineTo(128,line);context.stroke();}
    context.strokeStyle="rgba(255,255,255,.16)";context.lineWidth=1;
    for(let line=17;line<128;line+=32){context.beginPath();context.moveTo(line,0);context.lineTo(line,128);context.stroke();}
    context.strokeStyle="rgba(230,245,240,.24)";
    for(let scratch=0;scratch<16;scratch+=1){const x=random()*128,y=random()*128;context.beginPath();context.moveTo(x,y);context.lineTo(x+(random()-.5)*25,y+(random()-.5)*7);context.stroke();}
  }
  if(definition.model.hazardArmor){context.fillStyle="rgba(255,180,50,.6)";for(let stripe=-128;stripe<256;stripe+=28){context.beginPath();context.moveTo(stripe,112);context.lineTo(stripe+12,112);context.lineTo(stripe-4,128);context.lineTo(stripe-16,128);context.fill();}}
  if(definition.model.surface!=="organic"){context.fillStyle="rgba(4,10,14,.7)";context.fillRect(7,7,30,11);context.fillStyle="rgba(210,255,245,.72)";context.font="bold 8px monospace";context.fillText(`E-${String(definition.id).padStart(2,"0")}`,10,15);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=modelAnisotropy;
  armorTextures.set(definition.id,texture);return texture;
}

export function createModelContext(definition,elite=false){
  const group=new THREE.Group();group.userData.enemyDefinition=definition;
  const cloaked=definition.stats.style==="cloak";
  const makeMaterial=(color,emissive=.08,metalness=.4)=>new THREE.MeshStandardMaterial({color,roughness:.58,metalness,emissive:color,emissiveIntensity:emissive,transparent:cloaked,opacity:cloaked?.42:1});
  const bodyMaterial=makeMaterial(definition.stats.color,.12,.42);bodyMaterial.map=armorTexture(definition);
  const darkMaterial=makeMaterial(0x182126,.02,.65);
  const accentMaterial=makeMaterial(new THREE.Color(definition.stats.color).offsetHSL(.03,.05,.14),.18,.5);
  const glowMaterial=new THREE.MeshBasicMaterial({color:elite?0xffd35c:definition.stats.color,transparent:cloaked,opacity:cloaked?.5:1});
  const redGlow=new THREE.MeshBasicMaterial({color:elite?0xffd35c:0xff496c,transparent:cloaked,opacity:cloaked?.55:1});
  const parts={legs:[],arms:[],rotors:[],weaponRotors:[],weapons:[],rings:[],glows:[],jaws:[],repairAnchors:[],crawlerArmor:[],crawlerPistons:[],crawlerFeelers:[],crawlerDrills:[],crawlerLegSets:[],crawlerEyes:[],crawlerSmoke:[],crawlerSparks:[],body:null,head:null};
  const add=(geometry,material,scale,position,rotation=[0,0,0],name="body")=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(...scale);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.name=name;mesh.castShadow=false;
    mesh.userData.basePosition=mesh.position.clone();mesh.userData.baseRotation=mesh.rotation.clone();mesh.userData.baseScale=mesh.scale.clone();group.add(mesh);
    if(material===glowMaterial||material===redGlow)parts.glows.push(mesh);return mesh;
  };
  return {definition,elite,group,parts,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow,makeMaterial,add,
    box:unitBoxGeometry,sphere:unitSphereGeometry,cylinder:unitCylinderGeometry,cone:unitConeGeometry,torus:unitTorusGeometry,capsule:unitCapsuleGeometry,diamond:unitDiamondGeometry,THREE};
}

export function buildHumanoid(ctx,{width=.72,height=1,shoulderArmor=false,helmetDark=false,titan=false}={}){
  const {add,parts,box,sphere,cylinder,bodyMaterial,darkMaterial,accentMaterial,glowMaterial,redGlow}=ctx;
  parts.body=add(box,bodyMaterial,[width,.75*height,.42],[0,1.02*height,0]);
  add(box,darkMaterial,[width*.78,.24*height,.47],[0,.75*height,-.01]);add(cylinder,darkMaterial,[.14,.2*height,.14],[0,1.49*height,0]);
  parts.head=add(box,accentMaterial,[.44,.38,.38],[0,1.66*height,0],[0,0,0],"head");add(box,redGlow,[.22,.055,.03],[0,1.67*height,.205],[0,0,0],"head");
  for(const side of [-1,1]){const leg=add(box,darkMaterial,[.22,.72*height,.25],[side*.22,.36*height,0]);const arm=add(box,bodyMaterial,[.2,.72*height,.22],[side*(width/2+.15),1.03*height,0]);parts.legs.push(leg);parts.arms.push(arm);add(box,accentMaterial,[.24,.3*height,.29],[side*.22,.44*height,.035]);add(box,accentMaterial,[.24,.31*height,.28],[side*(width/2+.15),.88*height,.025]);}
  if(shoulderArmor)for(const side of [-1,1])add(box,accentMaterial,[.42,.26,.52],[side*(width/2+.2),1.43*height,0]);
  add(box,darkMaterial,[.5,.16,.38],[0,.7,0]);add(box,accentMaterial,[.5,.38,.055],[0,1.16,.245]);add(sphere,glowMaterial,[.09,.09,.045],[0,1.2,.285]);
  for(const side of [-1,1]){add(sphere,darkMaterial,[.15,.15,.15],[side*.22,.69,0]);add(sphere,accentMaterial,[.14,.12,.15],[side*.22,.28,.03]);add(box,darkMaterial,[.28,.13,.42],[side*.22,.07,.1]);add(sphere,darkMaterial,[.14,.14,.14],[side*.48,1.3,0]);}
  add(box,helmetDark?darkMaterial:accentMaterial,[.5,.12,.42],[0,1.91,0]);add(box,darkMaterial,[.34,.12,.08],[0,1.55,.2],[.18,0,0],"head");
  for(const side of [-1,1]){add(cylinder,darkMaterial,[.105,.16,.105],[side*.22,.04,.1],[Math.PI/2,0,0]);add(box,accentMaterial,[.18,.3,.045],[side*.22,.4,.15],[-.08,0,0]);add(sphere,darkMaterial,[.13,.13,.13],[side*(titan?.67:.5),1.05,0]);add(box,accentMaterial,[.28,.16,.34],[side*(titan?.68:.51),1.37,0],[0,0,side*.12]);}
  add(box,darkMaterial,[.18,.16,.13],[.34,.65,-.24],[0,.2,0]);add(box,accentMaterial,[.18,.16,.13],[-.34,.65,-.24],[0,-.2,0]);
}

export function finishModel(ctx){
  if(ctx.elite){const ring=ctx.add(ctx.torus,new THREE.MeshBasicMaterial({color:0xffd35c}),[1.25,1.25,1.25],[0,2.05,0],[Math.PI/2,0,0]);ctx.parts.rings.push(ring);}
  const addRepairAnchor=(parent,position,name)=>{
    const anchor=new THREE.Object3D();anchor.name=name;anchor.position.set(...position);parent.add(anchor);ctx.parts.repairAnchors.push(anchor);
  };
  const body=ctx.parts.body||ctx.group,head=ctx.parts.head||body;
  if(ctx.definition.id===1){
    // The crawler's front anchors follow its articulated head rig; the rear
    // anchors follow the collapsing chassis during stunned/death poses.
    addRepairAnchor(head,[-.16,.01,.18],"repair-head-left");
    addRepairAnchor(head,[.16,.01,.18],"repair-head-right");
    addRepairAnchor(body,[-.12,.12,0],"repair-core-left");
    addRepairAnchor(body,[.12,-.12,0],"repair-core-right");
  }else{
    // Normalized local positions inherit every model-specific scale, rotation,
    // flying offset and stunned transform from their actual body parts.
    addRepairAnchor(head,[-.15,.04,.18],"repair-head-left");
    addRepairAnchor(head,[.15,.04,.18],"repair-head-right");
    addRepairAnchor(body,[-.18,.12,.18],"repair-core-left");
    addRepairAnchor(body,[.18,-.12,.18],"repair-core-right");
  }
  return {group:ctx.group,bodyMaterial:ctx.bodyMaterial,parts:ctx.parts,flying:ctx.definition.model.flying};
}

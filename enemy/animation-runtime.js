import * as THREE from "three";
import {alignCrawlerSegment,crawlerAnimatedHip,crawlerAnimatedKnee,crawlerAnimatedAnkle} from "./model-utils.js";

function resetPart(part){
  if(part.userData.basePosition)part.position.copy(part.userData.basePosition);
  if(part.userData.baseRotation)part.rotation.copy(part.userData.baseRotation);
  if(part.userData.baseScale)part.scale.copy(part.userData.baseScale);
}

function animateCrawler(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const bite=attackStrength,biteSnap=Math.sin(Math.min(1,bite)*Math.PI*.72),stride=Math.sin(walkPhase)*movementAmount;
  actor.parts.crawlerLegSets.forEach((leg)=>{
    const {side,rowIndex,upper,joint,lower,foot}=leg,phase=walkPhase+rowIndex*1.7+(side>0?Math.PI:0),swing=Math.sin(phase)*movementAmount,lift=Math.max(0,Math.sin(phase))*movementAmount;
    crawlerAnimatedHip.copy(leg.hip);crawlerAnimatedKnee.copy(leg.knee);crawlerAnimatedAnkle.copy(leg.ankle);
    crawlerAnimatedKnee.x+=side*(swing*.025+bite*.025);crawlerAnimatedKnee.y+=lift*.035;crawlerAnimatedKnee.z+=swing*.035;crawlerAnimatedAnkle.y+=lift*.07;crawlerAnimatedAnkle.z+=swing*.065;
    alignCrawlerSegment(upper,crawlerAnimatedHip,crawlerAnimatedKnee,.055);alignCrawlerSegment(lower,crawlerAnimatedKnee,crawlerAnimatedAnkle,.048);joint.position.copy(crawlerAnimatedKnee);joint.rotation.copy(joint.userData.baseRotation);
    foot.position.set(crawlerAnimatedAnkle.x+side*.055,crawlerAnimatedAnkle.y-.012,crawlerAnimatedAnkle.z+.035);foot.rotation.copy(foot.userData.baseRotation);foot.rotation.x-=lift*.12;
  });
  actor.parts.jaws.forEach((part)=>{const side=part.userData.crawlerSide||1;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.rotation.y+=side*(biteSnap*.48+Math.sin(elapsed*2.3+(actor.seed||0))*.012);part.position.z+=bite*.1;});
  actor.parts.crawlerFeelers.forEach((part)=>{const side=part.userData.crawlerSide||1;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.rotation.x+=Math.sin(elapsed*3.1+(actor.seed||0)+side)*.065;part.rotation.z+=side*(Math.sin(elapsed*2.2+(actor.seed||0))*.035-bite*.16);part.position.z+=bite*.18;});
  actor.parts.crawlerPistons.forEach((part,index)=>{const compression=Math.sin(walkPhase+index*Math.PI)*movementAmount;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.scale.copy(part.userData.baseScale);part.scale.y*=1+compression*.12;part.position.y-=compression*.018;});
  actor.parts.crawlerArmor.forEach((plate,index)=>{plate.position.copy(plate.userData.basePosition);plate.rotation.copy(plate.userData.baseRotation);plate.position.y+=Math.abs(stride)*(.012+index*.004);plate.rotation.z+=Math.sin(walkPhase+index*1.4)*movementAmount*.012;plate.position.z+=bite*(index<4?.09:.04);});
  actor.parts.glows.forEach((part,index)=>part.scale.copy(part.userData.baseScale).multiplyScalar(1+Math.sin(elapsed*5+(actor.seed||0)+index)*.055+bite*.13));
  if(actor.parts.body){actor.parts.body.position.copy(actor.parts.body.userData.basePosition);actor.parts.body.rotation.copy(actor.parts.body.userData.baseRotation);actor.parts.body.position.y+=Math.abs(stride)*.035;actor.parts.body.position.z+=bite*.1;actor.parts.body.rotation.z+=Math.sin(walkPhase*.5)*movementAmount*.025;}
  if(actor.parts.head){actor.parts.head.position.copy(actor.parts.head.userData.basePosition);actor.parts.head.rotation.copy(actor.parts.head.userData.baseRotation);actor.parts.head.position.z+=bite*.14;actor.parts.head.position.y-=bite*.025;actor.parts.head.rotation.x-=bite*.14;}
  actor.group.rotation.x=-bite*.11;
}

export function applyEnemyPose(actor,{elapsed=0,movementAmount=0,walkPhase=elapsed*(actor.speed||actor.type?.speed||1)*4.2,attackStrength=0,stunnedProgress=null}={}){
  const stride=Math.sin(walkPhase)*movementAmount;
  if(actor.typeId===1||actor.id===1)animateCrawler(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else{
    actor.parts.legs.forEach((part,index)=>{resetPart(part);if([1,3,7,17].includes(actor.typeId||actor.id))part.rotation.z+=stride*(index%2?.12:-.12);else part.rotation.x+=stride*(index%2?.18:-.18);});
    actor.parts.arms.forEach((part,index)=>{resetPart(part);part.rotation.x+=stride*(index%2?-.12:.12)-attackStrength*.5;});
    actor.parts.rotors.forEach((part,index)=>{resetPart(part);part.rotation.y+=elapsed*(index%2?-13:13);});
    actor.parts.rings.forEach((part,index)=>{resetPart(part);part.rotation[index%2?"z":"y"]+=elapsed*(1.5+index*.7+attackStrength*8);});
    actor.parts.glows.forEach((part,index)=>part.scale.copy(part.userData.baseScale).multiplyScalar(1+Math.sin(elapsed*(2.4+index*.07)+(actor.seed||0)+index)*.045+attackStrength*.08));
    actor.parts.weapons.forEach((part)=>{resetPart(part);part.position.z-=attackStrength*.13;});
    if(actor.parts.body){resetPart(actor.parts.body);if(!actor.flying)actor.parts.body.position.y+=Math.abs(stride)*.035;}
    if(actor.parts.head)resetPart(actor.parts.head);
    const melee=(actor.type?.range??actor.range)<=5,lunge=attackStrength*(melee?.24:-.07);
    if(actor.parts.body){actor.parts.body.position.z=actor.parts.body.userData.basePosition.z+lunge;actor.parts.body.rotation.x=actor.parts.body.userData.baseRotation.x+attackStrength*(melee?-.16:.07);}
    if(actor.parts.head){actor.parts.head.position.z=actor.parts.head.userData.basePosition.z+lunge*1.15;actor.parts.head.rotation.x=actor.parts.head.userData.baseRotation.x+attackStrength*(melee?-.2:.05);}
    actor.group.rotation.x=attackStrength*(melee?-.1:.045);
    if(actor.flying){const baseY=actor.animationBaseY??0;actor.group.position.y=baseY+1.15+Math.sin(elapsed*2.4+(actor.seed||0))*.25+attackStrength*.1;}
  }
  if(stunnedProgress!==null){const arc=Math.sin(THREE.MathUtils.clamp(stunnedProgress,0,1)*Math.PI);actor.group.rotation.z+=arc*1.05;actor.group.position.y-=arc*.08;}
}

export function applyEnemyDeathPose(actor,time){
  const progress=THREE.MathUtils.clamp(time/(actor.deathDuration||1.2),0,1);
  actor.group.rotation.z=Math.min(Math.PI*.52,time*2.25);actor.group.rotation.y=(actor.deathBaseRotationY||0)+time*(actor.flying?5:.7);
  actor.group.position.y=Math.max(0,(actor.deathBaseY||0)-time*2.3);
  if(time>.55){const fade=Math.max(0,1-(time-.55)/.65),shrink=Math.exp(-(time-.55)*2.2);if(actor.baseScale)actor.group.scale.copy(actor.baseScale).multiplyScalar(shrink);actor.group.traverse((child)=>{if(child.isMesh&&child.material){child.material.transparent=true;child.material.opacity=Math.min(child.userData.baseOpacity??child.material.opacity,fade);}});}
  return progress>=1;
}

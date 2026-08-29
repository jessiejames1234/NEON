import * as THREE from "three";
import {alignCrawlerSegment} from "./model-utils.js";

const digHip=new THREE.Vector3(),digKnee=new THREE.Vector3(),digAnkle=new THREE.Vector3();

export function getScrapBurrowGroundPosition(actor,target=new THREE.Vector3()){
  // The model's powered drills extend along local +Z. Put the ground opening
  // beneath those tools rather than beneath the chassis origin.
  const forwardDistance=Math.max(.5,(actor.group.scale.z||1)*1.08);
  return target.set(
    actor.group.position.x+Math.sin(actor.group.rotation.y)*forwardDistance,
    .045,
    actor.group.position.z+Math.cos(actor.group.rotation.y)*forwardDistance,
  );
}

export function captureEnemySkillPose(group){
  const snapshots=[];
  group.traverse((child)=>{
    if(child===group)return;
    snapshots.push({
      child,
      position:child.position.clone(),
      quaternion:child.quaternion.clone(),
      scale:child.scale.clone(),
      visible:child.visible,
    });
  });
  return snapshots;
}

function resetEnemySkillPose(actor){
  actor.skillPoseSnapshots?.forEach((snapshot)=>{
    snapshot.child.position.copy(snapshot.position);
    snapshot.child.quaternion.copy(snapshot.quaternion);
    snapshot.child.scale.copy(snapshot.scale);
    snapshot.child.visible=snapshot.visible;
  });
}

export function getScrapBurrowPhase(time){
  if(time<1)return {name:"enter",progress:THREE.MathUtils.clamp(time,0,1)};
  if(time<3)return {name:"travel",progress:(time-1)/2};
  if(time<4)return {name:"emerge",progress:time-3};
  return {name:"complete",progress:1};
}

export function applyScrapDigPose(actor,progress,emerging=false){
  const p=THREE.MathUtils.clamp(progress,0,1);
  actor.parts.crawlerSmoke.forEach((part)=>{part.visible=false;});actor.parts.crawlerSparks.forEach((part)=>{part.visible=false;});actor.parts.crawlerEyes.forEach((part)=>{part.visible=true;});
  const enterCharge=THREE.MathUtils.smootherstep(p,0,.16),enterTip=THREE.MathUtils.smootherstep(p,.14,.43),enterDive=THREE.MathUtils.smootherstep(p,.36,.94);
  const emergeBreak=THREE.MathUtils.smootherstep(p,.1,.46),emergeLift=THREE.MathUtils.smootherstep(p,.24,.82),emergeSettle=THREE.MathUtils.smootherstep(p,.76,1);
  const depth=emerging?1-emergeLift:enterDive;
  const fold=emerging?1-THREE.MathUtils.smootherstep(p,.48,.94):THREE.MathUtils.smootherstep(p,.2,.82);
  const brace=emerging?Math.sin(THREE.MathUtils.clamp(p/.22,0,1)*Math.PI)*.025:Math.sin(THREE.MathUtils.clamp(p/.36,0,1)*Math.PI)*.085;
  const drillEnvelope=emerging
    ?1-THREE.MathUtils.smootherstep(p,.54,.86)
    :enterCharge*(1-THREE.MathUtils.smootherstep(p,.9,1));
  const drillCycle=Math.sin(p*Math.PI*24),chassisShake=drillCycle*drillEnvelope;
  const enterPitch=enterTip*.82-THREE.MathUtils.smootherstep(p,.82,1)*.17;
  const emergePitch=THREE.MathUtils.lerp(-.72,-.16,emergeBreak)+emergeSettle*.16;
  const pitch=emerging?emergePitch:enterPitch;
  const recoveryBounce=emerging?Math.sin(emergeSettle*Math.PI*2)*(1-emergeSettle)*.065:0;
  actor.group.position.y=-depth*.78-brace+recoveryBounce;
  actor.group.rotation.x=pitch;
  actor.group.rotation.z=chassisShake*.034;
  actor.parts.crawlerLegSets.forEach((leg)=>{
    const {side,rowIndex,upper,joint,lower,foot}=leg;
    const retractStart=emerging?[.5,.61,.72][rowIndex]:[.5,.38,.26][rowIndex];
    const retractDuration=emerging?.22:.32;
    const retract=emerging?1-THREE.MathUtils.smootherstep(p,retractStart,retractStart+retractDuration):THREE.MathUtils.smootherstep(p,retractStart,retractStart+retractDuration);
    const anchorPulse=emerging?0:Math.sin(THREE.MathUtils.clamp(p/.46,0,1)*Math.PI)*(1-retract);
    const rolePush=rowIndex===0?.12:rowIndex===2?-.11:0;
    const frontBias=(1-rowIndex)*.03;
    digHip.copy(leg.hip);digKnee.copy(leg.knee);digAnkle.copy(leg.ankle);
    digKnee.x=THREE.MathUtils.lerp(leg.knee.x+side*anchorPulse*.035,side*.47,retract);digKnee.y=THREE.MathUtils.lerp(leg.knee.y-anchorPulse*.025,.155,retract);digKnee.z=THREE.MathUtils.lerp(leg.knee.z+rolePush*anchorPulse*.45,leg.hip.z+frontBias,retract);
    digAnkle.x=THREE.MathUtils.lerp(leg.ankle.x+side*anchorPulse*.055,side*.535,retract);digAnkle.y=THREE.MathUtils.lerp(leg.ankle.y-anchorPulse*.018,.095,retract);digAnkle.z=THREE.MathUtils.lerp(leg.ankle.z+rolePush*anchorPulse,leg.hip.z+frontBias*.45,retract);
    alignCrawlerSegment(upper,digHip,digKnee,.055);alignCrawlerSegment(lower,digKnee,digAnkle,.048);joint.position.copy(digKnee);joint.rotation.copy(joint.userData.baseRotation);
    foot.position.set(digAnkle.x+side*.045,digAnkle.y-.012,digAnkle.z+.025);foot.rotation.copy(foot.userData.baseRotation);foot.rotation.z+=side*retract*.38;foot.rotation.x-=retract*.18;
  });
  actor.parts.jaws.forEach((jaw,index)=>{jaw.position.copy(jaw.userData.basePosition);jaw.rotation.copy(jaw.userData.baseRotation);const side=jaw.userData.crawlerSide||1,toolPhase=drillCycle+(index%3-1)*.18;jaw.rotation.y+=side*(fold*.18+toolPhase*drillEnvelope*.105);jaw.rotation.z+=toolPhase*drillEnvelope*.035;jaw.position.z+=fold*.105+Math.abs(toolPhase)*drillEnvelope*.028;jaw.position.y-=fold*.025;});
  actor.parts.crawlerDrills.forEach((tooth)=>{const side=tooth.userData.crawlerSide||1,angle=tooth.userData.drillPhase+p*Math.PI*18,radius=(tooth.userData.drillRadius||.072)+drillEnvelope*.006;tooth.position.set(tooth.userData.drillCenterX+side*fold*.025+Math.cos(angle)*radius,tooth.userData.drillCenterY+Math.sin(angle)*radius,tooth.userData.basePosition.z+fold*.105+Math.abs(drillCycle)*drillEnvelope*.018);tooth.rotation.copy(tooth.userData.baseRotation);tooth.rotation.z=angle;tooth.scale.copy(tooth.userData.baseScale);tooth.scale.y*=1+drillEnvelope*.1;});
  actor.parts.crawlerFeelers.forEach((feeler,index)=>{feeler.position.copy(feeler.userData.basePosition);feeler.rotation.copy(feeler.userData.baseRotation);feeler.rotation.z+=(feeler.userData.crawlerSide||1)*(fold*.28+chassisShake*.08);feeler.rotation.x-=fold*.16+Math.sin(p*Math.PI*12+index)*drillEnvelope*.035;});
  actor.parts.crawlerPistons.forEach((piston,index)=>{piston.position.copy(piston.userData.basePosition);piston.rotation.copy(piston.userData.baseRotation);piston.scale.copy(piston.userData.baseScale);piston.scale.y*=1-fold*.24+chassisShake*(index?-.025:.025);piston.position.y-=fold*.025;});
  actor.parts.crawlerArmor.forEach((plate,index)=>{plate.position.copy(plate.userData.basePosition);plate.rotation.copy(plate.userData.baseRotation);plate.position.y+=Math.abs(chassisShake)*(.009+index*.001)+drillEnvelope*(index<3?.014:.006);plate.rotation.z+=chassisShake*(.009+index*.0006);plate.rotation.x+=(index<3?(index-1)*drillEnvelope*.018:0);plate.position.z+=fold*(index<3?.025:.012);});
  actor.parts.glows.forEach((light,index)=>{light.scale.copy(light.userData.baseScale).multiplyScalar(1+drillEnvelope*(.12+Math.abs(drillCycle)*.16)+Math.sin(p*Math.PI*8+index)*.025);});
  if(actor.parts.body){actor.parts.body.position.copy(actor.parts.body.userData.basePosition);actor.parts.body.rotation.copy(actor.parts.body.userData.baseRotation);actor.parts.body.position.y-=fold*.065+Math.abs(chassisShake)*.014;actor.parts.body.position.z+=fold*.055;actor.parts.body.rotation.x+=fold*.2;}
  if(actor.parts.head){
    actor.parts.head.position.copy(actor.parts.head.userData.basePosition);actor.parts.head.rotation.copy(actor.parts.head.userData.baseRotation);
    if(emerging){
      // Lift and tip the drill rig through the opening before the chassis rises.
      // Do not reuse the downward digging fold during emergence.
      const headBreak=1-emergeBreak;
      actor.parts.head.position.y+=headBreak*.15-Math.abs(chassisShake)*.012;
      actor.parts.head.position.z+=headBreak*.16;
      actor.parts.head.rotation.x-=headBreak*.24;
    }else{
      actor.parts.head.position.y-=fold*.13+Math.abs(chassisShake)*.022;
      actor.parts.head.position.z+=fold*.15;
      actor.parts.head.rotation.x+=fold*.34;
    }
    actor.parts.head.rotation.z+=chassisShake*.055;
  }
}

export function applyEnemySkillPose(actor,definition,time,duration,{previewMotion=false}={}){
  const parts=actor.parts,p=THREE.MathUtils.clamp(time/duration,0,1),arc=Math.sin(p*Math.PI);
  const motion=definition.animations.skillMotion;
  if(motion==="burrow"){
    // Flex and gameplay both restore this identical bind pose before applying
    // the Burrow frame. No locomotion or attack transform can leak into it.
    resetEnemySkillPose(actor);
    const phase=getScrapBurrowPhase(time);
    if(phase.name==="enter")applyScrapDigPose(actor,phase.progress,false);
    else if(phase.name==="travel"){actor.group.position.y=-.78;actor.group.rotation.x=.65;if(previewMotion)actor.group.position.z+=THREE.MathUtils.smootherstep(phase.progress,0,1)*8.55;}
    else{if(previewMotion)actor.group.position.z+=8.55;applyScrapDigPose(actor,phase.progress,true);}
  }else if(motion==="dash"&&previewMotion){const travel=THREE.MathUtils.smoothstep(Math.min(1,p/.68),0,1);actor.group.position.z+=travel*8.55;actor.group.rotation.x-=arc*.13;}
  else if(motion==="shadowDash"&&previewMotion){const travel=THREE.MathUtils.smoothstep(Math.min(1,p/.62),0,1);actor.group.position.z+=travel*8.55;actor.group.position.x+=Math.sin(p*Math.PI*2)*.7;actor.group.rotation.y+=Math.sin(p*Math.PI*2)*.45;}
  else if(motion==="leap"&&previewMotion){actor.group.position.y+=arc*1.45;actor.group.position.z+=THREE.MathUtils.smoothstep(Math.min(1,p/.7),0,1)*8.4;parts.legs.forEach((part,index)=>part.rotation.z+=(index%2?1:-1)*arc*.38);}
  else if(motion==="phase"){if(previewMotion){actor.group.visible=!(p>.32&&p<.55);if(p>=.55)actor.group.position.z+=8.55;actor.group.position.x+=Math.sin(p*Math.PI*2)*.45;}parts.rings.forEach((part,index)=>part.rotation[index%2?"z":"y"]+=time*5);}
  else if(motion==="stomp"){if(previewMotion)actor.group.position.y+=Math.sin(Math.min(1,p*2)*Math.PI)*.45;if(parts.body)parts.body.rotation.x-=arc*.18;parts.rings.forEach((part)=>part.scale.multiplyScalar(1+p*8));}
  else if(motion==="core"){parts.rings.forEach((part,index)=>{part.rotation.x+=time*(1+index);part.rotation.y+=time*(1.4+index);part.scale.multiplyScalar(1+arc*.18);});parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.25));}
  else if(["rangedBurst","sniper","barrage","bombardment"].includes(motion)){parts.weapons.forEach((part,index)=>{part.position.z-=Math.abs(Math.sin(time*(motion==="barrage"?16:7)+index))*.18;});actor.group.rotation.z+=Math.sin(time*18)*arc*.025;}
  else if(["pulse","deploy","gravityOrb"].includes(motion)){parts.rings.forEach((part,index)=>{part.rotation[index%2?"z":"y"]+=time*4;part.scale.multiplyScalar(motion==="pulse"?1+p*6:1+arc*.35);});parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.3));}
  else if(motion==="flameWall")parts.weapons.forEach((part)=>{part.rotation.y+=Math.sin(p*Math.PI*2)*.5;part.scale.z*=1+arc*.3;});
  else if(motion==="selfPulse"){if(previewMotion&&actor.groupScale)actor.group.scale.copy(actor.groupScale).multiplyScalar(1+arc*.16);parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.4));}
  else if(motion==="scanning"){if(parts.head)parts.head.rotation.y+=Math.sin(p*Math.PI*4)*.65;parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.25));}
  else if(motion==="cloud"){parts.glows.forEach((part,index)=>part.scale.multiplyScalar(1+arc*(.3+index*.015)));if(parts.body)parts.body.rotation.y+=time*.35;}
  else{if(parts.body){parts.body.position.y+=arc*.12;parts.body.rotation.y+=time*.5;}parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.3));}
  return p;
}

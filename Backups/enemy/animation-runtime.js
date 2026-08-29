import * as THREE from "three";
import {alignCrawlerSegment,crawlerAnimatedHip,crawlerAnimatedKnee,crawlerAnimatedAnkle} from "./model-utils.js";

function resetPart(part){
  if(part.userData.basePosition)part.position.copy(part.userData.basePosition);
  if(part.userData.baseRotation)part.rotation.copy(part.userData.baseRotation);
  if(part.userData.baseScale)part.scale.copy(part.userData.baseScale);
}

export function applyCrawlerMalfunctionEffects(actor,elapsed,intensity=0,death=false,fade=1){
  const active=intensity>.001&&fade>.001;
  actor.parts.crawlerSmoke.forEach((puff,index)=>{
    if(!active){puff.visible=false;return;}
    const phase=puff.userData.fxPhase||0,cycle=(elapsed*(death?.68:.48)+phase)%1,spread=(death?1.35:1)*intensity;
    puff.visible=true;puff.position.copy(puff.userData.basePosition);puff.position.x+=Math.sin(elapsed*1.7+index)*.07*spread;puff.position.y+=cycle*(death?.48:.34);puff.position.z+=Math.cos(elapsed*1.3+index)*.045*spread;
    puff.scale.copy(puff.userData.baseScale).multiplyScalar((.55+cycle*1.35)*spread);puff.material.opacity=Math.pow(1-cycle,1.45)*(death?.42:.3)*intensity*fade;
  });
  actor.parts.crawlerSparks.forEach((spark,index)=>{
    if(!active){spark.visible=false;return;}
    const phase=spark.userData.fxPhase||0,burst=Math.sin(elapsed*(death?39:31)+phase),on=burst>.18;
    spark.visible=on;spark.position.copy(spark.userData.basePosition);spark.position.x+=Math.sin(elapsed*23+index)*.045*intensity;spark.position.y+=Math.cos(elapsed*19+index)*.035*intensity;
    spark.rotation.copy(spark.userData.baseRotation);spark.rotation.x+=elapsed*(8+index);spark.rotation.z+=Math.sin(elapsed*17+phase)*1.1;spark.scale.copy(spark.userData.baseScale);spark.scale.y*=.45+Math.max(0,burst)*(death?2.3:1.65);spark.material.opacity=(on?.92:0)*intensity*fade;
  });
  actor.parts.crawlerEyes.forEach((eye,index)=>{
    if(death){
      eye.visible=fade>.001;
      eye.material.transparent=true;
      eye.material.opacity=(eye.userData.baseOpacity??1)*fade;
      eye.scale.copy(eye.userData.baseScale).multiplyScalar(.72+.28*fade);
      return;
    }
    eye.visible=!active||Math.sin(elapsed*22+index*.7)>-.78;
    if(active)eye.scale.copy(eye.userData.baseScale).multiplyScalar(.82+Math.max(0,Math.sin(elapsed*18+index))*.28);
  });
}

function animateCrawler(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const previousElapsed=actor.crawlerPoseElapsed,poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.crawlerPoseElapsed=elapsed;actor.crawlerMovementBlend=THREE.MathUtils.damp(actor.crawlerMovementBlend??0,movementAmount,10,poseDelta);movementAmount=actor.crawlerMovementBlend;
  const bite=THREE.MathUtils.clamp(attackStrength,0,1),strike=THREE.MathUtils.smootherstep(bite,.06,.72),stride=Math.sin(walkPhase*2)*movementAmount,idleBlend=1-movementAmount;
  actor.parts.crawlerLegSets.forEach((leg)=>{
    const {side,rowIndex,upper,joint,lower,foot}=leg;
    const tripodOffset=((rowIndex+(side>0?1:0))%2)*Math.PI,phase=walkPhase+tripodOffset,cycle=((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI*2);
    const swingFraction=.34,inSwing=cycle<swingFraction,swingProgress=inSwing?cycle/swingFraction:(cycle-swingFraction)/(1-swingFraction);
    const easedStep=THREE.MathUtils.smootherstep(swingProgress,0,1),stepOffset=(inSwing?THREE.MathUtils.lerp(-.105,.12,easedStep):THREE.MathUtils.lerp(.12,-.105,easedStep))*movementAmount;
    const lift=(inSwing?Math.sin(swingProgress*Math.PI):0)*movementAmount,weight=(!inSwing?Math.sin(swingProgress*Math.PI):0)*movementAmount;
    crawlerAnimatedHip.copy(leg.hip);crawlerAnimatedKnee.copy(leg.knee);crawlerAnimatedAnkle.copy(leg.ankle);
    crawlerAnimatedHip.y-=weight*.009;crawlerAnimatedHip.z+=stepOffset*.08;
    crawlerAnimatedKnee.x+=side*(lift*.035+strike*.028);crawlerAnimatedKnee.y+=lift*.065-weight*.012;crawlerAnimatedKnee.z+=stepOffset*.48;
    crawlerAnimatedAnkle.y+=lift*.12;crawlerAnimatedAnkle.z+=stepOffset;
    alignCrawlerSegment(upper,crawlerAnimatedHip,crawlerAnimatedKnee,.055);alignCrawlerSegment(lower,crawlerAnimatedKnee,crawlerAnimatedAnkle,.048);joint.position.copy(crawlerAnimatedKnee);joint.rotation.copy(joint.userData.baseRotation);
    foot.position.set(crawlerAnimatedAnkle.x+side*.055,crawlerAnimatedAnkle.y-.012,crawlerAnimatedAnkle.z+.035);foot.rotation.copy(foot.userData.baseRotation);foot.rotation.x-=lift*.22;foot.rotation.z+=side*(inSwing?Math.sin(swingProgress*Math.PI)*.055:0);
  });
  actor.parts.jaws.forEach((part,index)=>{const side=part.userData.crawlerSide||1,mechanicalPulse=Math.sin(elapsed*18+index)*strike*.025;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.rotation.y+=side*(strike*.43+mechanicalPulse);part.position.z+=strike*.115;part.position.y-=strike*.018;});
  actor.parts.crawlerDrills.forEach((tooth)=>{const angle=tooth.userData.drillPhase+elapsed*(1.4+strike*25),radius=tooth.userData.drillRadius||.072,side=tooth.userData.crawlerSide||1,open=strike*.055;tooth.position.set(tooth.userData.drillCenterX+side*open+Math.cos(angle)*radius,tooth.userData.drillCenterY+Math.sin(angle)*radius,tooth.userData.basePosition.z+strike*.115);tooth.rotation.copy(tooth.userData.baseRotation);tooth.rotation.z=angle;});
  actor.parts.crawlerFeelers.forEach((part)=>{const side=part.userData.crawlerSide||1;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.rotation.x+=Math.sin(elapsed*2.7+(actor.seed||0)+side)*(.055+idleBlend*.035);part.rotation.z+=side*(Math.sin(elapsed*1.8+(actor.seed||0))*.04-strike*.13);part.position.z+=strike*.12;});
  actor.parts.crawlerPistons.forEach((part,index)=>{const compression=Math.sin(walkPhase+index*Math.PI)*movementAmount;part.position.copy(part.userData.basePosition);part.rotation.copy(part.userData.baseRotation);part.scale.copy(part.userData.baseScale);part.scale.y*=1+compression*.12;part.position.y-=compression*.018;});
  actor.parts.crawlerArmor.forEach((plate,index)=>{plate.position.copy(plate.userData.basePosition);plate.rotation.copy(plate.userData.baseRotation);plate.position.y+=Math.abs(stride)*(.008+index*.0015)+Math.sin(elapsed*1.9+index)*idleBlend*.0025;plate.rotation.z+=Math.sin(walkPhase+index*1.4)*movementAmount*.009;plate.position.z+=strike*(index<4?.07:.028);});
  actor.parts.glows.forEach((part,index)=>part.scale.copy(part.userData.baseScale).multiplyScalar(1+Math.sin(elapsed*4.2+(actor.seed||0)+index)*.045+strike*.16));
  if(actor.parts.body){actor.parts.body.position.copy(actor.parts.body.userData.basePosition);actor.parts.body.rotation.copy(actor.parts.body.userData.baseRotation);actor.parts.body.position.y+=Math.abs(stride)*.024+Math.sin(elapsed*1.8)*idleBlend*.005;actor.parts.body.position.z+=strike*.12;actor.parts.body.rotation.z+=Math.sin(walkPhase)*movementAmount*.018;actor.parts.body.rotation.x-=strike*.075;}
  if(actor.parts.head){actor.parts.head.position.copy(actor.parts.head.userData.basePosition);actor.parts.head.rotation.copy(actor.parts.head.userData.baseRotation);actor.parts.head.position.z+=strike*.2;actor.parts.head.position.y-=strike*.035;actor.parts.head.rotation.x-=strike*.17;actor.parts.head.rotation.y+=Math.sin(elapsed*.85+(actor.seed||0))*idleBlend*.035;}
  actor.group.rotation.x=-strike*.075;actor.group.rotation.z=0;
  applyCrawlerMalfunctionEffects(actor,elapsed,0);
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
  if(stunnedProgress!==null){
    const stunP=THREE.MathUtils.clamp(stunnedProgress,0,1),arc=Math.sin(stunP*Math.PI),crawler=actor.typeId===1||actor.id===1;
    if(crawler){
      const sway=Math.sin(stunP*Math.PI*2),faultPulse=.5+.5*Math.sin(stunP*Math.PI*8),jolt=Math.sin(stunP*Math.PI*18)*(.025+faultPulse*.025);
      actor.group.rotation.z=jolt*.45;
      if(actor.parts.body){actor.parts.body.rotation.z+=sway*.09+jolt*1.3;actor.parts.body.position.y-=faultPulse*.025;}
      if(actor.parts.head){actor.parts.head.rotation.z+=Math.sin(stunP*Math.PI*10)*.13+jolt;actor.parts.head.rotation.y+=sway*.08;actor.parts.head.position.y-=faultPulse*.065;actor.parts.head.position.x+=jolt*.7;}
      actor.parts.jaws.forEach((part,index)=>part.rotation.y+=(part.userData.crawlerSide||1)*(.06+faultPulse*.14+Math.sin(stunP*Math.PI*14+index)*.025));
      actor.parts.crawlerFeelers.forEach((part,index)=>part.rotation.z+=(part.userData.crawlerSide||1)*Math.sin(stunP*Math.PI*12+index)*.11);
      actor.parts.crawlerLegSets.forEach((leg,index)=>{leg.foot.rotation.z+=(leg.side||1)*Math.sin(stunP*Math.PI*10+index)*.055*faultPulse;leg.joint.position.y+=Math.sin(stunP*Math.PI*14+index)*.012*faultPulse;});
      applyCrawlerMalfunctionEffects(actor,elapsed,.78+faultPulse*.22,false,1);
    }else{actor.group.rotation.z+=arc*1.05;actor.group.position.y-=arc*.08;}
  }
}

export function applyEnemyDeathPose(actor,time){
  const progress=THREE.MathUtils.clamp(time/(actor.deathDuration||1.2),0,1);
  if(actor.typeId===1||actor.id===1){
    const collapseDuration=actor.deathDuration||2.4,collapseProgress=THREE.MathUtils.clamp(time/collapseDuration,0,1),fadeProgress=THREE.MathUtils.clamp(time-collapseDuration,0,1);
    const collapse=THREE.MathUtils.smootherstep(collapseProgress,0,.78),fallSide=((actor.seed||.5)%1)>.5?1:-1;
    actor.group.rotation.z=0;actor.group.rotation.x=0;actor.group.rotation.y=(actor.deathBaseRotationY||0)+fallSide*collapse*.025;actor.group.position.y=actor.deathBaseY||0;
    actor.parts.crawlerLegSets.forEach((leg)=>{
      const {side,rowIndex,upper,joint,lower,foot}=leg;
      crawlerAnimatedHip.copy(leg.hip);crawlerAnimatedKnee.copy(leg.knee);crawlerAnimatedAnkle.copy(leg.ankle);
      const outward=Math.abs(leg.ankle.x)+.1+rowIndex*.025,foreAft=(rowIndex-1)*.085;
      crawlerAnimatedKnee.x=THREE.MathUtils.lerp(leg.knee.x,side*(.53+rowIndex*.02),collapse);crawlerAnimatedKnee.y=THREE.MathUtils.lerp(leg.knee.y,.065,collapse);crawlerAnimatedKnee.z+=foreAft*collapse*.45;
      crawlerAnimatedAnkle.x=THREE.MathUtils.lerp(leg.ankle.x,side*outward,collapse);crawlerAnimatedAnkle.y=THREE.MathUtils.lerp(leg.ankle.y,.045,collapse);crawlerAnimatedAnkle.z+=foreAft*collapse;
      alignCrawlerSegment(upper,crawlerAnimatedHip,crawlerAnimatedKnee,.055);alignCrawlerSegment(lower,crawlerAnimatedKnee,crawlerAnimatedAnkle,.048);joint.position.copy(crawlerAnimatedKnee);
      foot.position.set(crawlerAnimatedAnkle.x+side*.055,crawlerAnimatedAnkle.y-.012,crawlerAnimatedAnkle.z+.035);foot.rotation.copy(foot.userData.baseRotation);foot.rotation.y+=side*(rowIndex-1)*collapse*.12;foot.rotation.z+=side*(.2+rowIndex*.08)*collapse;foot.rotation.x+=(rowIndex-1)*collapse*.1;
    });
    actor.parts.crawlerArmor.forEach((part,index)=>{resetPart(part);part.position.y-=collapse*(index<3?.1:.075);part.rotation.x+=(index<3?(index-1)*collapse*.025:0);});
    actor.parts.crawlerPistons.forEach((part)=>{resetPart(part);part.position.y-=collapse*.075;part.scale.y*=1-collapse*.22;});
    if(actor.parts.body){resetPart(actor.parts.body);actor.parts.body.position.y-=collapse*.13;}
    if(actor.parts.head){resetPart(actor.parts.head);actor.parts.head.position.y-=collapse*.16;actor.parts.head.position.z+=collapse*.04;actor.parts.head.rotation.x+=collapse*.22;}
    actor.parts.jaws.forEach((part)=>{resetPart(part);part.rotation.y+=(part.userData.crawlerSide||1)*collapse*.28;part.position.y-=collapse*.055;});
    actor.parts.crawlerDrills.forEach((part)=>resetPart(part));
    const visibility=1-fadeProgress;applyCrawlerMalfunctionEffects(actor,time,.75+Math.sin(Math.min(1,collapseProgress)*Math.PI)*.25,true,visibility);
    if(fadeProgress>0)actor.group.traverse((child)=>{if(child.isMesh&&child.material&&!child.userData.crawlerDamageFx){child.material.transparent=true;child.material.opacity=(child.userData.baseOpacity??1)*visibility;}});
    // The optics have their own long power-down instead of staying fully lit
    // until the final body fade. Apply this after the generic mesh fade so it
    // cannot overwrite the dimming red eye material.
    const eyeFade=1-THREE.MathUtils.smootherstep(collapseProgress,.08,1);
    actor.parts.crawlerEyes.forEach((eye)=>{
      const opacity=Math.min(visibility,eyeFade);
      eye.visible=opacity>.001;
      eye.material.transparent=true;
      eye.material.opacity=(eye.userData.baseOpacity??1)*opacity;
      eye.scale.copy(eye.userData.baseScale).multiplyScalar(.62+.38*eyeFade);
    });
    return time>=collapseDuration+1;
  }
  actor.group.rotation.z=Math.min(Math.PI*.52,time*2.25);actor.group.rotation.y=(actor.deathBaseRotationY||0)+time*(actor.flying?5:.7);
  actor.group.position.y=Math.max(0,(actor.deathBaseY||0)-time*2.3);
  if(time>.55){const fade=Math.max(0,1-(time-.55)/.65),shrink=Math.exp(-(time-.55)*2.2);if(actor.baseScale)actor.group.scale.copy(actor.baseScale).multiplyScalar(shrink);actor.group.traverse((child)=>{if(child.isMesh&&child.material){child.material.transparent=true;child.material.opacity=Math.min(child.userData.baseOpacity??child.material.opacity,fade);}});}
  return progress>=1;
}

import * as THREE from "three";
import {alignCrawlerSegment,crawlerAnimatedHip,crawlerAnimatedKnee,crawlerAnimatedAnkle} from "./model-utils.js";

let enemyEffectQuality=1;
export function setEnemyEffectQuality(value){enemyEffectQuality=THREE.MathUtils.clamp(Number(value)||0,.1,1);}

function resetPart(part){
  if(part.userData.basePosition)part.position.copy(part.userData.basePosition);
  if(part.userData.baseRotation)part.rotation.copy(part.userData.baseRotation);
  if(part.userData.baseScale)part.scale.copy(part.userData.baseScale);
}

export function applyCrawlerMalfunctionEffects(actor,elapsed,intensity=0,death=false,fade=1){
  const active=intensity>.001&&fade>.001;
  actor.parts.crawlerSmoke.forEach((puff,index)=>{
    if(!active||index>=Math.ceil(actor.parts.crawlerSmoke.length*enemyEffectQuality)){puff.visible=false;return;}
    const phase=puff.userData.fxPhase||0,cycle=(elapsed*(death?.68:.48)+phase)%1,spread=(death?1.35:1)*intensity;
    puff.visible=true;puff.position.copy(puff.userData.basePosition);puff.position.x+=Math.sin(elapsed*1.7+index)*.07*spread;puff.position.y+=cycle*(death?.48:.34);puff.position.z+=Math.cos(elapsed*1.3+index)*.045*spread;
    puff.scale.copy(puff.userData.baseScale).multiplyScalar((.55+cycle*1.35)*spread);puff.material.opacity=Math.pow(1-cycle,1.45)*(death?.42:.3)*intensity*fade;
  });
  actor.parts.crawlerSparks.forEach((spark,index)=>{
    if(!active||index>=Math.ceil(actor.parts.crawlerSparks.length*enemyEffectQuality)){spark.visible=false;return;}
    const phase=spark.userData.fxPhase||0,burst=Math.sin(elapsed*(death?39:31)+phase),on=burst>.18;
    spark.visible=on;spark.position.copy(spark.userData.basePosition);spark.position.x+=Math.sin(elapsed*23+index)*.045*intensity;spark.position.y+=Math.cos(elapsed*19+index)*.035*intensity;
    spark.rotation.copy(spark.userData.baseRotation);spark.rotation.x+=elapsed*(8+index);spark.rotation.z+=Math.sin(elapsed*17+phase)*1.1;spark.scale.copy(spark.userData.baseScale);spark.scale.y*=.45+Math.max(0,burst)*(death?2.3:1.65);spark.material.opacity=Math.min(1,(on?.92:0)*intensity*fade);
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

function applyBrokenDroneBodyFailureEffects(actor,elapsed,intensity=0,death=false,fade=1){
  const rig=actor.parts.brokenDrone,active=intensity>.001&&fade>.001;
  if(!rig)return;
  rig.failureSmoke?.forEach((puff,index)=>{
    if(!active||index>=Math.ceil(rig.failureSmoke.length*enemyEffectQuality)){puff.visible=false;return;}
    const phase=puff.userData.fxPhase||0,cycle=(elapsed*(death?.82:.62)+phase)%1;
    puff.visible=true;puff.position.copy(puff.userData.basePosition);
    puff.position.x+=Math.sin(elapsed*2.1+index)*.09*intensity;
    puff.position.y+=cycle*(death?.6:.43)*intensity;
    puff.position.z+=Math.cos(elapsed*1.7+index)*.065*intensity;
    puff.scale.copy(puff.userData.baseScale).multiplyScalar((.48+cycle*1.65)*intensity);
    puff.material.opacity=Math.min(.62,Math.pow(1-cycle,1.35)*(death?.5:.38)*intensity*fade);
  });
  rig.failureSparks?.forEach((spark,index)=>{
    if(!active||index>=Math.ceil(rig.failureSparks.length*enemyEffectQuality)){spark.visible=false;return;}
    const phase=spark.userData.fxPhase||0,burst=Math.sin(elapsed*(death?44:35)+phase),on=burst>-.02;
    spark.visible=on;spark.position.copy(spark.userData.basePosition);
    spark.position.x+=Math.sin(elapsed*29+index)*.065*intensity;
    spark.position.y+=Math.cos(elapsed*23+index)*.052*intensity;
    spark.position.z+=Math.sin(elapsed*19+index*1.4)*.045*intensity;
    spark.rotation.copy(spark.userData.baseRotation);spark.rotation.x+=elapsed*(11+index*.4);spark.rotation.z+=Math.sin(elapsed*21+phase)*1.4;
    spark.scale.copy(spark.userData.baseScale);spark.scale.y*=.38+Math.max(0,burst)*(death?3.1:2.25);
    spark.material.opacity=Math.min(1,(on?.95:0)*intensity*fade);
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

function animateBrokenDrone(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.brokenDrone;
  if(!rig)return;
  const previousElapsed=actor.brokenDronePoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.brokenDronePoseElapsed=elapsed;
  actor.brokenDroneMovementBlend=THREE.MathUtils.damp(actor.brokenDroneMovementBlend??0,movementAmount,7.5,poseDelta);
  const move=actor.brokenDroneMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.78);
  const seed=actor.seed||0,engineBeat=Math.sin(elapsed*3.1+seed),travelBeat=Math.sin(walkPhase*.72+seed),faultBeat=Math.sin(elapsed*11.5+seed*2.3);

  [actor.parts.body,actor.parts.head,rig.intactWing,rig.workingRotor,rig.brokenHub,rig.brokenBladeUpper,rig.brokenBladeLower,rig.brokenShard,rig.hangingCable,rig.faultLight,
    ...rig.barrageBarrels,rig.workingThruster,rig.deadThruster,rig.intactTail,rig.damagedTail,rig.reactor,rig.reactorRing,rig.antenna,rig.loosePlate].forEach((part)=>part&&resetPart(part));
  actor.parts.rings.forEach((part,index)=>{resetPart(part);part.rotation[index%2?"z":"y"]+=elapsed*(2.2+index*.6+attackStrength*5);});
  actor.parts.glows.forEach((part,index)=>{resetPart(part);part.visible=true;part.scale.multiplyScalar(1+Math.sin(elapsed*(3.2+index*.09)+seed+index)*.055+attack*.18);});

  const baseY=actor.animationBaseY??0;
  actor.group.position.y=baseY+1.15+engineBeat*.075+travelBeat*move*.055+attack*.045;
  actor.group.rotation.x=-move*.13+attack*.075+engineBeat*.012;
  actor.group.rotation.z=engineBeat*.025+(travelBeat*.12-faultBeat*.018)*move-attack*.035;

  // One healthy fan carries most of the airframe, while the destroyed side
  // trembles and trails behind instead of mirroring it.
  rig.workingRotor.rotation.y+=elapsed*(18+move*12+attack*18);
  rig.intactWing.rotation.z+=travelBeat*move*.055-attack*.025;
  rig.brokenHub.rotation.z+=faultBeat*(.035+move*.035+attack*.06);
  rig.brokenBladeUpper.rotation.z+=faultBeat*(.045+attack*.09);
  rig.brokenBladeLower.rotation.x-=Math.sin(elapsed*7.7+seed)*(.035+move*.025);
  rig.brokenShard.rotation.y+=Math.sin(elapsed*4.3+seed)*.05;
  rig.hangingCable.rotation.z+=Math.sin(elapsed*3.8+seed)*(.1+move*.08);
  rig.loosePlate.rotation.x+=Math.sin(elapsed*6.1+seed)*(.025+move*.04+attack*.055);

  // The cyclops scans while idle, locks forward in motion, and punches back
  // during each shot.
  actor.parts.head.rotation.y+=Math.sin(elapsed*.92+seed)*(1-move)*.16;
  actor.parts.head.position.z-=attack*.075;
  actor.parts.head.rotation.x+=attack*.1;
  rig.eye.scale.multiplyScalar(1+attack*.28+Math.max(0,engineBeat)*.06);

  rig.barrageBarrels.forEach((barrel,index)=>{
    const stagger=.72+.28*Math.max(0,Math.sin(elapsed*18-index*1.7));
    barrel.position.z-=attack*(.13+stagger*.09);
    barrel.rotation.x+=attack*(index-1)*.025;
  });
  rig.workingThruster.scale.z*=1+move*.38+attack*.24+Math.max(0,engineBeat)*.12;
  rig.deadThruster.rotation.z+=faultBeat*.025;
  rig.intactTail.rotation.x-=travelBeat*move*.055;
  rig.damagedTail.rotation.z+=faultBeat*(.025+move*.035);
  rig.reactor.rotation.y+=elapsed*(1.8+move*1.2+attack*4);
  rig.reactorRing.rotation.y+=elapsed*(2.6+attack*7);
  rig.antenna.rotation.z+=Math.sin(elapsed*2.2+seed)*.055-travelBeat*move*.045;
  rig.faultLight.visible=Math.sin(elapsed*(6.5+attack*8)+seed)>-.42;
  applyCrawlerMalfunctionEffects(actor,elapsed,.42,false,1);
  applyBrokenDroneBodyFailureEffects(actor,elapsed,0);
}

export function applyEnemyPose(actor,{elapsed=0,movementAmount=0,walkPhase=elapsed*(actor.speed||actor.type?.speed||1)*4.2,attackStrength=0,stunnedProgress=null}={}){
  const stride=Math.sin(walkPhase)*movementAmount;
  if(actor.typeId===1||actor.id===1)animateCrawler(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===2||actor.id===2)animateBrokenDrone(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else{
    // Start every generic pose from a stable root transform. Stunned used to
    // add rotation and subtract height every frame, eventually sinking units.
    actor.group.rotation.z=0;
    if(!actor.flying)actor.group.position.y=actor.deathBaseY??actor.animationBaseY??0;
    actor.parts.legs.forEach((part,index)=>{resetPart(part);if([1,3,7,17].includes(actor.typeId||actor.id))part.rotation.z+=stride*(index%2?.12:-.12);else part.rotation.x+=stride*(index%2?.18:-.18);});
    actor.parts.arms.forEach((part,index)=>{resetPart(part);part.rotation.x+=stride*(index%2?-.12:.12)-attackStrength*.5;});
    actor.parts.rotors.forEach((part,index)=>{resetPart(part);part.rotation.y+=elapsed*(index%2?-13:13);});
    actor.parts.weaponRotors?.forEach((part,index)=>{resetPart(part);if(attackStrength>.01)part.rotation.y+=elapsed*(index%2?-24:24)*attackStrength;});
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
    }else if(actor.typeId===2||actor.id===2){
      const rig=actor.parts.brokenDrone,fault=Math.sin(stunP*Math.PI*12),flutter=Math.sin(stunP*Math.PI*20);
      // A disabled flying drone rests on its belly with the destroyed right
      // side dipped toward the floor; only components twitch during the loop.
      actor.group.rotation.x=.075+fault*.012;
      actor.group.rotation.z=-.16+flutter*.018;
      actor.group.position.y=(actor.animationBaseY??0)+.02+Math.abs(flutter)*.008;
      if(rig){
        rig.workingRotor.rotation.y=rig.workingRotor.userData.baseRotation.y+elapsed*(2.2+Math.max(0,fault)*3.5);
        rig.brokenHub.rotation.z+=fault*.16;rig.brokenBladeUpper.rotation.z+=flutter*.13;rig.brokenBladeLower.rotation.x-=fault*.12;
        rig.hangingCable.rotation.z+=fault*.2;rig.loosePlate.rotation.x+=flutter*.12;rig.damagedTail.rotation.z+=fault*.1;
        actor.parts.head.rotation.z+=fault*.12;actor.parts.head.position.x+=flutter*.035;
        rig.eye.visible=fault>-.35;rig.faultLight.visible=flutter>.15;
        rig.workingThruster.scale.z*=.55+Math.max(0,fault)*.55;
      }
      applyCrawlerMalfunctionEffects(actor,elapsed,1.25,false,1);
      applyBrokenDroneBodyFailureEffects(actor,elapsed,1.05,false,1);
    }else{
      actor.group.rotation.z=arc*1.05;
      if(actor.flying)actor.group.position.y-=arc*.08;
      else actor.group.position.y=(actor.deathBaseY??actor.animationBaseY??0)-arc*.08;
    }
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
  if(actor.typeId===2||actor.id===2){
    const duration=actor.deathDuration||2.4,p=THREE.MathUtils.clamp(time/duration,0,1),rig=actor.parts.brokenDrone;
    const fail=THREE.MathUtils.smootherstep(p,0,.32),fall=THREE.MathUtils.smootherstep(p,.12,.72),impact=THREE.MathUtils.smootherstep(p,.62,.9),fade=1-THREE.MathUtils.smootherstep(p,.72,1);
    const fallSide=-1,startY=(actor.deathBaseY??0)+(actor.anchor?1.15:0);
    actor.group.position.y=THREE.MathUtils.lerp(startY,0,fall);
    actor.group.rotation.x=fail*.16-impact*.09;
    actor.group.rotation.z=fallSide*(fail*.08+fall*.14+impact*.08);
    actor.group.rotation.y=(actor.deathBaseRotationY||0)+fallSide*(fail*.7+fall*2.1);
    if(actor.baseScale)actor.group.scale.copy(actor.baseScale).multiplyScalar(1-impact*.1);
    [actor.parts.body,actor.parts.head,...actor.parts.weapons].forEach((part)=>part&&resetPart(part));
    if(rig){
      [rig.intactWing,rig.workingRotor,rig.brokenHub,rig.brokenBladeUpper,rig.brokenBladeLower,rig.brokenShard,rig.hangingCable,rig.workingThruster,rig.deadThruster,
        rig.intactTail,rig.damagedTail,rig.reactor,rig.reactorRing,rig.antenna,rig.loosePlate].forEach((part)=>part&&resetPart(part));
      const sputter=Math.max(0,Math.sin(time*24))*(1-fall),remainingSpin=duration*20*(p-.39*p*p);
      rig.workingRotor.rotation.y+=remainingSpin;
      rig.intactWing.rotation.z-=fail*.16+impact*.12;
      rig.brokenHub.rotation.z+=Math.sin(time*18)*fail*.15+impact*.38;
      rig.brokenBladeUpper.rotation.z+=Math.sin(time*22)*fail*.18+impact*.52;
      rig.brokenBladeLower.rotation.x-=Math.sin(time*17)*fail*.15+impact*.28;
      rig.brokenShard.rotation.y+=fall*1.8;rig.hangingCable.rotation.z+=Math.sin(time*12)*fail*.22+impact*.3;
      rig.loosePlate.rotation.x+=Math.sin(time*20)*fail*.16+impact*.72;rig.damagedTail.rotation.z+=Math.sin(time*15)*fail*.12+impact*.35;
      rig.workingThruster.scale.z*=.35+sputter*.85;rig.reactor.rotation.y+=time*(5-4*p);rig.reactorRing.rotation.y+=time*(8-6*p);
      rig.eye.visible=fade>.01&&Math.sin(time*(18+fail*18))>-THREE.MathUtils.lerp(.9,.1,p);
      rig.faultLight.visible=fade>.04&&Math.sin(time*31)>.22;
      rig.barrageBarrels.forEach((barrel,index)=>{barrel.rotation.x+=(index-1)*impact*.18;barrel.position.y-=impact*(.04+index*.015);});
    }
    actor.group.traverse((child)=>{
      if(!child.isMesh||!child.material)return;
      child.material.transparent=true;
      child.material.opacity=(child.userData.baseOpacity??1)*fade;
    });
    applyCrawlerMalfunctionEffects(actor,time,1.4,true,fade);
    applyBrokenDroneBodyFailureEffects(actor,time,1.35,true,fade);
    return p>=1;
  }
  actor.group.rotation.z=Math.min(Math.PI*.52,time*2.25);actor.group.rotation.y=(actor.deathBaseRotationY||0)+time*(actor.flying?5:.7);
  actor.group.position.y=Math.max(0,(actor.deathBaseY||0)-time*2.3);
  if(time>.55){const fade=Math.max(0,1-(time-.55)/.65),shrink=Math.exp(-(time-.55)*2.2);if(actor.baseScale)actor.group.scale.copy(actor.baseScale).multiplyScalar(shrink);actor.group.traverse((child)=>{if(child.isMesh&&child.material){child.material.transparent=true;child.material.opacity=Math.min(child.userData.baseOpacity??child.material.opacity,fade);}});}
  return progress>=1;
}

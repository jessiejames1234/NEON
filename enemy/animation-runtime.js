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

function animatePatrolBot(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.patrolBot;
  if(!rig)return;
  const previousElapsed=actor.patrolBotPoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.patrolBotPoseElapsed=elapsed;
  actor.patrolBotMovementBlend=THREE.MathUtils.damp(actor.patrolBotMovementBlend??0,movementAmount,10,poseDelta);
  const move=actor.patrolBotMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.82);
  const seed=actor.seed||0,gait=walkPhase*.78,step=Math.sin(gait),plant=Math.abs(Math.sin(gait*2));
  const idle=1-move,servo=Math.sin(elapsed*2.1+seed),recoil=Math.sin(attack*Math.PI);

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  actor.parts.legs.forEach(resetPart);actor.parts.arms.forEach(resetPart);
  actor.parts.weapons.forEach(resetPart);actor.parts.glows.forEach(resetPart);
  rig.muzzle.visible=false;

  const baseY=actor.deathBaseY??actor.animationBaseY??0;
  actor.group.position.y=baseY+plant*move*.022;
  actor.group.rotation.x=-move*.025+attack*.035;
  actor.group.rotation.z=step*move*.018;

  actor.parts.body.position.y+=plant*move*.028+servo*idle*.006;
  actor.parts.body.rotation.y+=step*move*.026;
  actor.parts.body.rotation.x+=plant*move*.012-recoil*.025;

  actor.parts.legs.forEach((leg,index)=>{
    const side=index===0?-1:1,phase=gait+(index===0?0:Math.PI),swing=Math.sin(phase),lift=Math.max(0,swing)*move;
    leg.rotation.x+=swing*move*.48;
    leg.rotation.z+=side*(lift*.055+plant*move*.018);
    leg.position.y+=lift*.045;
    leg.position.z+=swing*move*.045;
  });

  // Shield arm counterbalances the stride; the weapon arm stays disciplined
  // and rises into a braced firing stance instead of swinging freely.
  const left=actor.parts.arms[0],right=actor.parts.arms[1];
  if(left){left.rotation.x-=step*move*.26+attack*.18;left.rotation.z-=attack*.12;left.position.z+=attack*.06;}
  if(right){right.rotation.x+=step*move*.08-attack*.38;right.rotation.z+=attack*.08;right.position.z+=attack*.08;}
  rig.weapon.position.z-=recoil*.17;
  rig.weapon.rotation.x-=attack*.035;

  actor.parts.head.rotation.y+=Math.sin(elapsed*.72+seed)*idle*.28-step*move*.035;
  actor.parts.head.rotation.x+=Math.sin(elapsed*1.55+seed)*idle*.018-attack*.035;
  actor.parts.head.position.z+=attack*.035;

  const firePulse=Math.max(0,Math.sin(elapsed*28))*attack;
  rig.muzzle.visible=attack>.18&&firePulse>.28;
  if(rig.muzzle.visible)rig.muzzle.scale.multiplyScalar(1+firePulse*1.1);
  rig.chestCore.rotation.z+=elapsed*1.8;
  rig.chestHalo.rotation.z-=elapsed*.9;
  rig.beacon.rotation.y+=elapsed*5.5;
  rig.scanLens.scale.multiplyScalar(1+attack*.35+Math.max(0,servo)*.06);
  rig.weaponCell.scale.multiplyScalar(1+attack*.2+firePulse*.22);
  rig.antennaTip.visible=Math.sin(elapsed*4.5+seed)>-.3;
  rig.shoulderLights.forEach((light,index)=>{
    light.visible=Math.sin(elapsed*5.5+index*Math.PI)>-.25;
    light.scale.multiplyScalar(1+attack*.12);
  });
}

function animateRustGuard(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.rustGuard;
  if(!rig)return;
  const previousElapsed=actor.rustGuardPoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.rustGuardPoseElapsed=elapsed;
  actor.rustGuardMovementBlend=THREE.MathUtils.damp(actor.rustGuardMovementBlend??0,movementAmount,8,poseDelta);
  const move=actor.rustGuardMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.86);
  const seed=actor.seed||0,gait=walkPhase*.62,step=Math.sin(gait),impact=Math.abs(Math.sin(gait));
  const idle=1-move,engine=Math.sin(elapsed*2.7+seed),cleaverKick=Math.sin(attack*Math.PI);

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  actor.parts.legs.forEach(resetPart);actor.parts.arms.forEach(resetPart);
  actor.parts.weapons.forEach(resetPart);actor.parts.glows.forEach(resetPart);

  const baseY=actor.deathBaseY??actor.animationBaseY??0;
  actor.group.position.y=baseY+impact*move*.018;
  actor.group.rotation.x=-move*.045-attack*.075;
  actor.group.rotation.z=step*move*.025;

  // Each planted boot compresses the chassis and twists the armor in the
  // opposite direction, giving this slow silhouette convincing mass.
  actor.parts.body.position.y+=impact*move*.035+engine*idle*.007-attack*.035;
  actor.parts.body.rotation.y-=step*move*.035;
  actor.parts.body.rotation.x+=impact*move*.018-attack*.1;
  actor.parts.legs.forEach((leg,index)=>{
    const side=index===0?-1:1,phase=gait+(index===0?0:Math.PI),swing=Math.sin(phase),lift=Math.max(0,swing)*move;
    leg.rotation.x+=swing*move*.42-attack*.08;
    leg.rotation.z+=side*(lift*.06+attack*.045);
    leg.position.y+=lift*.05-attack*.018;
    leg.position.z+=swing*move*.055+attack*.055;
  });

  const shieldArm=actor.parts.arms[0],weaponArm=actor.parts.arms[1];
  if(shieldArm){
    shieldArm.rotation.x-=step*move*.16+attack*.38;
    shieldArm.rotation.z-=attack*.16;
    shieldArm.position.z+=attack*.16;
    shieldArm.position.x-=attack*.035;
  }
  if(weaponArm){
    weaponArm.rotation.x+=step*move*.2-attack*(.72+cleaverKick*.38);
    weaponArm.rotation.z+=attack*.2;
    weaponArm.position.y+=cleaverKick*.055;
    weaponArm.position.z+=attack*.11;
  }
  rig.weapon.rotation.z-=cleaverKick*.18;
  rig.blade.position.z+=cleaverKick*.035;

  actor.parts.head.rotation.y+=Math.sin(elapsed*.55+seed)*idle*.14-step*move*.025;
  actor.parts.head.rotation.x-=attack*.14+impact*move*.012;
  actor.parts.head.position.z+=attack*.075;

  const furnacePulse=.5+.5*Math.sin(elapsed*5.4+seed);
  rig.furnace.rotation.z+=elapsed*(1.1+attack*4);
  rig.furnaceRing.rotation.z-=elapsed*(.65+attack*2.5);
  rig.furnace.scale.multiplyScalar(1+furnacePulse*.08+attack*.28);
  rig.furnaceRing.scale.multiplyScalar(1+attack*.18);
  rig.visor.scale.x*=1+attack*.12;
  rig.visor.scale.y*=1+Math.max(0,engine)*.08;
  rig.shieldCore.scale.multiplyScalar(1+impact*move*.06+attack*.22);
  rig.bladeEdge.scale.y*=1+attack*.1;
  rig.exhausts.forEach((pipe,index)=>pipe.rotation.y+=Math.sin(elapsed*1.7+index)*idle*.012);
}

function animatePulseDrone(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.pulseDrone;
  if(!rig)return;
  const previousElapsed=actor.pulseDronePoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.pulseDronePoseElapsed=elapsed;
  actor.pulseDroneMovementBlend=THREE.MathUtils.damp(actor.pulseDroneMovementBlend??0,movementAmount,7.5,poseDelta);
  const move=actor.pulseDroneMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.84);
  const seed=actor.seed||0,hover=Math.sin(elapsed*2.45+seed),travel=Math.sin(walkPhase*.72+seed),recoil=Math.sin(attack*Math.PI);

  resetPart(actor.parts.body);resetPart(actor.parts.head);resetPart(rig.projectorRig);
  rig.stabilizers.forEach(resetPart);rig.nacelles.forEach(resetPart);
  actor.parts.weapons.forEach(resetPart);actor.parts.rings.forEach(resetPart);actor.parts.glows.forEach(resetPart);
  rig.muzzles.forEach((muzzle)=>{muzzle.visible=false;});

  const baseY=actor.animationBaseY??0;
  actor.group.position.y=baseY+1.15+hover*.1+Math.abs(travel)*move*.035+attack*.045;
  actor.group.rotation.x=-move*.14+travel*move*.025+attack*.04;
  actor.group.rotation.z=travel*move*.11+hover*.018-recoil*.025;

  actor.parts.body.rotation.y+=elapsed*.32;
  actor.parts.body.position.y+=hover*.012;
  actor.parts.head.rotation.y-=travel*move*.16;
  actor.parts.head.rotation.x+=hover*.025-attack*.07;
  actor.parts.head.position.z+=attack*.045;

  // Three gyroscopes counter-rotate on different axes, making the drone feel
  // stabilized by an active field instead of a single flat propeller.
  rig.gyroBands.forEach((band,index)=>{
    const direction=index%2?-1:1;
    band.rotation[index===0?"z":index===1?"y":"x"]+=direction*elapsed*(1.8+index*.65+move*1.4+attack*7);
    band.scale.multiplyScalar(1+attack*(.08+index*.025));
  });
  rig.stabilizers.forEach((stabilizer,index)=>{
    const phase=elapsed*2.1+index*Math.PI/2+seed;
    stabilizer.rotation.y+=Math.sin(phase)*(.035+move*.035);
    stabilizer.rotation.x+=hover*.018+travel*move*(index%2?.045:-.045);
    stabilizer.position.y+=Math.sin(phase)*.018;
  });
  rig.nacelles.forEach((nacelle,index)=>{
    const side=nacelle.userData.pulseDroneSide||1;
    nacelle.rotation.z-=side*(move*.08+attack*.045);
    nacelle.rotation.x+=travel*move*.045-recoil*.03;
    nacelle.position.z-=recoil*.075;
  });

  const firePulse=Math.max(0,Math.sin(elapsed*31))*attack;
  actor.parts.weapons.forEach((weapon,index)=>{weapon.position.z-=recoil*(.13+index*.02);});
  rig.muzzles.forEach((muzzle,index)=>{
    muzzle.visible=attack>.16&&Math.sin(elapsed*31+index*.7)>.05;
    if(muzzle.visible)muzzle.scale.multiplyScalar(1+firePulse*1.2);
  });
  rig.thrusters.forEach((thruster,index)=>{
    thruster.scale.y*=1+move*.4+attack*.18+Math.max(0,Math.sin(elapsed*8+index))* .12;
  });

  const pulse=.5+.5*Math.sin(elapsed*4.6+seed);
  rig.reactor.rotation.y+=elapsed*(2.8+move*2+attack*9);
  rig.reactor.rotation.z-=elapsed*(1.7+attack*5);
  rig.reactor.scale.multiplyScalar(1+pulse*.09+attack*.3);
  rig.reactorCage.rotation.z+=elapsed*(2.2+attack*7);
  rig.reactorCage.scale.multiplyScalar(1+attack*.16);
  rig.reactorLens.scale.multiplyScalar(1+attack*.34+firePulse*.2);
  rig.eye.scale.multiplyScalar(1+attack*.16);
  rig.eyeIris.scale.multiplyScalar(1+pulse*.1+attack*.35);
  rig.projectorCore.rotation.y+=elapsed*(1.5+attack*6);
  rig.projectorRing.rotation.z-=elapsed*(1.2+attack*4);
}

function animateShockSpider(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.shockSpider;
  if(!rig)return;
  const previousElapsed=actor.shockSpiderPoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.shockSpiderPoseElapsed=elapsed;
  actor.shockSpiderMovementBlend=THREE.MathUtils.damp(actor.shockSpiderMovementBlend??0,movementAmount,12,poseDelta);
  const move=actor.shockSpiderMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.84);
  const seed=actor.seed||0,gait=walkPhase*.9,breath=Math.sin(elapsed*2.9+seed),bite=Math.sin(attack*Math.PI);

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  rig.mandibles.forEach(resetPart);actor.parts.glows.forEach(resetPart);
  rig.legSets.forEach(({hip,knee,foot})=>{resetPart(hip);resetPart(knee);resetPart(foot);});

  const baseY=actor.deathBaseY??actor.animationBaseY??0;
  const scuttle=Math.sin(gait*2),bodyLift=Math.abs(scuttle)*move;
  actor.group.position.y=baseY+bodyLift*.024;
  actor.group.rotation.x=-attack*.08+Math.abs(Math.sin(gait))*move*.012;
  actor.group.rotation.z=scuttle*move*.018;

  actor.parts.body.position.y+=bodyLift*.035+breath*(1-move)*.008-attack*.045;
  actor.parts.body.rotation.y-=Math.sin(gait)*move*.035;
  actor.parts.body.rotation.x-=attack*.11;
  actor.parts.head.position.y+=breath*(1-move)*.01-attack*.055;
  actor.parts.head.position.z+=attack*(.28+bite*.09);
  actor.parts.head.rotation.x-=attack*(.2+bite*.07);
  actor.parts.head.rotation.y+=Math.sin(elapsed*.9+seed)*(1-move)*.075;

  // Alternating tetrapods plant four feet while the opposite four lift and
  // reach. Hip yaw creates travel; hip/knee roll creates visible clearance.
  rig.legSets.forEach(({side,row,hip,knee,foot})=>{
    const tripod=((row+(side>0?1:0))%2)*Math.PI;
    const phase=gait+tripod,swing=Math.sin(phase),lift=Math.max(0,swing)*move,plant=Math.max(0,-swing)*move;
    const front=row===0,reach=(1-row/3)*.025;
    hip.rotation.y+=swing*move*(.23+reach);
    hip.rotation.z-=side*(lift*.18-plant*.035+attack*(front?.26:.055));
    hip.position.y+=lift*.04-plant*.008-attack*(front?.02:.008);
    hip.position.z+=swing*move*.035+attack*(front?.11:-.015);
    knee.rotation.y-=swing*move*.12;
    knee.rotation.z+=side*(lift*.24+plant*.04+attack*(front?.18:.04));
    knee.position.y+=lift*.025;
    foot.rotation.x-=lift*.22+attack*(front?.18:0);
    foot.rotation.z+=side*(plant*.05+attack*(front?.08:0));
  });

  rig.mandibles.forEach((mandible,index)=>{
    const side=mandible.userData.shockSpiderSide||1;
    mandible.rotation.y-=side*(attack*(.46+bite*.2));
    mandible.rotation.x+=bite*.06;
    mandible.position.z+=attack*.08;
  });

  const charge=.5+.5*Math.sin(elapsed*7.5+seed),snap=Math.max(0,Math.sin(elapsed*27))*attack;
  rig.abdomenCoil.rotation.z+=elapsed*(2.5+move*2+attack*8);
  rig.abdomenCoil.scale.multiplyScalar(1+charge*.055+attack*.2);
  rig.abdomenCore.rotation.y-=elapsed*(2+attack*7);
  rig.abdomenCore.scale.multiplyScalar(1+charge*.1+attack*.3);
  rig.foreheadCoil.rotation.z-=elapsed*(3.2+attack*8);
  rig.crown.rotation.y+=elapsed*(2.6+move*2+attack*11);
  rig.crown.scale.multiplyScalar(1+charge*.14+snap*.25);
  rig.eyes.forEach((eye,index)=>eye.scale.multiplyScalar(1+attack*.14+Math.max(0,Math.sin(elapsed*5+index))* .035));
  rig.capacitors.forEach((part,index)=>{if(index%2)part.scale.multiplyScalar(1+charge*.08+attack*.18);});
}

function animateRiotUnit(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.riotUnit;
  if(!rig)return;
  const previousElapsed=actor.riotUnitPoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.riotUnitPoseElapsed=elapsed;
  actor.riotUnitMovementBlend=THREE.MathUtils.damp(actor.riotUnitMovementBlend??0,movementAmount,8,poseDelta);
  const move=actor.riotUnitMovementBlend,attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.02,.86);
  const seed=actor.seed||0,gait=walkPhase*.6,step=Math.sin(gait),plant=Math.abs(Math.sin(gait)),impact=Math.sin(attack*Math.PI);

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  actor.parts.legs.forEach(resetPart);actor.parts.arms.forEach(resetPart);
  actor.parts.weapons.forEach(resetPart);actor.parts.glows.forEach(resetPart);

  const baseY=actor.deathBaseY??actor.animationBaseY??0;
  actor.group.position.y=baseY+plant*move*.018;
  actor.group.rotation.x=-move*.035-attack*.085;
  actor.group.rotation.z=step*move*.018-impact*.012;

  actor.parts.body.position.y+=plant*move*.033-attack*.035;
  actor.parts.body.position.z+=attack*.12;
  actor.parts.body.rotation.y-=step*move*.025;
  actor.parts.body.rotation.x-=attack*.1;
  actor.parts.head.rotation.y+=Math.sin(elapsed*.55+seed)*(1-move)*.09-step*move*.02;
  actor.parts.head.rotation.x-=attack*.11;
  actor.parts.head.position.z+=attack*.09;

  actor.parts.legs.forEach((leg,index)=>{
    const side=index===0?-1:1,swing=Math.sin(gait+(index===0?0:Math.PI)),lift=Math.max(0,swing)*move;
    leg.rotation.x+=swing*move*.4-attack*.08;
    leg.rotation.z+=side*(lift*.045+attack*.07);
    leg.position.y+=lift*.045-attack*.022;
    leg.position.z+=swing*move*.05+attack*.08;
    if(rig.pistons[index]){resetPart(rig.pistons[index]);rig.pistons[index].scale.y*=1-lift*.13+attack*.08;}
  });

  const shieldArm=actor.parts.arms[0],batonArm=actor.parts.arms[1];
  if(shieldArm){
    shieldArm.rotation.x-=step*move*.07+attack*.2;
    shieldArm.rotation.z-=attack*.1;
    shieldArm.position.z+=attack*(.3+impact*.12);
    shieldArm.position.x+=attack*.035;
  }
  if(batonArm){
    batonArm.rotation.x+=step*move*.15-attack*(.25+impact*.16);
    batonArm.rotation.z+=attack*.16;
    batonArm.position.z+=attack*.08;
  }
  rig.baton.position.z+=impact*.055;

  const power=.5+.5*Math.sin(elapsed*5.2+seed),spark=Math.max(0,Math.sin(elapsed*24))*attack;
  rig.chestRing.rotation.z+=elapsed*(1.2+attack*4);
  rig.chestCore.rotation.y-=elapsed*(1.8+attack*6);
  rig.chestCore.scale.multiplyScalar(1+power*.07+attack*.2);
  rig.visor.scale.x*=1+attack*.1;
  rig.shieldRails.forEach((rail,index)=>rail.scale.y*=1+attack*.08+Math.max(0,Math.sin(elapsed*6+index*Math.PI))*.025);
  rig.shieldCore.rotation.z+=elapsed*(1.5+attack*7);rig.shieldCore.scale.multiplyScalar(1+attack*.28+impact*.15);
  rig.batonCoil.rotation.z-=elapsed*(2.5+attack*12);rig.batonCoil.scale.multiplyScalar(1+attack*.26+spark*.24);
  rig.batonTip.rotation.y+=elapsed*(3+attack*15);rig.batonTip.scale.multiplyScalar(1+power*.08+attack*.35+spark*.28);
  rig.emergencyLeft.visible=Math.sin(elapsed*7.5)>-.15;
  rig.emergencyRight.visible=Math.sin(elapsed*7.5+Math.PI)>-.15;
}

function animateShockSpiderDeath(actor,time){
  const rig=actor.parts.shockSpider,duration=actor.deathDuration||2.4;
  if(!rig)return time>=duration;
  const p=THREE.MathUtils.clamp(time/duration,0,1),collapse=THREE.MathUtils.smootherstep(p,.03,.62),fade=1-THREE.MathUtils.smootherstep(p,.68,1);
  const twitch=Math.sin(time*27+(actor.seed||0))*Math.max(0,1-p/.68),power=.5+.5*Math.sin(time*19);
  resetPart(actor.parts.body);resetPart(actor.parts.head);rig.mandibles.forEach(resetPart);actor.parts.glows.forEach(resetPart);
  rig.legSets.forEach(({hip,knee,foot})=>{resetPart(hip);resetPart(knee);resetPart(foot);});
  if(actor.baseScale)actor.group.scale.copy(actor.baseScale);
  actor.group.position.y=(actor.deathBaseY??0)-collapse*.035;
  actor.group.rotation.y=actor.deathBaseRotationY||0;
  actor.group.rotation.x=collapse*.06;actor.group.rotation.z=twitch*.012;
  actor.parts.body.position.y-=collapse*.2;actor.parts.body.rotation.x+=collapse*.18;actor.parts.body.scale.y*=1-collapse*.28;
  actor.parts.head.position.y-=collapse*.17;actor.parts.head.position.z+=collapse*.055;actor.parts.head.rotation.x+=collapse*.32+twitch*.035;
  rig.legSets.forEach(({side,row,hip,knee,foot},index)=>{
    const front=row<2?1:-1;
    hip.rotation.z-=side*(collapse*(.55+row*.06)+twitch*.025*(index%2?1:-1));
    hip.rotation.y+=front*collapse*(.13+row*.025);
    hip.position.y-=collapse*.09;
    hip.position.z+=front*collapse*.035;
    knee.rotation.z+=side*collapse*(.72+row*.05);
    knee.rotation.y-=front*collapse*.1;
    foot.rotation.x-=collapse*.42;
  });
  rig.mandibles.forEach((mandible)=>{const side=mandible.userData.shockSpiderSide||1;mandible.rotation.y-=side*(collapse*.34+twitch*.04);mandible.position.y-=collapse*.04;});
  rig.abdomenCoil.rotation.z+=time*(7-5*p);rig.abdomenCore.rotation.y-=time*(9-7*p);rig.foreheadCoil.rotation.z-=time*(8-6*p);rig.crown.rotation.y+=time*(11-9*p);
  actor.parts.glows.forEach((part,index)=>{
    part.visible=fade>.01&&(p<.5||Math.sin(time*(22+index*.2)+index)>-.2);
    part.scale.multiplyScalar(.72+power*(1-p)*.36);
  });
  actor.group.traverse((child)=>{if(child.isMesh&&child.material){child.material.transparent=true;child.material.opacity=(child.userData.baseOpacity??1)*fade;}});
  return p>=1;
}

function animateGlowRat(actor,elapsed,movementAmount,walkPhase,attackStrength){
  const rig=actor.parts.glowRat;
  if(!rig)return;
  for(const effect of [...(rig.rushMotes||[]),...(rig.rushStreaks||[]),...(rig.rushRings||[]),...(rig.rushEchoes||[])])effect.visible=false;
  const previousElapsed=actor.glowRatPoseElapsed;
  const poseDelta=previousElapsed===undefined||elapsed<previousElapsed?1/60:THREE.MathUtils.clamp(elapsed-previousElapsed,1/240,.1);
  actor.glowRatPoseElapsed=elapsed;
  actor.glowRatMovementBlend=THREE.MathUtils.damp(actor.glowRatMovementBlend??0,movementAmount,11,poseDelta);

  const move=actor.glowRatMovementBlend;
  const attack=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(attackStrength,0,1),.015,.82);
  const seed=actor.seed||0;
  const gait=walkPhase*.72;
  const step=Math.sin(gait),doubleStep=Math.sin(gait*2);
  const idle=1-move;
  const breath=Math.sin(elapsed*2.35+seed);
  const sniff=Math.sin(elapsed*(4.8+move*1.7)+seed*.7);
  const biteRattle=Math.sin(elapsed*31+seed)*attack;

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  actor.parts.legs.forEach(resetPart);
  rig.tailSegments.forEach(resetPart);
  rig.ears.forEach(resetPart);
  rig.whiskers.forEach(resetPart);
  rig.teeth.forEach(resetPart);
  rig.eyes.forEach(resetPart);
  resetPart(rig.nose);resetPart(rig.mouth);
  actor.parts.glows.forEach(resetPart);

  const baseY=actor.deathBaseY??actor.animationBaseY??0;
  actor.group.position.y=baseY+Math.abs(doubleStep)*move*.018;
  actor.group.rotation.x=-attack*.105+Math.abs(step)*move*.018;
  actor.group.rotation.z=doubleStep*move*.018+biteRattle*.006;

  // The torso compresses over each planted diagonal pair and coils before the
  // bite. Haunch motion makes the gait read as a running animal, not sliding.
  actor.parts.body.position.y+=Math.abs(doubleStep)*move*.034+breath*idle*.008-attack*.035;
  actor.parts.body.position.z+=attack*.17;
  actor.parts.body.rotation.x-=attack*.12+step*move*.025;
  actor.parts.body.rotation.z+=doubleStep*move*.022;
  actor.parts.body.scale.x*=1+attack*.045;
  actor.parts.body.scale.y*=1-attack*.09;
  actor.parts.body.scale.z*=1+attack*.11;

  // Alternating diagonal footfalls include lift, reach, planting compression,
  // outward paw roll and an aggressive four-foot brace during the strike.
  actor.parts.legs.forEach((leg,index)=>{
    const phase=gait+((index===0||index===3)?0:Math.PI);
    const swing=Math.sin(phase),lift=Math.max(0,swing)*move,plant=Math.max(0,-swing)*move;
    const side=index%2===0?-1:1,front=index>=2;
    leg.position.y+=lift*.075-plant*.012-attack*(front?.035:.015);
    leg.position.z+=swing*move*(front?.105:.085)+attack*(front?.11:-.035);
    leg.position.x+=side*(lift*.018+attack*(front?.025:.04));
    leg.rotation.x+=swing*move*(front?.52:.42)-attack*(front?.28:-.12);
    leg.rotation.z+=side*(lift*.11+plant*.045+attack*.13);
  });

  // The head searches independently while walking, then shoots past the
  // shoulders for a snapping bite and rebounds with a short lateral shake.
  actor.parts.head.position.y+=sniff*(.01+idle*.012)+Math.abs(step)*move*.012-attack*.055;
  actor.parts.head.position.z+=attack*(.44+biteRattle*.018)+step*move*.018;
  actor.parts.head.rotation.x+=sniff*idle*.045-step*move*.055-attack*(.25+biteRattle*.035);
  actor.parts.head.rotation.y+=Math.sin(elapsed*1.15+seed)*idle*.095+biteRattle*.035;
  actor.parts.head.rotation.z+=doubleStep*move*.018+biteRattle*.018;
  actor.parts.head.scale.y*=1-attack*.07;
  actor.parts.head.scale.z*=1+attack*.14;

  rig.ears.forEach((ear,index)=>{
    const side=ear.userData.glowRatSide||1;
    ear.position.y-=attack*.055;
    ear.position.z-=attack*.025;
    ear.rotation.z+=side*(sniff*idle*.035-attack*.42)+Math.sin(elapsed*7+index)*move*.018;
    ear.scale.y*=1-attack*.12;
  });
  rig.whiskers.forEach((whisker,index)=>{
    const side=whisker.userData.glowRatSide||1,row=whisker.userData.glowRatRow??1;
    whisker.rotation.z+=side*((row-1)*(.025+attack*.09)+biteRattle*.012);
    whisker.rotation.x+=(row-1)*attack*.06;
    whisker.scale.y*=1+attack*.08;
  });
  rig.teeth.forEach((tooth)=>{
    tooth.position.y-=attack*(.035+Math.max(0,biteRattle)*.012);
    tooth.rotation.x+=attack*.16;
  });
  rig.mouth.scale.x*=1+attack*.3;
  rig.mouth.scale.y*=1+attack*(2.4+Math.max(0,biteRattle));
  rig.nose.position.y+=sniff*.006+biteRattle*.006;
  rig.eyes.forEach((eye,index)=>eye.scale.multiplyScalar(1+attack*.12+Math.max(0,Math.sin(elapsed*4+index))*idle*.025));

  // A travelling wave runs from tail root to tip. The attack reverses that
  // wave into a whip, helping sell the forward transfer of momentum.
  rig.tailSegments.forEach((segment,index)=>{
    const travelWave=Math.sin(elapsed*(move>0?7.2:2.8)-index*.72+seed);
    const whip=Math.sin(elapsed*13-index*.48)*attack;
    const amplitude=.018+index*.012;
    segment.rotation.y+=travelWave*amplitude*(.35+move*.9)+whip*(.025+index*.018);
    segment.rotation.z+=Math.cos(elapsed*(move>0?6.4:2.2)-index*.66+seed)*amplitude*(.25+move*.72)-attack*.025;
  });

  actor.parts.glows.forEach((glow,index)=>{
    const pulse=Math.sin(elapsed*(3.4+index*.035)+seed+index*.51);
    glow.scale.multiplyScalar(1+pulse*.045+move*.025+attack*.2);
    glow.visible=true;
  });
  rig.dorsalCore.rotation.y+=elapsed*(1.4+move*1.8+attack*8);
  rig.dorsalCore.scale.multiplyScalar(1+Math.max(0,biteRattle)*.12);
}

function animateGlowRatStunned(actor,elapsed,stunP){
  const rig=actor.parts.glowRat;
  if(!rig)return;
  if(actor.glowRatStunStartedAt===undefined||elapsed<(actor.glowRatStunLastElapsed??elapsed))actor.glowRatStunStartedAt=elapsed;
  actor.glowRatStunLastElapsed=elapsed;
  const transitionTime=Math.max(0,elapsed-actor.glowRatStunStartedAt);
  const settle=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp(transitionTime/.48,0,1),0,1);
  const seed=actor.seed||0;
  const seizure=Math.sin(stunP*Math.PI*14+seed*3.1)*settle;
  const tremor=Math.sin(stunP*Math.PI*34+seed*5.7)*settle;
  const powerPulse=.5+.5*Math.sin(stunP*Math.PI*10+seed);
  const baseY=actor.deathBaseY??actor.animationBaseY??0;

  // Keep E03 upright and facing forward while disabled. Its body crouches
  // directly downward instead of rolling onto either side.
  actor.group.position.y=THREE.MathUtils.lerp(actor.group.position.y,baseY,settle);
  actor.group.rotation.x=THREE.MathUtils.lerp(actor.group.rotation.x,0,settle);
  actor.group.rotation.z=THREE.MathUtils.lerp(actor.group.rotation.z,0,settle);
  actor.parts.body.position.y-=(.13+powerPulse*.008)*settle;
  actor.parts.body.rotation.x+=seizure*.012;
  actor.parts.body.rotation.z+=tremor*.006;
  actor.parts.body.scale.y*=THREE.MathUtils.lerp(1,.82+powerPulse*.018,settle);
  actor.parts.head.position.y-=(.105+powerPulse*.012)*settle;
  actor.parts.head.position.z+=.035*settle+tremor*.006;
  actor.parts.head.rotation.x+=.12*settle+seizure*.025;
  actor.parts.head.rotation.z+=tremor*.008;

  actor.parts.legs.forEach((leg,index)=>{
    const legSide=index%2===0?-1:1,front=index>=2;
    // Flatten the four limbs diagonally across the floor. Opposing front and
    // rear limbs form an X footprint instead of looking like standing legs.
    leg.position.x+=legSide*(front?.12:.16)*settle;
    leg.position.y-=.13*settle+Math.abs(tremor)*.004;
    leg.position.z+=(front?.16:-.16)*settle;
    leg.rotation.x+=(front?-1.12:1.12)*settle+tremor*.018*(index%2?-1:1);
    leg.rotation.z-=legSide*(.78*settle+seizure*.012);
  });
  rig.ears.forEach((ear,index)=>{
    const earSide=ear.userData.glowRatSide||1;
    ear.position.y-=.065*settle;
    ear.rotation.z-=earSide*(.48*settle+seizure*.035)+tremor*.018*(index%2?-1:1);
    ear.scale.y*=THREE.MathUtils.lerp(1,.82,settle);
  });
  rig.whiskers.forEach((whisker,index)=>{
    const whiskerSide=whisker.userData.glowRatSide||1,row=whisker.userData.glowRatRow??1;
    whisker.rotation.z+=whiskerSide*((row-1)*.09*settle+tremor*.014);
    whisker.rotation.x+=seizure*.025*(row-1);
  });
  rig.tailSegments.forEach((segment,index)=>{
    const tailSpasm=Math.sin(stunP*Math.PI*(18+index*.35)-index*.8+seed);
    segment.rotation.y+=tailSpasm*(.025+index*.015)*(index>3?1:.45)*settle;
    segment.rotation.z+=Math.cos(stunP*Math.PI*13-index*.62)*(.018+index*.009)*settle;
  });
  rig.teeth.forEach((tooth,index)=>{tooth.position.y-=powerPulse*.014*settle;tooth.rotation.x+=.08*settle+seizure*.025*(index?1:-1);});
  rig.mouth.scale.y*=THREE.MathUtils.lerp(1,1.8+powerPulse*1.4,settle);
  rig.nose.position.y+=tremor*.008;
  rig.eyes.forEach((eye,index)=>{
    const optic=index%3;
    eye.visible=settle<.45||optic===0||Math.sin(stunP*Math.PI*22+index+seed)>-.25;
    eye.scale.multiplyScalar(optic===0?1:THREE.MathUtils.lerp(1,.82+powerPulse*.28,settle));
  });
  actor.parts.glows.forEach((glow,index)=>{
    const active=Math.sin(stunP*Math.PI*(16+index*.08)+index*.7+seed)>-.48;
    glow.visible=settle<.45||active;
    glow.scale.multiplyScalar(THREE.MathUtils.lerp(1,.78+powerPulse*.34+Math.max(0,tremor)*.08,settle));
  });
  rig.dorsalCore.visible=true;
  rig.dorsalCore.rotation.y+=elapsed*(4+powerPulse*7);
  rig.dorsalCore.scale.multiplyScalar(THREE.MathUtils.lerp(1,.9+powerPulse*.32,settle));
}

function animateGlowRatDeath(actor,time){
  const rig=actor.parts.glowRat,duration=actor.deathDuration||2.4;
  if(!rig)return time>=duration;
  const p=THREE.MathUtils.clamp(time/duration,0,1),seed=actor.seed||0,side=((seed%1)>.5?1:-1);
  const failure=THREE.MathUtils.smootherstep(p,0,.24);
  const collapse=THREE.MathUtils.smootherstep(p,.12,.68);
  const impact=THREE.MathUtils.smootherstep(p,.55,.78);
  const fade=1-THREE.MathUtils.smootherstep(p,.7,1);
  // The rupture reaches full force in roughly the first 0.13 seconds. The
  // collapse still adds weight, but it now begins underneath the explosion.
  const rupture=THREE.MathUtils.smootherstep(p,0,.055);
  const debrisTravel=rupture*(.16+p*1.72);
  // Low presets shorten and thin only the explosion FX; the actual detached
  // body animation remains intact. This cuts transparent draw calls without
  // changing damage, timing, or the indicator radius.
  const fxP=THREE.MathUtils.clamp(p*(1.38-enemyEffectQuality*.38),0,1);
  const modelWorldScale=Math.max(.1,actor.baseScale?.x||actor.group.scale.x||1);
  const blastLocalRadius=2.6/modelWorldScale;
  const eyeFade=1-THREE.MathUtils.smootherstep(p,.12,.66);
  const convulsion=Math.sin(time*24+seed*4.1)*(1-collapse);
  const aftershock=Math.sin(time*17+seed*2.7)*(1-impact)*failure;
  const radiationSurge=Math.max(0,Math.sin(time*(17+failure*14)+seed))*Math.max(0,1-p/.72);

  resetPart(actor.parts.body);resetPart(actor.parts.head);
  actor.parts.legs.forEach(resetPart);
  rig.tailSegments.forEach(resetPart);
  rig.ears.forEach(resetPart);
  rig.whiskers.forEach(resetPart);
  rig.teeth.forEach(resetPart);
  rig.eyes.forEach(resetPart);
  resetPart(rig.nose);resetPart(rig.mouth);
  actor.parts.glows.forEach((glow)=>{resetPart(glow);glow.visible=true;});

  // Keep the explosion origin locked in place. Detached pieces carry their
  // own outward velocity and gravity, so the root must not rise, shrink or
  // chase the lowest fragment.
  if(actor.baseScale)actor.group.scale.copy(actor.baseScale);
  actor.group.position.y=actor.deathBaseY??0;
  // E03 now stays upright and faces its original direction. The earlier root
  // roll made the entire explosion fall onto one side before disassembly.
  actor.group.rotation.y=actor.deathBaseRotationY||0;
  actor.group.rotation.x=0;
  actor.group.rotation.z=0;

  // The core fails first, then the ribcage loses volume on impact rather than
  // the whole model uniformly shrinking like the generic death animation.
  actor.parts.body.position.y-=collapse*.09+impact*.075;
  actor.parts.body.position.z+=collapse*.035;
  actor.parts.body.rotation.x+=collapse*.16+aftershock*.025;
  actor.parts.body.rotation.z+=aftershock*.012;
  actor.parts.body.scale.y*=1-impact*.2;
  actor.parts.body.scale.z*=1+impact*.055;
  actor.parts.head.position.y-=collapse*.16+impact*.055;
  actor.parts.head.position.z+=collapse*.11;
  actor.parts.head.rotation.x+=collapse*.4+impact*.16+convulsion*.045;
  actor.parts.head.rotation.z+=aftershock*.014;

  actor.parts.legs.forEach((leg,index)=>{
    const legSide=index%2===0?-1:1,front=index>=2;
    leg.position.x+=legSide*collapse*(front?.13:.1);
    leg.position.y-=collapse*(front?.07:.045);
    leg.position.z+=collapse*(front?.13:-.1);
    leg.rotation.x+=collapse*(front?-.82:.58)+aftershock*.045*(index%2?1:-1);
    leg.rotation.z+=legSide*collapse*(front?.48:.35);
  });
  rig.ears.forEach((ear,index)=>{
    const earSide=ear.userData.glowRatSide||1;
    ear.position.y-=collapse*.08;
    ear.rotation.z-=earSide*(collapse*.58)+convulsion*.025*(index%2?1:-1);
    ear.scale.y*=1-collapse*.18;
  });
  rig.whiskers.forEach((whisker,index)=>{
    const whiskerSide=whisker.userData.glowRatSide||1,row=whisker.userData.glowRatRow??1;
    whisker.rotation.z+=whiskerSide*((row-1)*collapse*.12)+side*collapse*.06;
    whisker.rotation.x+=collapse*(.18+(row-1)*.045)+aftershock*.02*(index%2?1:-1);
  });
  rig.tailSegments.forEach((segment,index)=>{
    const slack=THREE.MathUtils.smootherstep(p,.18+index*.018,.72+index*.012);
    segment.rotation.y+=side*slack*(.035+index*.024)+convulsion*(.012+index*.006)*(1-slack);
    segment.rotation.z-=slack*(.025+index*.014)+aftershock*.012;
  });
  rig.teeth.forEach((tooth,index)=>{tooth.position.y-=collapse*.025;tooth.rotation.x+=collapse*.2+aftershock*.03*(index?1:-1);});
  rig.mouth.scale.x*=1+collapse*.18;
  rig.mouth.scale.y*=1+collapse*2.8;
  rig.nose.position.y-=collapse*.012;
  rig.eyes.forEach((eye,index)=>{
    const optic=index%3;
    eye.visible=optic===0||eyeFade>.025&&(p>.48||Math.sin(time*(22+index)+seed)>-.3);
    if(optic!==0)eye.scale.multiplyScalar(.62+eyeFade*.38);
  });

  actor.parts.glows.forEach((glow,index)=>{
    const unstable=p<.66&&Math.sin(time*(19+index*.11)+index*.63+seed)>THREE.MathUtils.lerp(-.92,.12,p/.66);
    glow.visible=fade>.015&&(p>=.66||unstable);
    glow.scale.multiplyScalar(.5+fade*.45+radiationSurge*(.18+index%3*.025));
  });
  rig.dorsalCore.visible=fade>.01;
  rig.dorsalCore.rotation.y+=time*(12-9*p);
  rig.dorsalCore.scale.multiplyScalar(.35+fade*.55+radiationSurge*.42);

  // Disassemble the real model at the same instant as the radiation flash.
  // Every stored mesh receives its own deterministic vector and angular
  // momentum, so teeth, eyes, armor, organs, paws and tail pieces separate
  // instead of the intact rat merely shrinking or falling over.
  rig.explosionPieces?.forEach((piece,index)=>{
    const direction=piece.userData.glowRatExplosionDirection;
    const spin=piece.userData.glowRatExplosionSpin;
    const speed=piece.userData.glowRatExplosionSpeed||.6;
    piece.position.copy(piece.userData.basePosition).addScaledVector(direction,debrisTravel*speed);
    piece.position.y-=p*p*(.24+(index%5)*.035);
    piece.rotation.copy(piece.userData.baseRotation);
    piece.rotation.x+=spin.x*p*(2.5+index%3);
    piece.rotation.y+=spin.y*p*(2.2+index%4*.45);
    piece.rotation.z+=spin.z*p*(2.7+index%2);
    const fragmentFade=1-THREE.MathUtils.smootherstep(p,.72,1);
    piece.scale.copy(piece.userData.baseScale).multiplyScalar(Math.max(.04,fragmentFade));
    piece.visible=fragmentFade>.015;
  });

  // Long tapered rays make a faceted 3D blast rather than a flat circular
  // effect. They punch outward first and disappear before the debris settles.
  const rayLife=1-THREE.MathUtils.smootherstep(fxP,.16,.43);
  const rayEnvelope=Math.sin(Math.min(1,fxP/.3)*Math.PI)*rayLife;
  const shardLimit=Math.max(4,Math.ceil((rig.explosionShards?.length||0)*enemyEffectQuality));
  rig.explosionShards?.forEach((shard,index)=>{
    if(index>=shardLimit){shard.visible=false;return;}
    const direction=shard.userData.glowRatExplosionDirection;
    shard.visible=rupture>.01&&rayLife>.01;
    shard.position.copy(rig.explosionOrigin).addScaledVector(direction,rupture*blastLocalRadius*(.4+fxP*1.8));
    shard.rotation.copy(shard.userData.baseRotation);
    shard.rotation.y+=fxP*(index%2?3.4:-3.4);
    shard.scale.copy(shard.userData.baseScale);
    shard.scale.x*=Math.max(.01,rayEnvelope*(1+(index%3)*.16));
    shard.scale.y*=Math.max(.01,rayEnvelope*(3.1+(index%4)*.32));
    shard.scale.z*=Math.max(.01,rayEnvelope);
  });

  // A white-hot ignition core is swallowed by overlapping orange and red
  // lobes. Their different expansion rates create the rolling silhouette of
  // a fireball rather than a collection of uniformly expanding circles.
  const ignition=THREE.MathUtils.smootherstep(fxP,0,.035);
  const coreLife=1-THREE.MathUtils.smootherstep(fxP,.045,.2);
  if(rig.explosionCore){
    rig.explosionCore.visible=ignition>.01&&coreLife>.01;
    rig.explosionCore.position.copy(rig.explosionOrigin);
    rig.explosionCore.scale.copy(rig.explosionCore.userData.baseScale).multiplyScalar((.25+ignition*blastLocalRadius*4.8)*coreLife);
  }
  const flameLife=1-THREE.MathUtils.smootherstep(fxP,.2,.52);
  const flameLimit=Math.max(3,Math.ceil((rig.explosionFireballs?.length||0)*enemyEffectQuality));
  rig.explosionFireballs?.forEach((fireball,index)=>{
    if(index>=flameLimit){fireball.visible=false;return;}
    const direction=fireball.userData.glowRatExplosionDirection;
    const phase=fireball.userData.glowRatExplosionPhase||0;
    const roll=.82+Math.sin(fxP*28+phase)*.18;
    fireball.visible=ignition>.01&&flameLife>.01;
    fireball.position.copy(rig.explosionOrigin).addScaledVector(direction,ignition*blastLocalRadius*Math.min(.72,.2+fxP*2.6));
    fireball.position.y+=fxP*blastLocalRadius*(.03+(index%4)*.012);
    fireball.rotation.copy(fireball.userData.baseRotation);
    fireball.rotation.x+=fxP*(index%2?3.2:-3.2);
    fireball.rotation.y+=fxP*(2.1+(index%5)*.34);
    fireball.scale.copy(fireball.userData.baseScale).multiplyScalar(Math.max(.02,ignition*blastLocalRadius*(2.9+fxP*5.2)*flameLife*roll));
  });

  const chipLife=1-THREE.MathUtils.smootherstep(fxP,.48,.88);
  const chipLimit=Math.max(4,Math.ceil((rig.explosionFragments?.length||0)*enemyEffectQuality));
  rig.explosionFragments?.forEach((fragment,index)=>{
    if(index>=chipLimit){fragment.visible=false;return;}
    const direction=fragment.userData.glowRatExplosionDirection;
    const speed=fragment.userData.glowRatExplosionSpeed||1;
    fragment.visible=rupture>.01&&chipLife>.01;
    fragment.position.copy(rig.explosionOrigin).addScaledVector(direction,rupture*blastLocalRadius*(.12+fxP*speed*.62));
    fragment.position.y-=fxP*fxP*(.35+(index%4)*.08);
    fragment.rotation.copy(fragment.userData.baseRotation);
    fragment.rotation.x+=p*(5.4+index%5);
    fragment.rotation.y+=p*(index%2?7.2:-7.2);
    fragment.rotation.z+=p*(3.8+index%4);
    fragment.scale.copy(fragment.userData.baseScale).multiplyScalar(Math.max(.02,chipLife));
  });

  const smokeBirth=THREE.MathUtils.smootherstep(fxP,.025,.11);
  const wispLife=1-THREE.MathUtils.smootherstep(fxP,.48,.9);
  const smokeLimit=Math.max(2,Math.ceil((rig.explosionWisps?.length||0)*enemyEffectQuality));
  rig.explosionWisps?.forEach((wisp,index)=>{
    if(index>=smokeLimit){wisp.visible=false;return;}
    const direction=wisp.userData.glowRatExplosionDirection;
    const speed=wisp.userData.glowRatExplosionSpeed||.5;
    wisp.visible=smokeBirth>.01&&wispLife>.01;
    wisp.position.copy(rig.explosionOrigin).addScaledVector(direction,smokeBirth*(.04+p*speed*.75));
    wisp.position.y+=smokeBirth*p*(.36+(index%3)*.09);
    wisp.rotation.y+=p*(index%2?1.8:-1.8);
    wisp.scale.copy(wisp.userData.baseScale).multiplyScalar((.2+smokeBirth*(1.35+p*3.2))*wispLife);
  });

  // Two irregular body-shaped flashes briefly swell out from the torso and
  // skull, adding volume without reducing the effect to a plain circle.
  const auraLife=1-THREE.MathUtils.smootherstep(fxP,.055,.22);
  for(const [aura,multiplier] of [[rig.bodyAura,1.25],[rig.headAura,1.4]]){
    if(!aura)continue;
    aura.visible=rupture>.01&&auraLife>.01;
    aura.scale.copy(aura.userData.baseScale).multiplyScalar((.7+rupture*(1+p*multiplier))*auraLife);
  }

  actor.group.traverse((child)=>{
    if(!child.isMesh||!child.material)return;
    if(child.userData.glowRatDeathBaseOpacity===undefined){
      child.userData.glowRatDeathBaseOpacity=child.userData.baseOpacity??child.material.opacity;
    }
    child.material.transparent=true;
    child.material.opacity=child.userData.glowRatDeathBaseOpacity*fade;
  });
  return p>=1;
}

export function applyEnemyPose(actor,{elapsed=0,movementAmount=0,walkPhase=elapsed*(actor.speed||actor.type?.speed||1)*4.2,attackStrength=0,stunnedProgress=null}={}){
  const stride=Math.sin(walkPhase)*movementAmount;
  if(actor.typeId===1||actor.id===1)animateCrawler(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===2||actor.id===2)animateBrokenDrone(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===3||actor.id===3)animateGlowRat(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===4||actor.id===4)animatePatrolBot(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===5||actor.id===5)animateRustGuard(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===6||actor.id===6)animatePulseDrone(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===7||actor.id===7)animateShockSpider(actor,elapsed,movementAmount,walkPhase,attackStrength);
  else if(actor.typeId===8||actor.id===8)animateRiotUnit(actor,elapsed,movementAmount,walkPhase,attackStrength);
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
    }else if(actor.typeId===3||actor.id===3){
      animateGlowRatStunned(actor,elapsed,stunP);
    }else if(actor.typeId===7||actor.id===7){
      const rig=actor.parts.shockSpider,twitch=Math.sin(stunP*Math.PI*28+(actor.seed||0)),fault=.5+.5*Math.sin(stunP*Math.PI*12);
      actor.group.rotation.z=twitch*.025;actor.group.rotation.x=.04+fault*.015;
      actor.group.position.y=(actor.deathBaseY??actor.animationBaseY??0)-arc*.09;
      if(actor.parts.body){actor.parts.body.position.y-=arc*.13;actor.parts.body.scale.y*=1-arc*.13;actor.parts.body.rotation.z+=twitch*.02;}
      if(actor.parts.head){actor.parts.head.position.y-=arc*.11;actor.parts.head.rotation.x+=arc*.16+twitch*.035;}
      rig?.legSets.forEach(({side,row,hip,knee,foot},index)=>{
        hip.rotation.z-=side*(arc*(.24+row*.035)+twitch*.035*(index%2?1:-1));
        hip.position.y-=arc*.05;knee.rotation.z+=side*arc*(.3+row*.025);foot.rotation.x-=arc*.2;
      });
      rig?.mandibles.forEach((mandible,index)=>{const side=mandible.userData.shockSpiderSide||1;mandible.rotation.y-=side*(arc*.18+twitch*.055*(index?1:-1));});
      actor.parts.glows.forEach((part,index)=>{part.visible=Math.sin(stunP*Math.PI*(18+index*.08)+index)>-.35;part.scale.multiplyScalar(.8+fault*.35);});
    }else{
      actor.group.rotation.z=arc*1.05;
      if(actor.flying)actor.group.position.y-=arc*.08;
      else actor.group.position.y=(actor.deathBaseY??actor.animationBaseY??0)-arc*.08;
    }
  }else if(actor.typeId===3||actor.id===3){
    actor.glowRatStunStartedAt=undefined;
    actor.glowRatStunLastElapsed=undefined;
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
  if(actor.typeId===3||actor.id===3)return animateGlowRatDeath(actor,time);
  if(actor.typeId===7||actor.id===7)return animateShockSpiderDeath(actor,time);
  actor.group.rotation.z=Math.min(Math.PI*.52,time*2.25);actor.group.rotation.y=(actor.deathBaseRotationY||0)+time*(actor.flying?5:.7);
  actor.group.position.y=Math.max(0,(actor.deathBaseY||0)-time*2.3);
  if(time>.55){const fade=Math.max(0,1-(time-.55)/.65),shrink=Math.exp(-(time-.55)*2.2);if(actor.baseScale)actor.group.scale.copy(actor.baseScale).multiplyScalar(shrink);actor.group.traverse((child)=>{if(child.isMesh&&child.material){child.material.transparent=true;child.material.opacity=Math.min(child.userData.baseOpacity??child.material.opacity,fade);}});}
  return progress>=1;
}

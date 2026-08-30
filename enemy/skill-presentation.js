import * as THREE from "three";
import {alignCrawlerSegment} from "./model-utils.js";

const digHip=new THREE.Vector3(),digKnee=new THREE.Vector3(),digAnkle=new THREE.Vector3();
let enemySkillEffectQuality=1;
export function setEnemySkillEffectQuality(value){enemySkillEffectQuality=THREE.MathUtils.clamp(Number(value)||0,.1,1);}

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

function applyGlowRatRushPose(actor,time,duration,previewMotion){
  const parts=actor.parts,rig=parts.glowRat;
  if(!rig)return;
  const p=THREE.MathUtils.clamp(time/duration,0,1);
  const charge=THREE.MathUtils.smootherstep(p,0,.27);
  const launch=THREE.MathUtils.smootherstep(p,.22,.4);
  const recovery=THREE.MathUtils.smootherstep(p,.76,1);
  const rush=launch*(1-recovery),coil=charge*(1-launch);
  const kick=Math.sin(THREE.MathUtils.clamp((p-.22)/.24,0,1)*Math.PI);
  const stride=Math.sin(time*25),radiationBeat=.5+.5*Math.sin(time*19);

  // Anticipation compresses the rat toward the floor; the release stretches
  // its silhouette forward, followed by rapid diagonal foot cycling.
  actor.group.rotation.x-=coil*.1+rush*.075-kick*.035;
  actor.group.rotation.z+=stride*rush*.012;
  if(previewMotion){
    const travel=THREE.MathUtils.smootherstep(p,.27,.82)*(1-THREE.MathUtils.smootherstep(p,.9,1));
    actor.group.position.z+=travel*8.55;
  }
  if(parts.body){
    parts.body.position.y-=coil*.11-rush*Math.abs(stride)*.025;
    parts.body.position.z+=launch*.18-recovery*.18;
    parts.body.rotation.x-=coil*.16+rush*.08;
    parts.body.scale.x*=1+coil*.08-rush*.08;
    parts.body.scale.y*=1-coil*.2+rush*.05;
    parts.body.scale.z*=1+launch*.24-recovery*.24;
  }
  if(parts.head){
    parts.head.position.y-=coil*.16+rush*(.035+Math.abs(stride)*.015);
    parts.head.position.z+=launch*.3-recovery*.3;
    parts.head.rotation.x+=coil*.28-rush*.16+stride*rush*.018;
    parts.head.scale.z*=1+kick*.12;
  }
  parts.legs.forEach((leg,index)=>{
    const side=index%2===0?-1:1,front=index>=2,phase=stride*(index===0||index===3?1:-1);
    leg.position.x+=side*coil*.055;
    leg.position.y-=coil*.055-Math.max(0,phase)*rush*.07;
    leg.position.z+=coil*(front?.07:-.045)+phase*rush*(front?.14:.11);
    leg.rotation.x+=coil*(front?-.4:.32)+phase*rush*(front?.72:.58);
    leg.rotation.z+=side*(coil*.3+Math.max(0,phase)*rush*.12);
  });
  rig.ears.forEach((ear,index)=>{
    const side=ear.userData.glowRatSide||1;
    ear.position.y-=charge*.045;ear.position.z-=launch*.045;
    ear.rotation.z-=side*(coil*.42+rush*.62)+Math.sin(time*18+index)*rush*.025;
    ear.scale.y*=1-charge*.16;
  });
  rig.whiskers.forEach((whisker,index)=>{
    const side=whisker.userData.glowRatSide||1,row=whisker.userData.glowRatRow??1;
    whisker.rotation.z+=side*((row-1)*rush*.075+stride*rush*.018);
    whisker.rotation.x-=launch*.1+Math.sin(time*22+index)*rush*.012;
    whisker.scale.y*=1+rush*.18;
  });
  rig.tailSegments.forEach((segment,index)=>{
    const tailWave=Math.sin(time*(8+launch*8)-index*.66);
    segment.rotation.y+=coil*Math.sin(index*.72)*(.025+index*.02)+rush*tailWave*(.025+index*.018);
    segment.rotation.z+=coil*(.018+index*.012)-rush*Math.cos(time*15-index*.55)*(.012+index*.009);
  });
  parts.glows.forEach((glow,index)=>{
    const surge=charge*(.18+index%4*.025)+rush*(.32+radiationBeat*.34);
    glow.scale.multiplyScalar(1+surge);
    glow.visible=true;
  });
  rig.dorsalCore.rotation.y+=time*(5+charge*8+rush*18);
  rig.dorsalCore.scale.multiplyScalar(1+charge*.32+rush*(.45+radiationBeat*.25));
  rig.dorsalHalo.scale.multiplyScalar(1+charge*.45+rush*.8);

  const moteLimit=Math.max(3,Math.ceil((rig.rushMotes?.length||0)*enemySkillEffectQuality));
  rig.rushMotes?.forEach((mote,index)=>{
    if(index>=moteLimit||recovery>.98){mote.visible=false;return;}
    const phase=mote.userData.glowRatRushPhase||0,angle=phase*Math.PI*2+time*(3+charge*6);
    const radius=THREE.MathUtils.lerp(.95,.22,charge)*(1+rush*.4);
    mote.visible=true;
    mote.position.set(Math.cos(angle)*radius,.43+Math.sin(angle*2+time*5)*(.13+charge*.05),.02+Math.sin(angle)*radius-rush*.25);
    mote.rotation.set(time*(5+index*.2),angle,time*(7+index*.15));
    mote.scale.copy(mote.userData.baseScale).multiplyScalar(.7+charge*.9+rush*(.8+radiationBeat*.5));
  });
  const streakLimit=Math.max(2,Math.ceil((rig.rushStreaks?.length||0)*enemySkillEffectQuality));
  rig.rushStreaks?.forEach((streak,index)=>{
    if(index>=streakLimit||rush<.02){streak.visible=false;return;}
    const row=streak.userData.glowRatRushRow||0,side=streak.userData.glowRatRushSide||1;
    streak.visible=true;
    streak.position.copy(streak.userData.basePosition);
    streak.position.x+=side*Math.sin(time*17+index)*.025;
    streak.position.z-=((time*(2.6+row*.32)+row*.19)%1)*.9;
    streak.scale.copy(streak.userData.baseScale);streak.scale.z*=1.8+rush*(2.4+row*.42);
  });
  const ringLimit=Math.max(1,Math.ceil((rig.rushRings?.length||0)*enemySkillEffectQuality));
  rig.rushRings?.forEach((ring,index)=>{
    const phase=THREE.MathUtils.clamp((p-.24-index*.035)/.3,0,1);
    if(index>=ringLimit||phase<=0||phase>=1){ring.visible=false;return;}
    ring.visible=true;ring.position.copy(ring.userData.basePosition);ring.position.z-=phase*(1.5+index*.24);
    ring.rotation.copy(ring.userData.baseRotation);ring.rotation.z+=time*(index%2?3:-3);
    ring.scale.copy(ring.userData.baseScale).multiplyScalar(.3+phase*2.1);
  });
  const echoLimit=enemySkillEffectQuality<.45?0:Math.ceil((rig.rushEchoes?.length||0)*enemySkillEffectQuality);
  rig.rushEchoes?.forEach((echo,index)=>{
    if(index>=echoLimit||rush<.04){echo.visible=false;return;}
    const phase=(time*1.9+(echo.userData.glowRatRushPhase||0))%1;
    echo.visible=true;echo.position.copy(echo.userData.basePosition);echo.position.z-=phase*1.35;
    echo.scale.copy(echo.userData.baseScale).multiplyScalar(1+phase*.45);
    echo.material.opacity=.1*(1-phase)*rush;
  });
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
  }else if(motion==="dash"&&definition.id===8){
    const rig=parts.riotUnit;
    const brace=THREE.MathUtils.smootherstep(p,0,.2);
    const launch=THREE.MathUtils.smootherstep(p,.17,.36);
    const recovery=THREE.MathUtils.smootherstep(p,.8,1);
    const rush=launch*(1-recovery),coil=brace*(1-launch),impact=Math.sin(THREE.MathUtils.clamp((p-.68)/.2,0,1)*Math.PI);
    const march=Math.sin(time*20)*rush;
    if(previewMotion)actor.group.position.z+=THREE.MathUtils.smootherstep(p,.19,.8)*8.55;
    actor.group.rotation.x-=coil*.1+rush*.22-impact*.06;
    actor.group.rotation.z+=march*.014;
    if(parts.body){parts.body.position.y-=coil*.09-rush*Math.abs(march)*.02+impact*.04;parts.body.position.z+=rush*.2;parts.body.rotation.x-=coil*.12+rush*.14;}
    if(parts.head){parts.head.position.y-=coil*.045;parts.head.position.z+=rush*.14;parts.head.rotation.x-=rush*.14;}
    parts.legs.forEach((leg,index)=>{
      const side=index===0?-1:1,phase=march*(index===0?-1:1);
      leg.rotation.x+=coil*.18+phase*.55;
      leg.rotation.z+=side*(coil*.1+rush*.065+impact*.06);
      leg.position.y-=coil*.04-Math.max(0,phase)*.055+impact*.018;
      leg.position.z+=phase*.09+rush*.04;
    });
    if(parts.arms[0]){
      parts.arms[0].rotation.x-=brace*.34+impact*.2;
      parts.arms[0].rotation.z-=brace*.13;
      parts.arms[0].position.z+=brace*.36+impact*.3;
      parts.arms[0].position.x+=brace*.055;
    }
    if(parts.arms[1]){parts.arms[1].rotation.x+=coil*.32-rush*.12;parts.arms[1].rotation.z+=brace*.16;parts.arms[1].position.z-=coil*.06;}
    if(rig){
      const surge=Math.max(0,Math.sin(time*24))*rush;
      rig.chestRing.rotation.z+=time*(4+rush*9);rig.chestCore.rotation.y-=time*(6+rush*12);
      rig.chestCore.scale.multiplyScalar(1+coil*.22+rush*.26+impact*.38);
      rig.visor.scale.x*=1+brace*.15+rush*.08;
      rig.shieldRails.forEach((rail)=>rail.scale.y*=1+coil*.18+rush*.14+impact*.24);
      rig.shieldCore.rotation.z+=time*(7+rush*14);rig.shieldCore.scale.multiplyScalar(1+coil*.35+rush*(.3+surge*.16)+impact*.75);
      rig.batonCoil.rotation.z-=time*(5+rush*9);rig.batonTip.rotation.y+=time*(7+rush*13);
      rig.batonTip.scale.multiplyScalar(1+coil*.18+rush*.25+impact*.34);
      rig.emergencyLeft.visible=Math.sin(time*14)>-.1;rig.emergencyRight.visible=Math.sin(time*14+Math.PI)>-.1;
    }
  }else if(motion==="dash"&&definition.id===5){
    const rig=parts.rustGuard;
    const brace=THREE.MathUtils.smootherstep(p,0,.2);
    const launch=THREE.MathUtils.smootherstep(p,.17,.38);
    const recovery=THREE.MathUtils.smootherstep(p,.78,1);
    const rush=launch*(1-recovery),coil=brace*(1-launch);
    const footCycle=Math.sin(time*22)*rush,impactPulse=Math.max(0,Math.sin(time*18))*rush;
    if(previewMotion)actor.group.position.z+=THREE.MathUtils.smootherstep(p,.2,.82)*8.55;
    actor.group.rotation.x-=coil*.13+rush*.2;
    actor.group.rotation.z+=footCycle*.018;
    if(parts.body){parts.body.position.y-=coil*.1-rush*Math.abs(footCycle)*.025;parts.body.position.z+=rush*.16;parts.body.rotation.x-=coil*.16+rush*.12;}
    if(parts.head){parts.head.position.y-=coil*.055;parts.head.position.z+=rush*.13;parts.head.rotation.x-=rush*.18;}
    parts.legs.forEach((leg,index)=>{
      const phase=footCycle*(index?1:-1),side=index?-1:1;
      leg.rotation.x+=coil*.22+phase*.62;
      leg.rotation.z+=side*(coil*.13+rush*.06);
      leg.position.y-=coil*.045-Math.max(0,phase)*.065;
      leg.position.z+=phase*.11;
    });
    if(parts.arms[0]){parts.arms[0].rotation.x-=brace*.72;parts.arms[0].rotation.z-=brace*.24;parts.arms[0].position.z+=brace*.32;parts.arms[0].position.x-=brace*.06;}
    if(parts.arms[1]){parts.arms[1].rotation.x+=coil*.42-rush*.18;parts.arms[1].rotation.z+=brace*.18;parts.arms[1].position.z-=coil*.08;}
    if(rig){
      rig.furnace.rotation.z+=time*(5+rush*12);rig.furnaceRing.rotation.z-=time*(3+rush*7);
      rig.furnace.scale.multiplyScalar(1+coil*.35+rush*(.32+impactPulse*.22));
      rig.furnaceRing.scale.multiplyScalar(1+coil*.22+rush*.16);
      rig.visor.scale.x*=1+brace*.2;rig.shieldCore.scale.multiplyScalar(1+brace*.28+impactPulse*.2);
      rig.bladeEdge.scale.y*=1+coil*.12+rush*.2;
    }
  }else if(motion==="dash"&&previewMotion){const travel=THREE.MathUtils.smoothstep(Math.min(1,p/.68),0,1);actor.group.position.z+=travel*8.55;actor.group.rotation.x-=arc*.13;}
  else if(motion==="shadowDash"&&previewMotion){const travel=THREE.MathUtils.smoothstep(Math.min(1,p/.62),0,1);actor.group.position.z+=travel*8.55;actor.group.position.x+=Math.sin(p*Math.PI*2)*.7;actor.group.rotation.y+=Math.sin(p*Math.PI*2)*.45;}
  else if(motion==="leap"&&definition.id===7){
    const rig=parts.shockSpider;
    const coil=THREE.MathUtils.smootherstep(p,0,.2)*(1-THREE.MathUtils.smootherstep(p,.2,.34));
    const launch=THREE.MathUtils.smootherstep(p,.18,.36);
    const land=THREE.MathUtils.smootherstep(p,.68,.84);
    const recovery=THREE.MathUtils.smootherstep(p,.84,1);
    const airborne=launch*(1-land),impact=Math.sin(THREE.MathUtils.clamp((p-.68)/.2,0,1)*Math.PI);
    const travel=THREE.MathUtils.smootherstep(p,.2,.78);
    actor.group.position.y+=airborne*1.25-coil*.12-impact*.08;
    if(previewMotion)actor.group.position.z+=travel*8.4;
    actor.group.rotation.x-=coil*.14+airborne*.28-impact*.1;
    actor.group.rotation.z+=Math.sin(time*18)*airborne*.018;
    if(parts.body){parts.body.position.y-=coil*.13-airborne*.045+impact*.08;parts.body.position.z+=airborne*.16;parts.body.rotation.x-=coil*.2+airborne*.16;parts.body.scale.y*=1-coil*.16+impact*.09;}
    if(parts.head){parts.head.position.y-=coil*.1;parts.head.position.z+=launch*.31-recovery*.31;parts.head.rotation.x-=airborne*.22+impact*.16;}
    if(rig){
      rig.legSets.forEach(({side,row,hip,knee,foot})=>{
        const front=row===0,rear=row===3,tuck=coil+airborne*(front?.45:.75);
        hip.rotation.y+=(front?-.18:rear?.2:0)*airborne;
        hip.rotation.z-=side*(tuck*(.32+row*.035)-impact*(front?.36:.12));
        hip.position.y-=coil*.055-airborne*.035+impact*.025;
        hip.position.z+=airborne*(front?.1:rear?-.08:0)+impact*(front?.15:-.025);
        knee.rotation.z+=side*(tuck*.42+impact*(front?.28:.12));
        knee.rotation.y-=airborne*(front?.16:.08);
        foot.rotation.x-=tuck*.3+impact*.2;
      });
      rig.mandibles.forEach((mandible)=>{
        const side=mandible.userData.shockSpiderSide||1;
        mandible.rotation.y+=side*(coil*.22-airborne*.16-impact*.58);
        mandible.position.z+=airborne*.08+impact*.12;
      });
      const surge=Math.max(0,Math.sin(time*(18+airborne*18)));
      rig.abdomenCoil.rotation.z+=time*(6+launch*16);rig.abdomenCoil.scale.multiplyScalar(1+coil*.42+airborne*.3+impact*.7);
      rig.abdomenCore.rotation.y-=time*(5+launch*18);rig.abdomenCore.scale.multiplyScalar(1+coil*.55+airborne*(.35+surge*.18)+impact*.9);
      rig.foreheadCoil.rotation.z-=time*(7+launch*19);rig.foreheadCoil.scale.multiplyScalar(1+coil*.35+airborne*.24+impact*.65);
      rig.crown.rotation.y+=time*(8+launch*22);rig.crown.scale.multiplyScalar(1+coil*.6+airborne*(.4+surge*.25)+impact*1.1);
      rig.eyes.forEach((eye)=>eye.scale.multiplyScalar(1+coil*.18+airborne*.22+impact*.34));
      rig.capacitors.forEach((part,index)=>{if(index%2)part.scale.multiplyScalar(1+coil*.3+airborne*.2+impact*.5);});
    }
  }
  else if(motion==="leap"&&previewMotion){actor.group.position.y+=arc*1.45;actor.group.position.z+=THREE.MathUtils.smoothstep(Math.min(1,p/.7),0,1)*8.4;parts.legs.forEach((part,index)=>part.rotation.z+=(index%2?1:-1)*arc*.38);}
  else if(motion==="phase"){if(previewMotion){actor.group.visible=!(p>.32&&p<.55);if(p>=.55)actor.group.position.z+=8.55;actor.group.position.x+=Math.sin(p*Math.PI*2)*.45;}parts.rings.forEach((part,index)=>part.rotation[index%2?"z":"y"]+=time*5);}
  else if(motion==="stomp"){if(previewMotion)actor.group.position.y+=Math.sin(Math.min(1,p*2)*Math.PI)*.45;if(parts.body)parts.body.rotation.x-=arc*.18;parts.rings.forEach((part)=>part.scale.multiplyScalar(1+p*8));}
  else if(motion==="core"){parts.rings.forEach((part,index)=>{part.rotation.x+=time*(1+index);part.rotation.y+=time*(1.4+index);part.scale.multiplyScalar(1+arc*.18);});parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.25));}
  else if(motion==="rangedBurst"&&definition.id===2){
    const rig=parts.brokenDrone,spinUp=THREE.MathUtils.smootherstep(p,0,.2),recovery=THREE.MathUtils.smootherstep(p,.78,1),firing=spinUp*(1-recovery);
    const volley=THREE.MathUtils.clamp((p-.18)/.58,0,.9999)*4,shotIndex=Math.floor(volley),shotProgress=volley-shotIndex;
    const recoil=Math.sin(THREE.MathUtils.clamp(shotProgress/.72,0,1)*Math.PI)*firing;
    actor.group.rotation.x-=spinUp*.09-recovery*.09;
    actor.group.rotation.z+=Math.sin(time*21)*firing*.045+Math.sin(p*Math.PI)*.055;
    if(parts.body){parts.body.position.z-=recoil*.055;parts.body.rotation.x-=recoil*.045;}
    if(parts.head){parts.head.position.z-=recoil*.1;parts.head.rotation.x+=recoil*.08;}
    parts.weapons.forEach((barrel,index)=>{
      const active=index===shotIndex%Math.max(1,parts.weapons.length)?1:.16;
      barrel.position.copy(barrel.userData.basePosition);barrel.rotation.copy(barrel.userData.baseRotation);
      barrel.position.z-=recoil*(.2*active+.025);barrel.rotation.x+=(index-1)*recoil*.035;
    });
    parts.glows.forEach((light,index)=>light.scale.multiplyScalar(1+firing*(.12+Math.max(0,Math.sin(time*18-index))*.18)));
    if(rig){
      rig.workingRotor.rotation.y+=time*(20+spinUp*22);
      rig.intactWing.rotation.z-=spinUp*.045+recoil*.035;
      rig.brokenHub.rotation.z+=Math.sin(time*27)*firing*.11;
      rig.brokenBladeUpper.rotation.z+=Math.sin(time*31)*firing*.13;
      rig.brokenBladeLower.rotation.x-=Math.sin(time*25)*firing*.1;
      rig.hangingCable.rotation.z+=Math.sin(time*16)*firing*.14;
      rig.loosePlate.rotation.x+=Math.sin(time*29)*firing*.1;
      rig.workingThruster.scale.z*=1+spinUp*.38+recoil*.24;
      rig.reactor.rotation.y+=time*(3+spinUp*8);rig.reactorRing.rotation.y+=time*(5+spinUp*12);
      rig.eye.scale.multiplyScalar(1+spinUp*.22+recoil*.32);rig.faultLight.visible=Math.sin(time*28)>.05;
    }
  }
  else if(["rangedBurst","sniper","barrage","bombardment"].includes(motion)){parts.weapons.forEach((part,index)=>{part.position.z-=Math.abs(Math.sin(time*(motion==="barrage"?16:7)+index))*.18;});parts.weaponRotors?.forEach((part,index)=>{part.rotation.y+=(index%2?-1:1)*time*24;});actor.group.rotation.z+=Math.sin(time*18)*arc*.025;}
  else if(motion==="pulse"&&definition.id===6){
    const rig=parts.pulseDrone;
    const charge=THREE.MathUtils.smootherstep(p,0,.48);
    const discharge=THREE.MathUtils.smootherstep(p,.48,.64);
    const recovery=THREE.MathUtils.smootherstep(p,.78,1);
    const stored=charge*(1-discharge),blast=discharge*(1-recovery);
    const vibration=Math.sin(time*(12+charge*20))*stored;
    actor.group.position.y-=stored*.14-blast*.08;
    actor.group.rotation.x+=vibration*.018;
    actor.group.rotation.z+=Math.cos(time*31)*stored*.014;
    if(parts.body){parts.body.scale.multiplyScalar(1-stored*.06+blast*.1);parts.body.rotation.y+=time*(2+charge*7);}
    if(parts.head){parts.head.position.y-=stored*.045;parts.head.rotation.x-=stored*.12;}
    if(rig){
      rig.projectorRig.position.y-=charge*.22-recovery*.22;
      rig.projectorRig.rotation.y+=time*(2+charge*9);
      rig.gyroBands.forEach((band,index)=>{
        band.rotation[index===0?"z":index===1?"y":"x"]+=(index%2?-1:1)*time*(5+charge*13);
        band.scale.multiplyScalar(1+stored*(.12+index*.035)+blast*(1.5+index*.4));
      });
      rig.stabilizers.forEach((stabilizer,index)=>{
        const side=index%2?-1:1;
        stabilizer.rotation.z+=side*(stored*.18-blast*.12);
        stabilizer.position.y+=Math.sin(index*Math.PI/2)*stored*.055;
      });
      rig.nacelles.forEach((nacelle)=>{
        const side=nacelle.userData.pulseDroneSide||1;
        nacelle.rotation.z-=side*(stored*.16+blast*.08);
        nacelle.position.x+=side*blast*.1;
      });
      rig.thrusters.forEach((thruster)=>{thruster.scale.y*=1+stored*.3+blast*.55;});
      rig.reactor.rotation.y+=time*(8+charge*22);rig.reactor.rotation.z-=time*(5+charge*16);
      rig.reactor.scale.multiplyScalar(1+stored*.65+blast*.85);
      rig.reactorCage.rotation.z+=time*(7+charge*18);rig.reactorCage.scale.multiplyScalar(1+stored*.36+blast*.55);
      rig.reactorLens.scale.multiplyScalar(1+stored*.72+blast*1.1);
      rig.projectorCore.rotation.y+=time*(9+charge*20);rig.projectorCore.scale.multiplyScalar(1+stored*.7+blast*1.2);
      rig.projectorRing.rotation.z-=time*(8+charge*16);rig.projectorRing.scale.multiplyScalar(1+stored*.42+blast*2.8);
      rig.eyeIris.scale.multiplyScalar(1+stored*.38+blast*.6);
      rig.muzzles.forEach((muzzle)=>{muzzle.visible=false;});
    }
  }
  else if(["pulse","deploy","gravityOrb"].includes(motion)){parts.rings.forEach((part,index)=>{part.rotation[index%2?"z":"y"]+=time*4;part.scale.multiplyScalar(motion==="pulse"?1+p*6:1+arc*.35);});parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.3));}
  else if(motion==="flameWall")parts.weapons.forEach((part)=>{part.rotation.y+=Math.sin(p*Math.PI*2)*.5;part.scale.z*=1+arc*.3;});
  else if(motion==="radiationRush"&&definition.id===3)applyGlowRatRushPose(actor,time,duration,previewMotion);
  else if(motion==="selfPulse"){if(previewMotion&&actor.groupScale)actor.group.scale.copy(actor.groupScale).multiplyScalar(1+arc*.16);parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.4));}
  else if(motion==="scanning"&&definition.id===4){
    const rig=parts.patrolBot;
    const deploy=THREE.MathUtils.smootherstep(p,0,.18);
    const lock=THREE.MathUtils.smootherstep(p,.5,.78);
    const release=THREE.MathUtils.smootherstep(p,.84,1);
    const active=deploy*(1-release),sweep=Math.sin(p*Math.PI*8)*(1-lock)*active;
    const lockPulse=Math.max(0,Math.sin((p-.48)*Math.PI*12))*lock*(1-release);
    actor.group.rotation.x-=active*.045;
    if(parts.body){parts.body.rotation.y-=sweep*.045;parts.body.position.y-=active*.025;}
    if(parts.head){parts.head.rotation.y+=sweep*.72;parts.head.rotation.x-=deploy*.075-lock*.04;parts.head.position.z+=lock*.045;}
    if(parts.legs[0]){parts.legs[0].rotation.z-=active*.11;parts.legs[0].position.x-=active*.025;}
    if(parts.legs[1]){parts.legs[1].rotation.z+=active*.11;parts.legs[1].position.x+=active*.025;}
    if(parts.arms[0]){parts.arms[0].rotation.x-=deploy*.25;parts.arms[0].rotation.z-=deploy*.17;}
    if(parts.arms[1]){parts.arms[1].rotation.x-=deploy*.48;parts.arms[1].rotation.z+=deploy*.1;}
    if(rig){
      rig.chestCore.rotation.z+=time*(4+lock*8);
      rig.chestHalo.rotation.z-=time*(2+lock*5);
      rig.chestCore.scale.multiplyScalar(1+arc*.32+lockPulse*.16);
      rig.scanLens.scale.multiplyScalar(1+deploy*.45+lockPulse*.5);
      rig.visor.scale.x*=1+deploy*.08;
      rig.weapon.position.z-=lockPulse*.18;
      rig.weaponCell.scale.multiplyScalar(1+lock*.25+lockPulse*.3);
      rig.muzzle.visible=lock>.25&&lockPulse>.22;
      if(rig.muzzle.visible)rig.muzzle.scale.multiplyScalar(1+lockPulse*1.4);
      rig.beacon.rotation.y+=time*(7+lock*6);
      rig.shoulderLights.forEach((light,index)=>{light.visible=Math.sin(time*13+index*Math.PI)>-.15;light.scale.multiplyScalar(1+lockPulse*.25);});
    }
  }
  else if(motion==="scanning"){if(parts.head)parts.head.rotation.y+=Math.sin(p*Math.PI*4)*.65;parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.25));}
  else if(motion==="cloud"){parts.glows.forEach((part,index)=>part.scale.multiplyScalar(1+arc*(.3+index*.015)));if(parts.body)parts.body.rotation.y+=time*.35;}
  else{if(parts.body){parts.body.position.y+=arc*.12;parts.body.rotation.y+=time*.5;}parts.glows.forEach((part)=>part.scale.multiplyScalar(1+arc*.3));}
  return p;
}

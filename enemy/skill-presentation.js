import * as THREE from "three";

export function getScrapBurrowPhase(time){
  if(time<1)return {name:"enter",progress:THREE.MathUtils.clamp(time,0,1)};
  if(time<3)return {name:"travel",progress:(time-1)/2};
  if(time<4)return {name:"emerge",progress:time-3};
  return {name:"complete",progress:1};
}

export function applyScrapDigPose(actor,progress,emerging=false){
  const p=THREE.MathUtils.clamp(progress,0,1);
  const eased=emerging?1-Math.pow(1-p,3):p*p;
  actor.group.position.y=emerging?-.58+eased*.58:-eased*.58;
  actor.group.rotation.x=(emerging?1-p:p)*.22;
  actor.group.rotation.z=Math.sin(p*Math.PI*12)*.055*(emerging?1-p:1);
  actor.parts.legs.forEach((leg,index)=>{
    const direction=index%2?-1:1;
    leg.rotation.z=leg.userData.baseRotation.z+Math.sin(p*Math.PI*8+index)*.38*direction;
    leg.rotation.x=leg.userData.baseRotation.x+Math.sin(p*Math.PI*6+index*.7)*.16;
  });
  if(actor.parts.body)actor.parts.body.rotation.x=actor.parts.body.userData.baseRotation.x+(emerging?-.18:.24)*Math.sin(p*Math.PI);
  if(actor.parts.head)actor.parts.head.rotation.x=actor.parts.head.userData.baseRotation.x+(emerging?-.28:.32)*Math.sin(p*Math.PI);
}

export function applyEnemySkillPose(actor,definition,time,duration,{previewMotion=false}={}){
  const parts=actor.parts,p=THREE.MathUtils.clamp(time/duration,0,1),arc=Math.sin(p*Math.PI);
  const motion=definition.animations.skillMotion;
  if(motion==="burrow"){
    const phase=getScrapBurrowPhase(time);
    if(phase.name==="enter")applyScrapDigPose(actor,phase.progress,false);
    else if(phase.name==="travel"){actor.group.position.y=-.58;if(previewMotion)actor.group.position.z+=THREE.MathUtils.smoothstep(phase.progress,0,1)*8.55;}
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

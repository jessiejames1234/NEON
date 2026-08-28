import * as THREE from "three";

const abilityDiskGeometry=new THREE.CylinderGeometry(.5,.5,.035,24);
const abilityOrbGeometry=new THREE.SphereGeometry(.5,12,8);
const abilityBeamGeometry=new THREE.BoxGeometry(1,.07,.16);

export const ABILITY_INDICATOR_COLORS=Object.freeze({damage:0xff263f,buff:0x2587ff,repair:0x2ee87c});

export function indicatorColor(indicator,fallback=0xff496c){
  return ABILITY_INDICATOR_COLORS[indicator?.type]??fallback;
}

export function createAbilityVisual(scene,kind,position,options={}){
  const geometry=options.shape==="orb"?abilityOrbGeometry:options.shape==="beam"?abilityBeamGeometry:abilityDiskGeometry;
  const material=new THREE.MeshBasicMaterial({
    color:options.color??0xff496c,transparent:true,opacity:options.opacity??.5,
    depthWrite:false,blending:THREE.AdditiveBlending,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(position);
  mesh.position.y=options.shape==="orb"?(options.y??1):(options.y??.045);
  const radius=options.radius??2;
  const visualRadius=options.visualRadius??(options.shape==="orb"?.55:radius);
  if(options.shape==="beam")mesh.scale.set(options.length??12,1,1);
  else mesh.scale.set(visualRadius*2,options.shape==="orb"?visualRadius*2:1,visualRadius*2);
  scene.add(mesh);
  return {kind,mesh,age:0,life:options.life??2,radius,baseScale:mesh.scale.clone(),baseRotationY:mesh.rotation.y};
}

export function advanceAbilityVisual(effect,delta){
  effect.age+=delta;
  effect.mesh.material.opacity=Math.max(.08,(1-effect.age/effect.life)*.62);
  if(effect.kind!=="laser")effect.mesh.rotation.y+=delta*1.8;
  if(effect.kind==="warning")effect.mesh.scale.y=1+Math.sin(effect.age*10)*.08;
}

export function seekAbilityVisual(effect,age){
  effect.age=Math.max(0,age);effect.mesh.visible=effect.age<effect.life;
  effect.mesh.material.opacity=Math.max(.08,(1-effect.age/effect.life)*.62);
  effect.mesh.rotation.y=effect.baseRotationY+(effect.kind==="laser"?0:effect.age*1.8);
  effect.mesh.scale.copy(effect.baseScale);
  if(effect.kind==="warning")effect.mesh.scale.y=1+Math.sin(effect.age*10)*.08;
}

export function disposeAbilityVisual(scene,effect){
  if(!effect)return;scene.remove(effect.mesh);effect.mesh.material.dispose();
}

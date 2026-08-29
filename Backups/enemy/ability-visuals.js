import * as THREE from "three";

const abilityDiskGeometry=new THREE.CylinderGeometry(.5,.5,.035,24);
const abilityOrbGeometry=new THREE.SphereGeometry(.5,12,8);
const abilityBeamGeometry=new THREE.BoxGeometry(1,.07,.16);
const abilityBurrowRingGeometry=new THREE.RingGeometry(.31,.5,28);
const abilityBurrowShardGeometry=new THREE.TetrahedronGeometry(.075,0);

export const ABILITY_INDICATOR_COLORS=Object.freeze({damage:0xff263f,buff:0x2587ff,repair:0x2ee87c});

export function indicatorColor(indicator,fallback=0xff496c){
  return ABILITY_INDICATOR_COLORS[indicator?.type]??fallback;
}

export function createAbilityVisual(scene,kind,position,options={}){
  const burrowVisual=kind==="scrap-burrow"||kind==="scrap-emerge";
  const material=new THREE.MeshBasicMaterial({
    color:options.color??0xff496c,transparent:true,opacity:options.opacity??.5,
    depthWrite:false,blending:THREE.AdditiveBlending,
  });
  let mesh;
  if(burrowVisual){
    mesh=new THREE.Group();mesh.position.copy(position);mesh.position.y=options.y??.045;
    const ring=new THREE.Mesh(abilityBurrowRingGeometry,material);ring.rotation.x=-Math.PI/2;ring.userData.burrowRing=true;mesh.add(ring);
    for(let index=0;index<8;index+=1){const angle=index*Math.PI*.25,shard=new THREE.Mesh(abilityBurrowShardGeometry,material);shard.position.set(Math.cos(angle)*.43,.025,Math.sin(angle)*.43);shard.rotation.set(angle*.4,angle,angle*.7);shard.userData.burrowShard={angle,index};mesh.add(shard);}
  }else{
    const geometry=options.shape==="orb"?abilityOrbGeometry:options.shape==="beam"?abilityBeamGeometry:abilityDiskGeometry;
    mesh=new THREE.Mesh(geometry,material);mesh.position.copy(position);mesh.position.y=options.shape==="orb"?(options.y??1):(options.y??.045);
  }
  const radius=options.radius??2;
  const visualRadius=options.visualRadius??(options.shape==="orb"?.55:radius);
  if(options.shape==="beam")mesh.scale.set(options.length??12,1,1);
  else mesh.scale.set(visualRadius*2,options.shape==="orb"?visualRadius*2:1,visualRadius*2);
  scene.add(mesh);
  return {kind,mesh,material,age:0,life:options.life??2,radius,baseScale:mesh.scale.clone(),baseRotationY:mesh.rotation.y,baseRotationZ:mesh.rotation.z};
}

function poseBurrowVisual(effect){
  const emerge=effect.kind==="scrap-emerge",p=Math.min(1,effect.age/effect.life),pulse=Math.sin(effect.age*(emerge?24:19));
  effect.mesh.scale.copy(effect.baseScale).multiplyScalar(emerge?.72+p*.42:1+pulse*.06);
  effect.mesh.rotation.y=effect.baseRotationY+effect.age*(emerge?2.8:1.65);
  for(const child of effect.mesh.children){
    if(child.userData.burrowRing){child.scale.setScalar(emerge?1+p*.24:1+pulse*.045);continue;}
    const shard=child.userData.burrowShard;if(!shard)continue;
    const radial=emerge?.34+p*.62:.43+Math.sin(effect.age*13+shard.index)*.055;
    child.position.x=Math.cos(shard.angle)*radial;child.position.z=Math.sin(shard.angle)*radial;
    child.position.y=emerge?Math.sin(p*Math.PI)*(.22+shard.index%3*.055):Math.abs(Math.sin(effect.age*16+shard.index*.8))*.09;
    child.rotation.x=shard.angle*.4+effect.age*(emerge?7:4);child.rotation.z=shard.angle*.7+effect.age*(emerge?9:5);
    child.scale.setScalar(emerge?1-p*.45:.72+Math.abs(pulse)*.3);
  }
}

export function advanceAbilityVisual(effect,delta){
  effect.age+=delta;
  effect.material.opacity=Math.max(.08,(1-effect.age/effect.life)*.62);
  if(effect.kind!=="laser"&&effect.kind!=="scrap-burrow"&&effect.kind!=="scrap-emerge")effect.mesh.rotation.y+=delta*1.8;
  if(effect.kind==="warning")effect.mesh.scale.y=1+Math.sin(effect.age*10)*.08;
  if(effect.kind==="scrap-burrow"||effect.kind==="scrap-emerge")poseBurrowVisual(effect);
}

export function seekAbilityVisual(effect,age){
  effect.age=Math.max(0,age);effect.mesh.visible=effect.age<effect.life;
  effect.material.opacity=Math.max(.08,(1-effect.age/effect.life)*.62);
  effect.mesh.rotation.y=effect.baseRotationY+(effect.kind==="laser"||effect.kind==="scrap-burrow"||effect.kind==="scrap-emerge"?0:effect.age*1.8);
  effect.mesh.rotation.z=effect.baseRotationZ||0;
  effect.mesh.scale.copy(effect.baseScale);
  if(effect.kind==="warning")effect.mesh.scale.y=1+Math.sin(effect.age*10)*.08;
  if(effect.kind==="scrap-burrow"||effect.kind==="scrap-emerge")poseBurrowVisual(effect);
}

export function disposeAbilityVisual(scene,effect){
  if(!effect)return;scene.remove(effect.mesh);effect.material.dispose();
}

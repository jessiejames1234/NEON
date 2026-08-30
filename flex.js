import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  ENEMY_TYPES,buildEnemyModel,setEnemyModelAnisotropy,
  emitEnemySoundRecipe,emitScrapBurrowRecipe,getEnemyDefinition,
} from "./enemy/index.js";
import {createAbilityVisual,seekAbilityVisual,disposeAbilityVisual,indicatorColor} from "./enemy/ability-visuals.js";
import {applyEnemyPose,applyEnemyDeathPose,setEnemyEffectQuality} from "./enemy/animation-runtime.js";
import {applyEnemySkillPose,getScrapBurrowGroundPosition,getScrapBurrowPhase,setEnemySkillEffectQuality} from "./enemy/skill-presentation.js";

const mount=document.querySelector("#showroom");
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x030a10);
scene.fog=new THREE.Fog(0x030a10,20,42);

const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100);
const SHOWROOM_SPACING=5.25;
const ALL_ENEMIES_VIEW=new THREE.Vector3(13,13.5,23.5);
const ALL_ENEMIES_FRONT_VIEW=new THREE.Vector3(0,8.2,22);
const GRAPHICS_STORAGE_KEY="neon-outpost-graphics-v1";
const SHOWROOM_GRAPHICS=Object.freeze({
  "very-low":{pixelRatio:.5,anisotropy:1,fogFar:34,effectDensity:.1,animationStride:3,toneMapping:false},
  low:{pixelRatio:.65,anisotropy:2,fogFar:38,effectDensity:.25,animationStride:2,toneMapping:false},
  medium:{pixelRatio:.85,anisotropy:4,fogFar:42,effectDensity:.55,animationStride:1,toneMapping:true},
  high:{pixelRatio:1,anisotropy:8,fogFar:48,effectDensity:.85,animationStride:1,toneMapping:true},
  "very-high":{pixelRatio:1.3,anisotropy:16,fogFar:56,effectDensity:1,animationStride:1,toneMapping:true},
});
const coarsePointer=matchMedia("(pointer: coarse)").matches;
function detectShowroomGraphics(){
  const memory=Number(navigator.deviceMemory)||0,cores=Number(navigator.hardwareConcurrency)||0;
  const pixels=innerWidth*innerHeight*Math.min(devicePixelRatio||1,2)**2;
  let score=coarsePointer?0:2;
  if(memory){if(memory<=2)score-=2;else if(memory<=4)score-=1;else if(memory>=8)score+=1;}
  if(cores){if(cores<=2)score-=2;else if(cores<=4)score-=1;else if(cores>=8)score+=1;}
  if(pixels>5000000)score-=1;
  return score<=-2?"very-low":score<=0?"low":score<=2?"medium":score<=4?"high":"very-high";
}
function readShowroomGraphics(){
  try{const value=localStorage.getItem(GRAPHICS_STORAGE_KEY);return value==="auto"||SHOWROOM_GRAPHICS[value]?value:"auto";}catch{return "auto";}
}
let showroomGraphicsMode=readShowroomGraphics();
let activeShowroomGraphics=showroomGraphicsMode==="auto"?detectShowroomGraphics():showroomGraphicsMode;
let showroomAutoResolution=1;
const showroomPixelRatio=()=>Math.max(.45,Math.min(devicePixelRatio||1,SHOWROOM_GRAPHICS[activeShowroomGraphics].pixelRatio*(showroomGraphicsMode==="auto"?showroomAutoResolution:1)));
const renderer=new THREE.WebGLRenderer({antialias:!["very-low","low"].includes(activeShowroomGraphics)&&devicePixelRatio<=1.5,powerPreference:"high-performance"});
renderer.setPixelRatio(showroomPixelRatio());
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=false;
mount.append(renderer.domElement);
setEnemyModelAnisotropy(Math.min(SHOWROOM_GRAPHICS[activeShowroomGraphics].anisotropy,renderer.capabilities.getMaxAnisotropy()));

const ambient=new THREE.HemisphereLight(0x8de8df,0x071018,1.75);scene.add(ambient);
const key=new THREE.DirectionalLight(0xb9fff6,3.2);
key.position.set(-8,14,12);scene.add(key);
const rim=new THREE.DirectionalLight(0x397dff,2);rim.position.set(10,7,-12);scene.add(rim);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=false;
controls.minDistance=7;
controls.maxDistance=40;
controls.maxPolarAngle=Math.PI*.49;
controls.target.set(0,1.2,0);

const floor=new THREE.Mesh(
  new THREE.PlaneGeometry(80,80),
  new THREE.MeshStandardMaterial({color:0x070c10,roughness:.88,metalness:.08}),
);
floor.rotation.x=-Math.PI/2;scene.add(floor);

function createTrainingDummy(){
  const root=new THREE.Group();
  const shell=new THREE.MeshStandardMaterial({color:0xb5c2c0,roughness:.62,metalness:.34});
  const dark=new THREE.MeshStandardMaterial({color:0x263238,roughness:.7,metalness:.5});
  const target=new THREE.MeshBasicMaterial({color:0xff435d});
  const add=(geometry,material,scale,position,rotation=[0,0,0])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(...scale);mesh.position.set(...position);mesh.rotation.set(...rotation);root.add(mesh);return mesh;
  };
  add(new THREE.BoxGeometry(1,1,1),shell,[.68,.78,.34],[0,1.08,0]);
  add(new THREE.SphereGeometry(.5,10,7),shell,[.5,.5,.5],[0,1.72,0]);
  add(new THREE.BoxGeometry(1,1,1),dark,[.5,.12,.38],[0,.62,0]);
  for(const side of [-1,1]){
    add(new THREE.CylinderGeometry(.5,.5,1,8),dark,[.13,.72,.13],[side*.2,.3,0]);
    add(new THREE.CylinderGeometry(.5,.5,1,8),dark,[.1,.75,.1],[side*.48,1.08,0],[0,0,side*.16]);
  }
  add(new THREE.TorusGeometry(.5,.07,8,20),target,[.35,.35,.35],[0,1.12,.2]);
  add(new THREE.SphereGeometry(.5,10,7),target,[.12,.12,.05],[0,1.12,.23]);
  root.position.set(0,.08,10);root.rotation.y=Math.PI;root.visible=false;scene.add(root);return root;
}

const trainingDummy=createTrainingDummy();
const dummyBasePosition=trainingDummy.position.clone();
const dummyBaseRotation=trainingDummy.rotation.clone();
let dummyActive=false;
const projectile=new THREE.Mesh(
  new THREE.SphereGeometry(.075,8,6),
  new THREE.MeshBasicMaterial({color:0x63fff0}),
);
projectile.visible=false;scene.add(projectile);
let previewAbilityEffect=null,previewAbilityKey="";
const previewAbilityPosition=new THREE.Vector3();
const exhibits=[];

function createEnemyNameLabel(id,name,positionY,x,z){
  const canvas=document.createElement("canvas");canvas.width=384;canvas.height=64;
  const context=canvas.getContext("2d");
  context.fillStyle="rgba(3,13,20,.88)";context.fillRect(2,2,380,60);
  context.strokeStyle="#42e8d1";context.lineWidth=2;context.strokeRect(2,2,380,60);
  context.fillStyle="#67a9a5";context.font="700 15px monospace";context.textAlign="left";context.textBaseline="middle";
  context.fillText(`E${String(id).padStart(2,"0")}`,18,32);
  context.fillStyle="#e2fffb";context.font="800 20px monospace";
  context.fillText(name.toUpperCase(),72,32,292);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
  const label=new THREE.Sprite(material);label.position.set(x,positionY+.48,z);label.scale.set(2.75,.46,1);label.renderOrder=20;
  scene.add(label);return label;
}

for(let id=1;id<ENEMY_TYPES.length;id+=1){
  const type=ENEMY_TYPES[id];
  const column=(id-1)%5,row=Math.floor((id-1)/5);
  const x=(column-2)*SHOWROOM_SPACING,z=(row-1.5)*SHOWROOM_SPACING;

  // This is the exact same builder used by game.js.
  const {group,parts,flying}=buildEnemyModel(id,type,false);
  group.scale.setScalar(type.scale);
  group.position.set(x,.08,z);
  const snapshots=[];
  // Child parts never animate in the showroom, so cache their local matrices.
  group.traverse((child)=>{
    if(child===group)return;
    snapshots.push({child,position:child.position.clone(),quaternion:child.quaternion.clone(),scale:child.scale.clone(),opacity:child.material?.opacity,visible:child.visible});
    child.updateMatrix();child.matrixAutoUpdate=false;
  });
  scene.add(group);
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  const nameLabel=createEnemyNameLabel(id,type.name,bounds.max.y,x,z);
  exhibits.push({id,type,typeId:id,group,parts,flying,nameLabel,speed:type.speed,seed:0,snapshots,skillPoseSnapshots:snapshots,home:new THREE.Vector3(x,.08,z),anchor:new THREE.Vector3(x,.08,z),groupScale:group.scale.clone(),baseScale:group.scale.clone(),animationBaseY:0,deathBaseY:.08,deathBaseRotationY:0,deathDuration:getEnemyDefinition(id).animations.deathDuration||1.2});
}

let renderFrame=0;
function render(){
  if(renderFrame)return;
  renderFrame=requestAnimationFrame(()=>{renderFrame=0;renderer.render(scene,camera);});
}

function applyPreviewEffectDensity(){
  if(!previewAbilityEffect?.mesh?.children?.length)return;
  const density=SHOWROOM_GRAPHICS[activeShowroomGraphics].effectDensity;
  const visibleCount=Math.max(1,Math.ceil(previewAbilityEffect.mesh.children.length*density));
  previewAbilityEffect.mesh.children.forEach((child,index)=>{child.visible=index<visibleCount;});
}

function applyShowroomGraphics(presetName){
  if(!SHOWROOM_GRAPHICS[presetName])return;
  activeShowroomGraphics=presetName;
  const preset=SHOWROOM_GRAPHICS[presetName];
  renderer.setPixelRatio(showroomPixelRatio());
  renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=preset.toneMapping?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
  renderer.toneMappingExposure=preset.toneMapping?1.12:1;
  scene.fog.near=Math.min(20,preset.fogFar*.48);scene.fog.far=preset.fogFar;
  camera.far=Math.max(60,preset.fogFar+15);camera.updateProjectionMatrix();
  setEnemyModelAnisotropy(Math.min(preset.anisotropy,renderer.capabilities.getMaxAnisotropy()));
  setEnemyEffectQuality(preset.effectDensity);
  setEnemySkillEffectQuality(preset.effectDensity);
  document.body.dataset.graphics=presetName;
  applyPreviewEffectDensity();
  render();
}

function setView(position,target=new THREE.Vector3(0,1.2,0)){
  camera.position.copy(position);controls.target.copy(target);controls.update();render();
}

const filter=document.querySelector("#enemy-filter");
const allOption=document.createElement("option");
allOption.value="all";allOption.textContent="ALL ENEMIES";filter.append(allOption);
for(const exhibit of exhibits){
  const option=document.createElement("option");
  option.value=String(exhibit.id);
  option.textContent=`E${String(exhibit.id).padStart(2,"0")} - ${exhibit.type.name.toUpperCase()}`;
  filter.append(option);
}

let selectedEnemyId=0;

function restoreExhibit(exhibit){
  exhibit.anchor.copy(exhibit.home);
  exhibit.nameLabel.visible=true;
  resetExhibitPose(exhibit);
  setExhibitAnimated(exhibit,false);
}

function selectedView(exhibit){
  const targetHeight=exhibit.id===20?2.25:exhibit.id===19?1.7:Math.max(.65,exhibit.type.scale*1.05);
  const viewDistance=Math.max(7.5,exhibit.type.scale*4.8);
  setView(new THREE.Vector3(viewDistance,targetHeight+2.5,viewDistance*.72),new THREE.Vector3(0,targetHeight,0));
}

function targetLaneView(exhibit,targetDistance){
  const targetHeight=exhibit.id===20?2.25:exhibit.id===19?1.7:Math.max(.65,exhibit.type.scale*1.05);
  const sideDistance=targetDistance<4?Math.max(7.5,exhibit.type.scale*4.8):Math.max(11,exhibit.type.scale*5.2);
  setView(new THREE.Vector3(sideDistance,targetHeight+3.2,targetDistance*.5),new THREE.Vector3(0,targetHeight,targetDistance*.5));
}

function applyEnemyFilter(){
  stopAnimationPreview();
  const requested=filter.value;
  if(requested==="all"){
    selectedEnemyId=0;
    for(const exhibit of exhibits){
      restoreExhibit(exhibit);
      exhibit.group.visible=true;
    }
    setView(ALL_ENEMIES_VIEW);
    return;
  }

  selectedEnemyId=Number(requested);
  const selected=exhibits.find((exhibit)=>exhibit.id===selectedEnemyId);
  for(const exhibit of exhibits){
    exhibit.group.visible=exhibit===selected;
    exhibit.nameLabel.visible=false;
  }
  if(!selected)return;
  selected.anchor.set(0,.08,0);
  resetExhibitPose(selected);
  setExhibitAnimated(selected,true);
  showAnimationControls(selected);
}

const animationPanel=document.querySelector("#animation-controls");
const animationButtons=document.querySelector("#animation-buttons");
let previewAudioContext=null,previewAudioGain=null,previewNoiseBuffer=null;

function ensurePreviewAudio(){
  if(!previewAudioContext){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return false;
    previewAudioContext=new AudioContextClass();previewAudioGain=previewAudioContext.createGain();
    previewAudioGain.gain.value=.34;previewAudioGain.connect(previewAudioContext.destination);
  }
  if(previewAudioContext.state==="suspended")previewAudioContext.resume();
  return true;
}

function previewTone(frequency,duration=.1,volume=.08,wave="triangle",endRatio=1,delay=0,timbre={}){
  if(!ensurePreviewAudio())return;
  const now=previewAudioContext.currentTime+delay;
  const oscillator=previewAudioContext.createOscillator(),filter=previewAudioContext.createBiquadFilter(),gain=previewAudioContext.createGain();
  oscillator.type=wave;oscillator.frequency.setValueAtTime(Math.max(20,frequency),now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*endRatio),now+duration);
  filter.type=timbre.filterType||"lowpass";filter.frequency.value=timbre.filterFrequency??Math.min(4200,Math.max(280,frequency*8));filter.Q.value=timbre.q??.7;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+Math.min(duration*.35,timbre.attack??.012));gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  if(timbre.vibratoRate&&timbre.vibratoDepth){
    const lfo=previewAudioContext.createOscillator(),lfoGain=previewAudioContext.createGain();
    lfo.type=timbre.vibratoWave||"sine";lfo.frequency.value=timbre.vibratoRate;lfoGain.gain.value=timbre.vibratoDepth;
    lfo.connect(lfoGain).connect(oscillator.frequency);lfo.start(now);lfo.stop(now+duration+.03);
  }
  oscillator.connect(filter).connect(gain).connect(previewAudioGain);oscillator.start(now);oscillator.stop(now+duration+.03);
}

function previewNoise(duration=.1,volume=.05,delay=0,timbre={}){
  if(!ensurePreviewAudio())return;
  if(!previewNoiseBuffer){
    previewNoiseBuffer=previewAudioContext.createBuffer(1,previewAudioContext.sampleRate,previewAudioContext.sampleRate);
    const data=previewNoiseBuffer.getChannelData(0);for(let index=0;index<data.length;index+=1)data[index]=Math.random()*2-1;
  }
  const source=previewAudioContext.createBufferSource(),gain=previewAudioContext.createGain(),now=previewAudioContext.currentTime+delay;source.buffer=previewNoiseBuffer;
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  if(timbre.filterType||timbre.filterFrequency){
    const filter=previewAudioContext.createBiquadFilter();filter.type=timbre.filterType||"bandpass";filter.frequency.value=timbre.filterFrequency??900;filter.Q.value=timbre.q??1;
    source.connect(filter).connect(gain);
  }else source.connect(gain);
  gain.connect(previewAudioGain);source.start(now,0,duration);
}

function playPreviewEnemySound(exhibit,event){
  emitEnemySoundRecipe(exhibit.id,event,.09,{tone:previewTone,noise:previewNoise});
}

function playPreviewBurrowSound(phase){
  emitScrapBurrowRecipe(phase,.09,{tone:previewTone,noise:previewNoise});
}
let activePreview=null,animationFrame=0;

function setExhibitAnimated(exhibit,enabled){
  for(const snapshot of exhibit.snapshots){
    snapshot.child.matrixAutoUpdate=enabled;
    if(!enabled)snapshot.child.updateMatrix();
  }
}

function resetExhibitPose(exhibit){
  exhibit.group.visible=true;
  exhibit.group.position.copy(exhibit.anchor);
  exhibit.group.rotation.set(0,0,0);
  exhibit.group.scale.copy(exhibit.groupScale);
  for(const snapshot of exhibit.snapshots){
    snapshot.child.position.copy(snapshot.position);
    snapshot.child.quaternion.copy(snapshot.quaternion);
    snapshot.child.scale.copy(snapshot.scale);
    snapshot.child.visible=snapshot.visible;
    if(snapshot.child.material&&snapshot.opacity!==undefined){snapshot.child.material.opacity=snapshot.opacity;snapshot.child.material.transparent=snapshot.opacity<1;}
  }
}

function resetDummyPose(){
  trainingDummy.visible=dummyActive;
  trainingDummy.position.copy(dummyBasePosition);
  trainingDummy.rotation.copy(dummyBaseRotation);
  trainingDummy.scale.set(1,1,1);
  projectile.visible=false;
  if(previewAbilityEffect)previewAbilityEffect.mesh.visible=false;
}

function animateDummyHit(amount){
  if(!dummyActive)return;
  trainingDummy.rotation.z=Math.sin(amount*Math.PI)*-.16;
  trainingDummy.position.z=dummyBasePosition.z+Math.sin(amount*Math.PI)*.12;
}

function setActiveAnimationButton(action){
  animationButtons.querySelectorAll("button[data-action]").forEach((button)=>button.classList.toggle("active",button.dataset.action===action));
}

function startAnimationPreview(exhibit,action){
  ensurePreviewAudio();
  configureDummyForAction(exhibit,action);
  resetExhibitPose(exhibit);resetDummyPose();setExhibitAnimated(exhibit,true);
  activePreview={exhibit,action,startedAt:performance.now(),audioCycle:-1,audioStep:-1,audioTriggered:false,audioBurrowStep:-1,audioEmerge:false};
  setActiveAnimationButton(action);
  if(!animationFrame)animationFrame=requestAnimationFrame(updateAnimationPreview);
}

function stopAnimationPreview(hideControls=true){
  if(animationFrame)cancelAnimationFrame(animationFrame);
  animationFrame=0;
  if(activePreview){resetExhibitPose(activePreview.exhibit);setExhibitAnimated(activePreview.exhibit,false);}
  if(trainingDummy.visible)resetDummyPose();
  activePreview=null;setActiveAnimationButton("");
  projectile.visible=false;clearPreviewAbilityVisual();dummyActive=false;trainingDummy.visible=false;
  if(hideControls)animationPanel.hidden=true;
  render();
}

function configureDummyForAction(exhibit,action){
  const definition=getEnemyDefinition(exhibit.id);
  const targetedSkill=action==="skill"&&definition.skill.targetDistance>0;
  dummyActive=action==="attack"||targetedSkill;
  if(!dummyActive){
    trainingDummy.visible=false;projectile.visible=false;selectedView(exhibit);return;
  }
  const closeAttack=action==="attack"&&exhibit.type.range<=2;
  const targetDistance=closeAttack?Math.max(1.35,exhibit.type.scale*1.35):action==="skill"?definition.skill.targetDistance:10;
  dummyBasePosition.set(0,.08,targetDistance);
  resetDummyPose();targetLaneView(exhibit,targetDistance);
}

function showAnimationControls(exhibit){
  const definition=getEnemyDefinition(exhibit.id);
  animationButtons.replaceChildren();
  const actions=[
    ["idle","IDLE",""],
    ["walk",exhibit.flying?"HOVER":"WALK",""],
    ["attack","ATTACK",""],
    ["skill",definition.skill.name.toUpperCase(),"skill"],
    ["stunned","STUNNED",""],
    ["death","DEATH",""],
  ];
  for(const [action,label,className] of actions){
    const button=document.createElement("button");button.type="button";button.dataset.action=action;button.textContent=label;
    if(className)button.classList.add(className);
    button.addEventListener("click",()=>startAnimationPreview(exhibit,action));animationButtons.append(button);
  }
  const resetButton=document.createElement("button");resetButton.type="button";resetButton.className="reset";resetButton.textContent="RESET";
  resetButton.addEventListener("click",()=>{stopAnimationPreview(false);selectedView(exhibit);});animationButtons.append(resetButton);
  animationPanel.hidden=false;startAnimationPreview(exhibit,"idle");
}

function animateSkill(exhibit,time,duration){
  const definition=getEnemyDefinition(exhibit.id);
  const p=applyEnemySkillPose(exhibit,definition,time,duration,{previewMotion:true});
  const motion=definition.animations.skillMotion;
  if(motion==="burrow"&&p>.88)animateDummyHit((p-.88)/.12);
  else if(["dash","leap"].includes(motion)&&p>.72)animateDummyHit((p-.72)/.28);
  else if(motion==="shadowDash"&&p>.7)animateDummyHit((p-.7)/.3);
  if(definition.skill.projectile&&p>=.28&&p<=.84){
    const travel=(p-.28)/.56;projectile.visible=true;projectile.material.color.setHex(exhibit.type.color);
    projectile.position.set(0,THREE.MathUtils.lerp(Math.max(.75,exhibit.type.scale),1.12,travel),THREE.MathUtils.lerp(.55,9.72,travel));
  }
  if(definition.skill.projectile&&p>.77)animateDummyHit((p-.77)/.23);
  else if(definition.skill.targetDistance>0&&p>.78)animateDummyHit((p-.78)/.22);
  animateSkillIndicator(exhibit,definition,time);
}

function clearPreviewAbilityVisual(){
  if(previewAbilityEffect)disposeAbilityVisual(scene,previewAbilityEffect);
  previewAbilityEffect=null;previewAbilityKey="";
}

function ensurePreviewAbilityVisual(key,kind,position,options){
  if(previewAbilityEffect&&previewAbilityKey!==key)clearPreviewAbilityVisual();
  if(!previewAbilityEffect){previewAbilityEffect=createAbilityVisual(scene,kind,position,options);previewAbilityKey=key;}
  applyPreviewEffectDensity();
  return previewAbilityEffect;
}

function animateSkillIndicator(exhibit,definition,time){
  const indicator=definition.skill.indicator;
  if(!indicator)return;
  if(indicator.anchor==="target")previewAbilityPosition.copy(dummyBasePosition);
  else if(definition.skill.handler==="scrapBurrow")getScrapBurrowGroundPosition(exhibit,previewAbilityPosition);
  else previewAbilityPosition.copy(exhibit.group.position);
  let kind=indicator.kind,age=time,options={...indicator,color:indicatorColor(indicator)};
  if(definition.skill.handler==="scrapBurrow")kind="scrap-burrow";
  let key=`${definition.id}:${kind}`;
  if(definition.skill.handler==="scrapBurrow"&&time>=3){
    kind="scrap-emerge";age=time-3;options={...options,kind,radius:.55,life:1.05};key=`${definition.id}:${kind}`;
  }else if(indicator.impact&&time>=indicator.life){
    kind="impact";age=time-indicator.life;options={...options,kind,life:.35};key=`${definition.id}:${kind}`;
  }
  const effect=ensurePreviewAbilityVisual(key,kind,previewAbilityPosition,options);
  effect.mesh.position.x=previewAbilityPosition.x;effect.mesh.position.z=previewAbilityPosition.z;
  seekAbilityVisual(effect,age);
  applyPreviewEffectDensity();
  if(kind==="shockwave"){
    const waveRadius=effect.radius*Math.min(1,effect.age/effect.life);
    effect.mesh.scale.set(waveRadius*2,1,waveRadius*2);
  }
}

function updatePreviewAudio(preview,totalElapsed,elapsed,cycleDuration){
  const {exhibit,action}=preview;
  const cycle=Math.floor(totalElapsed/cycleDuration);
  const progress=elapsed/cycleDuration;
  if(cycle!==preview.audioCycle){
    preview.audioCycle=cycle;
    preview.audioStep=-1;
    preview.audioTriggered=false;
    preview.audioBurrowStep=-1;
    preview.audioEmerge=false;
    if(action==="idle")playPreviewEnemySound(exhibit,"idle");
    else if(action==="stunned")playPreviewEnemySound(exhibit,"stunned");
    else if(action==="skill"&&exhibit.id===1)playPreviewBurrowSound("enter");
  }
  if(action==="walk"){
    const soundInterval=exhibit.flying?.48:.32;
    const step=Math.floor(elapsed/soundInterval);
    if(step!==preview.audioStep){
      preview.audioStep=step;
      playPreviewEnemySound(exhibit,exhibit.flying?"move":"step");
    }
  }else if(action==="attack"&&!preview.audioTriggered&&progress>=(exhibit.type.range<=2?.5:.3)){
    preview.audioTriggered=true;
    playPreviewEnemySound(exhibit,"attack");
  }else if(action==="skill"){
    if(exhibit.id===1){
      const burrowPhase=getScrapBurrowPhase(elapsed);
      const burrowStep=burrowPhase.name==="travel"?Math.floor(burrowPhase.progress/.17):-1;
      if(burrowStep>=0&&burrowStep!==preview.audioBurrowStep){
        preview.audioBurrowStep=burrowStep;
        playPreviewBurrowSound("travel");
      }
      if(burrowPhase.name==="emerge"&&!preview.audioEmerge){
        preview.audioEmerge=true;
        playPreviewBurrowSound("emerge");
      }
    }else if(!preview.audioTriggered&&progress>=.16){
      preview.audioTriggered=true;
      playPreviewEnemySound(exhibit,exhibit.id===3?"skill":"attack");
    }
  }else if(action==="death"&&!preview.audioTriggered&&progress>=(exhibit.id===3?.01:.48)){
    preview.audioTriggered=true;
    playPreviewEnemySound(exhibit,"death");
  }
}

let previewFrameCount=0,autoQualityStartedAt=0,autoQualityFrames=0;
function updateShowroomAutoQuality(now){
  if(showroomGraphicsMode!=="auto"){autoQualityStartedAt=now;autoQualityFrames=0;return;}
  if(!autoQualityStartedAt)autoQualityStartedAt=now;
  autoQualityFrames+=1;
  const seconds=(now-autoQualityStartedAt)/1000;
  if(seconds<2)return;
  const fps=autoQualityFrames/seconds;
  const previous=showroomAutoResolution;
  if(fps<48)showroomAutoResolution=Math.max(.7,showroomAutoResolution-.08);
  else if(fps>58)showroomAutoResolution=Math.min(1,showroomAutoResolution+.05);
  if(Math.abs(previous-showroomAutoResolution)>.001){renderer.setPixelRatio(showroomPixelRatio());renderer.setSize(innerWidth,innerHeight);}
  autoQualityStartedAt=now;autoQualityFrames=0;
}

function updateAnimationPreview(now){
  animationFrame=0;if(!activePreview)return;
  updateShowroomAutoQuality(now);
  const {exhibit,action}=activePreview;
  const totalElapsed=(now-activePreview.startedAt)/1000;
  const animation=getEnemyDefinition(exhibit.id).animations;
  const cycleDuration=action==="idle"?animation.idleDuration:action==="walk"?animation.locomotionDuration:action==="attack"?animation.attackDuration:action==="skill"?animation.skillDuration:action==="stunned"?animation.stunnedDuration:exhibit.deathDuration+(animation.vanishDuration||0);
  const elapsed=totalElapsed%cycleDuration;
  previewFrameCount+=1;
  const animationStride=SHOWROOM_GRAPHICS[activeShowroomGraphics].animationStride;
  const updatePose=animationStride===1||previewFrameCount%animationStride===0;
  updatePreviewAudio(activePreview,totalElapsed,elapsed,cycleDuration);
  if(!updatePose){animationFrame=requestAnimationFrame(updateAnimationPreview);return;}
  resetExhibitPose(exhibit);resetDummyPose();
  if(action==="idle")applyEnemyPose(exhibit,{elapsed});
  else if(action==="walk")applyEnemyPose(exhibit,{elapsed,movementAmount:1,walkPhase:elapsed*exhibit.speed*4.2});
  else if(action==="attack"){
    const progress=elapsed/cycleDuration;
    const attackStrength=exhibit.id===1
      ?progress<.16?THREE.MathUtils.smootherstep(progress,0,.16)*.34:progress<.38?THREE.MathUtils.lerp(.34,1,THREE.MathUtils.smootherstep(progress,.16,.38)):1-THREE.MathUtils.smootherstep(progress,.38,.72)
      :progress<.2?0:Math.exp(-(elapsed-cycleDuration*.2)*4.5);
    applyEnemyPose(exhibit,{elapsed,attackStrength});
    if(exhibit.type.range<=2&&progress>(exhibit.id===1?.36:.58))animateDummyHit((progress-(exhibit.id===1?.36:.58))/(exhibit.id===1?.64:.42));
    else if(exhibit.type.range>2){
      if(progress>=.28&&progress<=.82){const travel=(progress-.28)/.54;projectile.visible=true;projectile.material.color.setHex(0x63fff0);projectile.position.set(0,THREE.MathUtils.lerp(Math.max(.7,exhibit.type.scale),1.12,travel),THREE.MathUtils.lerp(.55,9.72,travel));}
      if(progress>.74)animateDummyHit((progress-.74)/.26);
    }
  }
  else if(action==="skill")animateSkill(exhibit,elapsed,cycleDuration);
  else if(action==="stunned")applyEnemyPose(exhibit,{elapsed,stunnedProgress:elapsed/cycleDuration});
  else if(action==="death")applyEnemyDeathPose(exhibit,elapsed);
  render();animationFrame=requestAnimationFrame(updateAnimationPreview);
}

const backgroundToggle=document.querySelector("#background-toggle");
const showroomGraphicsSelect=document.querySelector("#showroom-graphics");
let whiteEnvironment=false;

function updateEnvironment(){
  if(whiteEnvironment){
    scene.background.setHex(0xf2f4f3);scene.fog.color.setHex(0xf2f4f3);
    floor.material.color.setHex(0xdfe3e1);
    ambient.color.setHex(0xffffff);ambient.groundColor.setHex(0xaeb8b4);ambient.intensity=2.15;
    key.color.setHex(0xffffff);key.intensity=2.65;
    rim.color.setHex(0x7895aa);rim.intensity=1.15;
  }else{
    scene.background.setHex(0x030a10);scene.fog.color.setHex(0x030a10);
    floor.material.color.setHex(0x070c10);
    ambient.color.setHex(0x8de8df);ambient.groundColor.setHex(0x071018);ambient.intensity=1.75;
    key.color.setHex(0xb9fff6);key.intensity=3.2;
    rim.color.setHex(0x397dff);rim.intensity=2;
  }
  backgroundToggle.textContent=whiteEnvironment?"ENV: WHITE":"ENV: BLACK";
  backgroundToggle.setAttribute("aria-pressed",String(whiteEnvironment));
  render();
}

const movementKeys=new Set();
const moveForward=new THREE.Vector3();
const moveRight=new THREE.Vector3();
const moveDelta=new THREE.Vector3();
const validMovementKeys=new Set(["w","a","s","d","q","e"]);
let movementFrame=0,lastMovementTime=0;

function updateFreeMovement(time){
  const hasMovement=[...validMovementKeys].some((keyName)=>movementKeys.has(keyName));
  if(!hasMovement){movementFrame=0;lastMovementTime=0;return;}
  const deltaSeconds=Math.min(.05,lastMovementTime?(time-lastMovementTime)/1000:0);
  lastMovementTime=time;
  camera.getWorldDirection(moveForward);moveForward.y=0;
  if(moveForward.lengthSq()<.001)moveForward.set(0,0,-1);else moveForward.normalize();
  moveRight.crossVectors(moveForward,camera.up).normalize();
  moveDelta.set(0,0,0);
  if(movementKeys.has("w"))moveDelta.add(moveForward);
  if(movementKeys.has("s"))moveDelta.sub(moveForward);
  if(movementKeys.has("d"))moveDelta.add(moveRight);
  if(movementKeys.has("a"))moveDelta.sub(moveRight);
  if(movementKeys.has("q"))moveDelta.y+=1;
  if(movementKeys.has("e"))moveDelta.y-=1;
  if(moveDelta.lengthSq()>0){
    moveDelta.normalize().multiplyScalar((movementKeys.has("shift")?11:6)*deltaSeconds);
    camera.position.add(moveDelta);controls.target.add(moveDelta);controls.update();render();
  }
  movementFrame=requestAnimationFrame(updateFreeMovement);
}

addEventListener("keydown",(event)=>{
  const tag=event.target?.tagName;
  if(tag==="SELECT"||tag==="INPUT"||tag==="TEXTAREA")return;
  const keyName=event.key.toLowerCase();
  if(keyName==="shift")movementKeys.add("shift");
  if(!validMovementKeys.has(keyName))return;
  event.preventDefault();movementKeys.add(keyName);
  if(!movementFrame)movementFrame=requestAnimationFrame(updateFreeMovement);
});
addEventListener("keyup",(event)=>{movementKeys.delete(event.key.toLowerCase());});
addEventListener("blur",()=>movementKeys.clear());

controls.addEventListener("change",render);
document.querySelector("#show-enemy").addEventListener("click",applyEnemyFilter);
backgroundToggle.addEventListener("click",()=>{whiteEnvironment=!whiteEnvironment;updateEnvironment();});
showroomGraphicsSelect.value=showroomGraphicsMode;
showroomGraphicsSelect.addEventListener("change",()=>{
  const requested=showroomGraphicsSelect.value;
  showroomGraphicsMode=requested==="auto"||SHOWROOM_GRAPHICS[requested]?requested:"auto";
  showroomAutoResolution=1;autoQualityStartedAt=0;autoQualityFrames=0;
  try{localStorage.setItem(GRAPHICS_STORAGE_KEY,showroomGraphicsMode);}catch{}
  applyShowroomGraphics(showroomGraphicsMode==="auto"?detectShowroomGraphics():showroomGraphicsMode);
});
document.querySelector("#front-view").addEventListener("click",()=>{
  const selected=exhibits.find((exhibit)=>exhibit.id===selectedEnemyId);
  if(selected){if(dummyActive)targetLaneView(selected,dummyBasePosition.z);else selectedView(selected);}else setView(ALL_ENEMIES_FRONT_VIEW);
});
document.querySelector("#top-view").addEventListener("click",()=>{
  const midpoint=dummyActive?dummyBasePosition.z*.5:0;
  setView(new THREE.Vector3(0,25,midpoint+.01),new THREE.Vector3(0,0,midpoint));
});
document.querySelector("#reset-view").addEventListener("click",()=>{
  const selected=exhibits.find((exhibit)=>exhibit.id===selectedEnemyId);
  if(selected){if(dummyActive)targetLaneView(selected,dummyBasePosition.z);else selectedView(selected);}else setView(ALL_ENEMIES_VIEW);
});
addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(showroomPixelRatio());renderer.setSize(innerWidth,innerHeight);render();
});

applyShowroomGraphics(activeShowroomGraphics);
setView(ALL_ENEMIES_VIEW);

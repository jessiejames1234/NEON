import * as THREE from "three";
import {ENEMY_TYPES,buildEnemyModel} from "./enemy/index.js";

const stage=document.querySelector("#auth-enemy-stage");
const authGate=document.querySelector("#auth-gate");

if(stage&&authGate){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  stage.prepend(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(39,1,.1,20);
  camera.position.set(0,2.5,8.8);
  camera.lookAt(0,2.3,0);
  scene.add(new THREE.HemisphereLight(0xb8ffff,0x03121c,2.05));
  const key=new THREE.DirectionalLight(0x8ffff1,2.5);key.position.set(-3,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x267dff,2.1);rim.position.set(4,2,-2);scene.add(rim);

  const sentries=[];
  const pointer=new THREE.Vector2();
  const eyeWorldPoint=new THREE.Vector3();
  const projectedEyePoint=new THREE.Vector3();
  const passwordIds=new Set(["login-password","register-password","register-confirm-password"]);
  let focusedPassword=null;
  let frame=0,lastFrame=0;

  function redDominant(mesh){
    const color=mesh?.material?.color;
    return color&&color.r>color.g*1.35&&color.r>color.b*1.12;
  }

  function collectEyes(model){
    if(model.parts.crawlerEyes?.length)return model.parts.crawlerEyes;
    const named=model.parts.glows.filter((mesh)=>mesh.name==="head"&&redDominant(mesh));
    if(named.length)return named;
    const red=model.parts.glows.filter(redDominant);
    return red.length?red:model.parts.glows.slice(0,1);
  }

  function addPupils(eyes){
    const pupilGeometry=new THREE.CircleGeometry(.31,12);
    const glintGeometry=new THREE.CircleGeometry(.085,8);
    const pupilMaterial=new THREE.MeshBasicMaterial({color:0x020609,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const glintMaterial=new THREE.MeshBasicMaterial({color:0xcafff7,depthWrite:false});
    return eyes.map((eye)=>{
      // The pupil is parented to the real glowing eye. Its local movement is
      // therefore automatically scaled correctly for every different model.
      const pupil=new THREE.Mesh(pupilGeometry,pupilMaterial);
      pupil.position.set(0,0,.54);pupil.renderOrder=4;
      const glint=new THREE.Mesh(glintGeometry,glintMaterial);
      glint.position.set(-.12,.13,.025);glint.renderOrder=5;pupil.add(glint);
      eye.add(pupil);
      return pupil;
    });
  }

  function addSentry(typeId,x,phase){
    const model=buildEnemyModel(typeId,ENEMY_TYPES[typeId],false);
    const eyes=collectEyes(model);
    eyes.forEach((eye)=>eye.scale.multiplyScalar(1.5));
    const pupils=addPupils(eyes);
    const bounds=new THREE.Box3().setFromObject(model.group);
    const size=bounds.getSize(new THREE.Vector3());
    const scale=5.7/Math.max(size.x,size.y,size.z);
    model.group.scale.setScalar(scale);
    model.group.updateMatrixWorld(true);
    bounds.setFromObject(model.group);
    model.group.position.set(x,-bounds.min.y-.36,0);
    model.group.rotation.y=0;
    scene.add(model.group);
    sentries.push({model,eyes,pupils,phase,baseX:x,baseY:model.group.position.y,baseZ:0,stalk:0,screenGaze:new THREE.Vector2()});
  }

  addSentry(1,-4.7,.2);
  addSentry(2,0,2.1);
  addSentry(7,4.7,4.4);

  function visiblePassword(){
    const visibleForm=document.querySelector(".auth-form:not(.hidden)");
    if(!visibleForm)return null;
    if(focusedPassword&&visibleForm.contains(focusedPassword)&&focusedPassword.value)return focusedPassword;
    return [...visibleForm.querySelectorAll('input[type="password"],input[type="text"]')]
      .find((input)=>passwordIds.has(input.id)&&input.value)||null;
  }

  function targetFromElement(element){
    const rect=element.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    return new THREE.Vector2(
      THREE.MathUtils.clamp(((rect.left+rect.width*.5-stageRect.left)/Math.max(1,stageRect.width))*2-1,-1,1),
      THREE.MathUtils.clamp(-(((rect.top+rect.height*.5-stageRect.top)/Math.max(1,stageRect.height))*2-1),-1,1)
    );
  }

  function gazeFromSentry(sentry,target){
    sentry.model.group.updateMatrixWorld(true);
    eyeWorldPoint.set(0,0,0);
    sentry.eyes.forEach((eye)=>{
      eye.getWorldPosition(projectedEyePoint);
      eyeWorldPoint.add(projectedEyePoint);
    });
    if(sentry.eyes.length)eyeWorldPoint.multiplyScalar(1/sentry.eyes.length);
    projectedEyePoint.copy(eyeWorldPoint).project(camera);
    sentry.screenGaze.set(
      THREE.MathUtils.clamp((target.x-projectedEyePoint.x)*1.35,-1,1),
      THREE.MathUtils.clamp((target.y-projectedEyePoint.y)*1.35,-1,1)
    );
    return sentry.screenGaze;
  }

  function resize(){
    const rect=stage.getBoundingClientRect();
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    renderer.setSize(width,height,false);camera.aspect=width/height;
    camera.position.z=Math.max(8.8,22/camera.aspect);
    camera.lookAt(0,2.3,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }

  function animate(time){
    frame=requestAnimationFrame(animate);
    if(time-lastFrame<32)return;
    lastFrame=time;
    if(authGate.classList.contains("hidden")||document.hidden)return;
    const password=visiblePassword();
    const stalking=Boolean(password);
    const gaze=stalking?targetFromElement(password):pointer;
    const seconds=time*.001;
    sentries.forEach((sentry,index)=>{
      sentry.stalk=THREE.MathUtils.lerp(sentry.stalk,stalking?1:0,stalking?.065:.045);
      const breathing=Math.sin(seconds*1.45+sentry.phase);
      const creeping=Math.sin(seconds*2.1+sentry.phase)*.035*sentry.stalk;
      sentry.model.group.position.x=THREE.MathUtils.lerp(sentry.model.group.position.x,sentry.baseX+.42*sentry.stalk,.09);
      sentry.model.group.position.y=sentry.baseY+breathing*(.012+.018*sentry.stalk)+creeping;
      sentry.model.group.position.z=THREE.MathUtils.lerp(sentry.model.group.position.z,sentry.baseZ+.62*sentry.stalk,.075);
      const sentryGaze=gazeFromSentry(sentry,gaze);
      sentry.pupils.forEach((pupil)=>{
        const destinationX=sentryGaze.x*.19;
        const destinationY=sentryGaze.y*.14;
        pupil.position.x=THREE.MathUtils.lerp(pupil.position.x,destinationX,.28);
        pupil.position.y=THREE.MathUtils.lerp(pupil.position.y,destinationY,.28);
      });
      // Password entry pulls each complete body toward the terminal. Their
      // staggered lean keeps the approach organic instead of moving as one row.
      const focusYaw=stalking?.16+index*.025:Math.sin(seconds*.42+sentry.phase)*.018;
      sentry.model.group.rotation.y=THREE.MathUtils.lerp(sentry.model.group.rotation.y,focusYaw,.08);
      const focusLean=stalking?-.035-index*.012:Math.sin(seconds*.68+sentry.phase)*.008;
      sentry.model.group.rotation.z=THREE.MathUtils.lerp(sentry.model.group.rotation.z,focusLean,.08);
    });
    renderer.render(scene,camera);
  }

  window.addEventListener("pointermove",(event)=>{
    const rect=stage.getBoundingClientRect();
    pointer.set(
      THREE.MathUtils.clamp(((event.clientX-rect.left)/Math.max(1,rect.width))*2-1,-1,1),
      THREE.MathUtils.clamp(-(((event.clientY-rect.top)/Math.max(1,rect.height))*2-1),-1,1)
    );
  },{passive:true});
  document.addEventListener("focusin",(event)=>{if(passwordIds.has(event.target.id))focusedPassword=event.target;});
  document.addEventListener("input",(event)=>{if(passwordIds.has(event.target.id))focusedPassword=event.target;});
  new ResizeObserver(resize).observe(stage);
  resize();
  frame=requestAnimationFrame(animate);
  window.addEventListener("pagehide",()=>{cancelAnimationFrame(frame);renderer.dispose();},{once:true});
}

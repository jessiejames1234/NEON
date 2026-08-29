import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  ENEMY_TYPES, buildEnemyModel, setEnemyModelAnisotropy,
  unitBoxGeometry, unitSphereGeometry, unitCylinderGeometry, unitConeGeometry,
  unitTorusGeometry, unitCapsuleGeometry, unitDiamondGeometry,
  ENEMY_SOUND_PROFILES,emitEnemySoundRecipe,emitScrapBurrowRecipe,
  ENEMY_DEFINITIONS,getEnemyDefinition,
} from "./enemy/index.js";
import {createAbilityVisual,advanceAbilityVisual,disposeAbilityVisual,indicatorColor} from "./enemy/ability-visuals.js";
import {applyEnemyPose,applyEnemyDeathPose,applyCrawlerMalfunctionEffects,setEnemyEffectQuality} from "./enemy/animation-runtime.js";
import {applyEnemySkillPose,captureEnemySkillPose,getScrapBurrowGroundPosition,getScrapBurrowPhase} from "./enemy/skill-presentation.js";

const PLAYER = Object.freeze({ eyeHeight: 1.7, radius: 0.36, walk: 5.6, sprint: 9, jump: 7.2, maxHealth: 100 });
const ARENA_HALF = 23.5;
const MAX_WAVES = 50;
const MAGAZINE_CAPACITY = 32;
const CAPTURABLE_LIFETIME = 60;
const RELOAD_DURATION = 1.9;

const PLAYABLE_AREAS = Object.freeze([
  {minX:-ARENA_HALF,maxX:ARENA_HALF,minZ:-ARENA_HALF,maxZ:ARENA_HALF},
  {minX:-10.1,maxX:-6.4,minZ:-30.2,maxZ:-21.8},
  {minX:6.4,maxX:10.1,minZ:-30.2,maxZ:-21.8},
  {minX:-16,maxX:16,minZ:-49.5,maxZ:-29},
]);

function insidePlayableArea(x,z,radius=0){
  return PLAYABLE_AREAS.some((area)=>
    x-radius>=area.minX&&x+radius<=area.maxX&&
    z-radius>=area.minZ&&z+radius<=area.maxZ
  );
}

const gameRoot = document.querySelector("#game");
const menu = document.querySelector("#menu");
const completeScreen = document.querySelector("#complete");
const errorScreen = document.querySelector("#error");
const hud = document.querySelector("#hud");
const scoreEl = document.querySelector("#score");
const totalEl = document.querySelector("#total");
const runPointsEl = document.querySelector("#run-points");
const pointsPopupsEl = document.querySelector("#points-popups");
const statusEl = document.querySelector("#status");
const speedLines = document.querySelector("#speed-lines");
const ammoEl = document.querySelector("#ammo");
const ammoWarningEl = document.querySelector("#ammo-warning");
const crosshair = document.querySelector("#crosshair");
const enemyCountEl = document.querySelector("#enemy-count");
const healthValueEl = document.querySelector("#health-value");
const healthFillEl = document.querySelector("#health-fill");
const healthHudEl = document.querySelector(".health");
const regenStatusEl = document.querySelector("#regen-status");
const nanoShieldEl = document.querySelector(".nano-shield");
const nanoShieldValueEl = document.querySelector("#nano-shield-value");
const nanoShieldFillEl = document.querySelector("#nano-shield-fill");
const nanoShieldAlertEl = document.querySelector("#nano-shield-alert");
const damageFlashEl = document.querySelector("#damage-flash");
const nanoShieldImpactEl = document.querySelector("#nano-shield-impact");

// Fifty compact cells form a connected perimeter around the visor. Keeping
// the cells out of the central region guarantees an unobstructed sight picture.
if(nanoShieldImpactEl){
  const svgNamespace="http://www.w3.org/2000/svg";
  const addShieldPentagon=(centerX,centerY,rotation=0,scaleX=1,scaleY=1)=>{
    const points="0,-40 38,-12 24,34 -24,34 -38,-12";
    const pentagon=document.createElementNS(svgNamespace,"polygon");
    pentagon.setAttribute("points",points);
    pentagon.setAttribute("transform",`translate(${centerX} ${centerY}) rotate(${rotation}) scale(${scaleX} ${scaleY})`);
    nanoShieldImpactEl.appendChild(pentagon);
  };
  // 14 upper + 14 lower + 11 left + 11 right = exactly 50 shield cells.
  for(let cell=0;cell<14;cell+=1){
    const x=32+cell*72;
    const normalized=(x-500)/500;
    const curve=1-normalized*normalized;
    const tangent=normalized*8;
    const horizontalStretch=.94+curve*.24;
    addShieldPentagon(x,18+curve*38,tangent,horizontalStretch,.7);
    addShieldPentagon(x,582-curve*43,180-tangent,horizontalStretch,.74);
  }
  for(let cell=0;cell<11;cell+=1){
    const y=52+cell*49.6;
    const normalized=(y-300)/300;
    const curve=1-normalized*normalized;
    const tangent=normalized*7;
    const verticalStretch=.92+curve*.2;
    addShieldPentagon(18+curve*34,y,-90-tangent,.72,verticalStretch);
    addShieldPentagon(982-curve*34,y,90+tangent,.72,verticalStretch);
  }
}
const godModeIndicatorEl = document.querySelector("#god-mode-indicator");
const godModeButtonEl = document.querySelector("#god-mode-button");
const godModeStateEl = document.querySelector("#god-mode-state");
const noClipButtonEl = document.querySelector("#no-clip-button");
const noClipStateEl = document.querySelector("#no-clip-state");
const noReloadButtonEl = document.querySelector("#no-reload-button");
const noReloadStateEl = document.querySelector("#no-reload-state");
const godSpeedButtonEl = document.querySelector("#god-speed-button");
const godSpeedStateEl = document.querySelector("#god-speed-state");
const oneHitButtonEl = document.querySelector("#one-hit-button");
const oneHitStateEl = document.querySelector("#one-hit-state");
const tamedGodButtonEl = document.querySelector("#tamed-god-button");
const tamedGodStateEl = document.querySelector("#tamed-god-state");
const waveSelectEl = document.querySelector("#wave-select");
const changeWaveButtonEl = document.querySelector("#change-wave-button");
const squadPanelEl = document.querySelector("#squad-panel");
const squadListEl = document.querySelector("#squad-list");
const squadCountEl = document.querySelector("#squad-count");
const squadAttackEl = document.querySelector("#squad-attack");
const squadProtectEl = document.querySelector("#squad-protect");
const squadModeCopyEl = document.querySelector("#squad-mode-copy");
const volumeButtonEl = document.querySelector("#volume-button");
const volumeStateEl = document.querySelector("#volume-state");
const volumePercentageEl = document.querySelector("#volume-percentage");
const volumeRangeEl = document.querySelector("#volume-range");
const voiceButtonEl = document.querySelector("#voice-button");
const voiceStateEl = document.querySelector("#voice-state");
const graphicsSelectEl = document.querySelector("#graphics-select");
const graphicsEffectiveEl = document.querySelector("#graphics-effective");
const graphicsDetailsEl = document.querySelector("#graphics-details");
const performanceFpsEl = document.querySelector("#performance-fps");
const performancePingEl = document.querySelector("#performance-ping");
const performanceNetworkEl = document.querySelector("#performance-network");
const settingsFpsEl = document.querySelector("#settings-fps");
const settingsPingEl = document.querySelector("#settings-ping");
const settingsNetworkEl = document.querySelector("#settings-network");
const menuSecondaryEl = document.querySelector("#menu-secondary");
const settingsButtonEl = document.querySelector("#settings-button");
const settingsCloseButtonEl = document.querySelector("#settings-close-button");
const refreshPingButtonEl = document.querySelector("#refresh-ping-button");
const resultLabelEl = document.querySelector("#result-label");
const resultTitleEl = document.querySelector("#result-title");
const resultCopyEl = document.querySelector("#result-copy");
const restartButtonEl = document.querySelector("#restart-button");
const playButtonLabelEl = document.querySelector("#play-button-label");
const mobileControlsEl = document.querySelector("#mobile-controls");
const mobileLookZoneEl = document.querySelector("#mobile-look-zone");
const mobileJoystickEl = document.querySelector("#mobile-joystick");
const mobileJoystickThumbEl = document.querySelector("#mobile-joystick-thumb");
const mobileFireEl = document.querySelector("#mobile-fire");
const mobileReloadEl = document.querySelector("#mobile-reload");
const mobileInteractEl = document.querySelector("#mobile-interact");
const mobileJumpEl = document.querySelector("#mobile-jump");
const mobileAttackEl = document.querySelector("#mobile-attack");
const mobileProtectEl = document.querySelector("#mobile-protect");
const mobilePauseEl = document.querySelector("#mobile-pause");
const mobileWorldUiEl = document.querySelector("#mobile-world-ui");
const mobileCaptureMarkerEl = document.querySelector("#mobile-capture-marker");
const mobileTrashMarkerEl = document.querySelector("#mobile-trash-marker");
const mobileCaptureTitleEl = mobileCaptureMarkerEl.querySelector("strong");
const mobileCaptureStatusEl = mobileCaptureMarkerEl.querySelector("span");
const mobileTrashTitleEl = mobileTrashMarkerEl.querySelector("strong");
const mobileTrashStatusEl = mobileTrashMarkerEl.querySelector("span");
const isMobileDevice = navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches;
const mobileLandscapeQuery = window.matchMedia("(orientation: landscape)");
document.body.classList.toggle("mobile-device", isMobileDevice);

const GRAPHICS_STORAGE_KEY="neon-outpost-graphics-v1";
const GRAPHICS_ORDER=["very-low","low","medium","high","very-high"];
const GRAPHICS_PRESETS=Object.freeze({
  "very-low":{label:"VERY LOW",pixelRatio:.5,particles:.15,anisotropy:1,cameraFar:45,skyline:.22,modelDetail:.35,animationNearStride:2,animationFarStride:4,animationFarDistance:10,visibilityInterval:.34,abilityVisualStride:2,effectDensity:.25,repairDrones:1,toneMapping:false},
  low:{label:"LOW",pixelRatio:.65,particles:.32,anisotropy:2,cameraFar:55,skyline:.45,modelDetail:.52,animationNearStride:1,animationFarStride:3,animationFarDistance:12,visibilityInterval:.25,abilityVisualStride:2,effectDensity:.45,repairDrones:2,toneMapping:false},
  medium:{label:"MEDIUM",pixelRatio:.82,particles:.58,anisotropy:4,cameraFar:68,skyline:.72,modelDetail:.72,animationNearStride:1,animationFarStride:2,animationFarDistance:16,visibilityInterval:.16,abilityVisualStride:1,effectDensity:.7,repairDrones:3,toneMapping:true},
  high:{label:"HIGH",pixelRatio:1,particles:.82,anisotropy:8,cameraFar:80,skyline:1,modelDetail:1,animationNearStride:1,animationFarStride:1,animationFarDistance:20,visibilityInterval:.1,abilityVisualStride:1,effectDensity:1,repairDrones:4,toneMapping:true},
  "very-high":{label:"VERY HIGH",pixelRatio:1.35,particles:1,anisotropy:16,cameraFar:95,skyline:1,modelDetail:1,animationNearStride:1,animationFarStride:1,animationFarDistance:24,visibilityInterval:.075,abilityVisualStride:1,effectDensity:1,repairDrones:4,toneMapping:true},
});

function readGraphicsPreference(){
  try{
    const value=localStorage.getItem(GRAPHICS_STORAGE_KEY);
    return value==="auto"||GRAPHICS_PRESETS[value]?value:"auto";
  }catch{return "auto";}
}

function detectGraphicsPreset(){
  const memory=Number(navigator.deviceMemory)||0;
  const cores=Number(navigator.hardwareConcurrency)||0;
  const displayPixels=window.innerWidth*window.innerHeight*Math.min(window.devicePixelRatio||1,2)**2;
  let score=isMobileDevice?0:2;
  if(memory){if(memory<=2)score-=2;else if(memory<=4)score-=1;else if(memory>=8)score+=1;}
  if(cores){if(cores<=2)score-=2;else if(cores<=4)score-=1;else if(cores>=8)score+=1;}
  if(displayPixels>5000000)score-=1;
  if(score<=-2)return "very-low";
  if(score<=0)return "low";
  if(score<=2)return "medium";
  if(score<=4)return "high";
  return "very-high";
}

let graphicsMode=readGraphicsPreference();
let activeGraphicsPreset=graphicsMode==="auto"?detectGraphicsPreset():graphicsMode;
let worldParticles=null;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias:!['very-low','low'].includes(activeGraphicsPreset)&&(window.devicePixelRatio||1)<=1.5,
    powerPreference:"high-performance",
  });
} catch (error) {
  console.error(error);
  errorScreen.classList.remove("hidden");
  throw error;
}

let renderScale = Math.min(window.devicePixelRatio,GRAPHICS_PRESETS[activeGraphicsPreset].pixelRatio);
renderer.setPixelRatio(renderScale);
setEnemyModelAnisotropy(Math.min(GRAPHICS_PRESETS[activeGraphicsPreset].anisotropy,renderer.capabilities.getMaxAnisotropy()));
renderer.setSize(window.innerWidth, window.innerHeight);
// Dynamic shadows multiplied every detailed enemy into another render pass.
// Baked-looking directional lighting and emissive accents keep the scene readable
// without that large GPU cost.
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
gameRoot.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071019);
scene.fog = new THREE.FogExp2(0x071019, 0.022);
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(68,24,14),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  uniforms:{topColor:{value:new THREE.Color(0x102c42)},horizonColor:{value:new THREE.Color(0x071019)},glowColor:{value:new THREE.Color(0x143d42)}},
  vertexShader:"varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader:"uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 glowColor;varying vec3 vPos;void main(){float h=clamp(normalize(vPos).y*.75+.3,0.0,1.0);vec3 c=mix(horizonColor,topColor,h);float glow=pow(max(0.0,1.0-abs(normalize(vPos).y)),7.0);gl_FragColor=vec4(c+glowColor*glow*.32,1.0);}",
}));
scene.add(skyDome);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 80);
camera.position.set(0, PLAYER.eyeHeight, 18);
scene.add(camera);
const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.75;
controls.minPolarAngle = Math.PI * 0.08;
controls.maxPolarAngle = Math.PI * 0.92;
camera.rotation.order = "YXZ";

const clock = new THREE.Clock();
let qualityTime = 0;
let qualityFrames = 0;
let qualityRecoverySamples=0;
let qualityLowSamples=0;
let renderFrame=0;
const keys = new Set();
const obstacles = [];
const shootableSurfaces = [];
const enemies = [];
const enemyHitMeshes = [];
const enemyProjectiles = [];
const abilityEffects = [];
const abilityHitMeshes = [];
const tamedEnemies = [];
const nanoDrops = [];
const tamingMachines = [];
const machineHitMeshes = [];
let trashStation = null;
let carriedEnemy = null;
let carryTutorialSeen = false;
let carryTutorialActive = false;
let carryTutorialRefreshAt = 0;
const carryTutorialLines = [];
const velocity = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
let canJump = true;
let missionComplete = false;
let gameOver = false;
let playerHealth = PLAYER.maxHealth;
let deathAnimationActive = false;
let deathAnimationStartedAt = 0;
let deathStartY = PLAYER.eyeHeight;
const deathStartRotation = new THREE.Euler();
const NANO_SHIELD_MAX = 500;
const NANO_CELL_REPAIR = NANO_SHIELD_MAX * .15;
let nanoShield = NANO_SHIELD_MAX;
let nanoWarningState = "stable";
let lastPlayerDamageAt = Number.NEGATIVE_INFINITY;
let ammo = MAGAZINE_CAPACITY;
let reloading = false;
let reloadStartedAt = 0;
let reloadSoundStage = 0;
let lastShot = 0;
let firingHeld = false;
let mobilePlaying = false;
const mobileMove = { x: 0, z: 0 };
let joystickPointerId = null;
let lookPointerId = null;
let lastLookX = 0;
let lastLookY = 0;
let recoil = 0;
let slowedUntil = 0;
let sprintDisabledUntil = 0;
let squadMode = "attack";
let squadUiAt = 0;
let godMode = false;
let noClipMode = false;
let noReloadMode = false;
let godSpeedMode = false;
let oneHitMode = false;
let tamedGodMode = false;
let currentWave = 0;
let runPoints = 0;
let runKills = 0;
let waveActive = false;
let spawnQueue = [];
let spawnCooldown = 0;
let nextWaveTimer;
let waveStartedAt = 0;
let nextWaveAt = 0;
const spawnPoints = [
  [-18,-21],[0,-21],[18,-21],
  [-21,-10],[-21,0],[-21,10],[21,-10],[21,0],[21,10],
  [-18,21],[-9,21],[0,21],[9,21],[18,21],
];
const spawnGates=[];

const hemisphereLight=new THREE.HemisphereLight(0x8ecbd3,0x10151a,1.35);
scene.add(hemisphereLight);

const moonLight = new THREE.DirectionalLight(0xd5faff, 2.4);
moonLight.position.set(-14, 24, 8);
scene.add(moonLight);
const moonDisc=new THREE.Mesh(new THREE.CircleGeometry(3.2,32),new THREE.MeshBasicMaterial({color:0xc7f5ff,transparent:true,opacity:.72,depthWrite:false}));
moonDisc.position.set(-24,25,-52);moonDisc.lookAt(camera.position);scene.add(moonDisc);
const moonHalo=new THREE.Mesh(new THREE.RingGeometry(3.8,6.2,40),new THREE.MeshBasicMaterial({color:0x65d9f0,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));
moonHalo.position.copy(moonDisc.position);moonHalo.quaternion.copy(moonDisc.quaternion);scene.add(moonHalo);

const staticMaterialCache=new Map();
const boxGeometryCache=new Map();

function material(color, roughness = 0.75, metalness = 0.12) {
  const key=`${color}:${roughness}:${metalness}`;
  if(!staticMaterialCache.has(key))staticMaterialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
  return staticMaterialCache.get(key);
}

function boxGeometry(width,height,depth){
  const key=`${width}:${height}:${depth}`;
  if(!boxGeometryCache.has(key))boxGeometryCache.set(key,new THREE.BoxGeometry(width,height,depth));
  return boxGeometryCache.get(key);
}

function addBox(x, y, z, width, height, depth, color = 0x26343a, collidable = true) {
  const mesh = new THREE.Mesh(boxGeometry(width,height,depth), material(color));
  mesh.position.set(x, y, z);
  scene.add(mesh);
  shootableSurfaces.push(mesh);
  if (collidable) {
    obstacles.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height: y + height / 2,
    });
  }
  return mesh;
}

function addStrip(x, z, width, depth, color = 0x43f4d0) {
  const key=`strip:${color}`;
  if(!staticMaterialCache.has(key))staticMaterialCache.set(key,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
  const strip = new THREE.Mesh(boxGeometry(width,.025,depth),staticMaterialCache.get(key));
  strip.position.set(x, 0.026, z);
  scene.add(strip);
}

function createWorldPanel(text,color=0x43f4d0){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;
  const context=canvas.getContext("2d");context.fillStyle="rgba(3,10,15,.92)";context.fillRect(3,3,506,90);
  context.strokeStyle=`#${color.toString(16).padStart(6,"0")}`;context.lineWidth=5;context.strokeRect(5.5,5.5,501,85);
  context.fillStyle="#e9ffff";context.font="800 27px monospace";context.textAlign="center";context.fillText(text,256,58);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
}

function createInteractionHighlight(group,color){
  const highlightMaterial=new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.38,depthTest:false,depthWrite:false,
    side:THREE.BackSide,blending:THREE.AdditiveBlending,
  });
  const sourceMeshes=[];
  group.traverse((part)=>{if(part.isMesh&&!part.userData.interactionHighlight)sourceMeshes.push(part);});
  const shells=sourceMeshes.map((part)=>{
    const shell=new THREE.Mesh(part.geometry,highlightMaterial);
    shell.scale.setScalar(1.075);shell.visible=false;shell.renderOrder=48;shell.frustumCulled=true;
    shell.userData.interactionHighlight=true;shell.raycast=()=>{};part.add(shell);
    return shell;
  });
  return {material:highlightMaterial,shells};
}

function createArenaFloorTexture() {
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
  const context=canvas.getContext("2d");
  context.fillStyle="#152329";context.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=64){
    for(let x=0;x<512;x+=64){
      const alternate=((x+y)/64)%2;
      context.fillStyle=alternate?"#182a30":"#132229";context.fillRect(x+2,y+2,60,60);
      context.strokeStyle="rgba(115,175,180,.18)";context.lineWidth=2;context.strokeRect(x+3,y+3,58,58);
      context.fillStyle="rgba(3,10,14,.6)";
      for(const [bx,by] of [[9,9],[53,9],[9,53],[53,53]]){context.beginPath();context.arc(x+bx,y+by,2.2,0,Math.PI*2);context.fill();}
    }
  }
  context.strokeStyle="rgba(67,244,208,.22)";context.lineWidth=5;
  context.beginPath();context.moveTo(256,0);context.lineTo(256,512);context.moveTo(0,256);context.lineTo(512,256);context.stroke();
  context.strokeStyle="rgba(255,139,61,.3)";context.lineWidth=3;context.setLineDash([18,12]);
  context.strokeRect(96,96,320,320);context.setLineDash([]);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return texture;
}

// Ground and navigation markings.
const groundMaterial=material(0xffffff,.84,.12);groundMaterial.map=createArenaFloorTexture();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50),groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
shootableSurfaces.push(ground);

const grid = new THREE.GridHelper(50, 50, 0x32605c, 0x23383a);
grid.position.y = 0.012;
grid.material.opacity = 0.32;
grid.material.transparent = true;
scene.add(grid);

addStrip(0, 19.5, 7, 0.08);
addStrip(0, -19.5, 7, 0.08);
addStrip(-19.5, 0, 0.08, 7);
addStrip(19.5, 0, 0.08, 7);

// Four readable movement lanes and a central command seal.
for(const offset of [-12,-6,6,12]){
  addStrip(offset,0,.045,43,0x275f69);
  addStrip(0,offset,43,.045,0x275f69);
}
const commandSeal=new THREE.Group();commandSeal.position.y=.035;scene.add(commandSeal);
for(const radius of [2.2,3.3,4.5]){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,5,48),new THREE.MeshBasicMaterial({color:radius===3.3?0xff8b3d:0x43f4d0,transparent:true,opacity:.55}));
  ring.rotation.x=Math.PI/2;commandSeal.add(ring);
}
for(let arm=0;arm<8;arm+=1){const angle=arm*Math.PI/4;addStrip(Math.sin(angle)*3.7,Math.cos(angle)*3.7,.08,1.25,arm%2?0x43f4d0:0xff8b3d);}

// Perimeter walls. The north wall has two usable transit openings.
addBox(-17.5, 2.5, -25, 15, 5, 1, 0x1e3035);
addBox(0, 2.5, -25, 13, 5, 1, 0x1e3035);
addBox(17.5, 2.5, -25, 15, 5, 1, 0x1e3035);
addBox(0, 2.5, 25, 50, 5, 1, 0x1e3035);
addBox(-25, 2.5, 0, 1, 5, 50, 0x1e3035);
addBox(25, 2.5, 0, 1, 5, 50, 0x1e3035);

// Industrial cover and structures.
addBox(-10, 1.4, 10, 5.5, 2.8, 3.2, 0x35464b);
addBox(10, 1.2, 11, 3.2, 2.4, 5.5, 0x39494d);
addBox(-12, 2.25, -8, 3, 4.5, 7, 0x293b41);
addBox(11, 1.75, -10, 7, 3.5, 3, 0x304248);
addBox(0, 1.1, -2, 3.4, 2.2, 7, 0x3a484b);
addBox(-4.8, .75, 3.8, 2.6, 1.5, 2.6, 0x48554f);
addBox(5.4, .9, 4.5, 3.2, 1.8, 2.5, 0x415058);
addBox(18, 1.5, 1, 2.4, 3, 7, 0x283a40);

// Layered armor, service rails and readable district landmarks around the original cover.
const coverDetails=[
  [-10,2.95,10,4.8,.12,2.55,0x43f4d0],[10,2.5,11,2.5,.12,4.7,0xff8b3d],
  [-12,4.62,-8,2.4,.12,6.1,0x43f4d0],[11,3.62,-10,6.1,.12,2.35,0xff8b3d],
  [0,2.3,-2,2.7,.12,6.15,0x43f4d0],[18,3.08,1,1.75,.12,6.15,0xff8b3d],
];
for(const detail of coverDetails)addBox(...detail,false);
for(const [x,z,color] of [[-16,15,0x43f4d0],[15,15,0x4e8fff],[-16,-15,0xff8b3d],[15,-15,0xff3f68]]){
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.55,.18,8),material(0x1d3038,.5,.55));base.position.set(x,.1,z);base.receiveShadow=true;scene.add(base);
  const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),new THREE.MeshBasicMaterial({color}));beacon.position.set(x,1.35,z);scene.add(beacon);
  addBox(x,.7,z,.22,1.2,.22,0x233a43,false);
  for(let spoke=0;spoke<4;spoke+=1){const angle=spoke*Math.PI/2;addStrip(x+Math.sin(angle)*1.2,z+Math.cos(angle)*1.2,.07,1.1,color);}
}

// A playable auxiliary map linked to the main outpost by two ground-level bridges.
const auxiliaryFloor=new THREE.Mesh(new THREE.PlaneGeometry(32,20.5),groundMaterial);
auxiliaryFloor.rotation.x=-Math.PI/2;auxiliaryFloor.position.set(0,.002,-39.25);
auxiliaryFloor.receiveShadow=true;scene.add(auxiliaryFloor);shootableSurfaces.push(auxiliaryFloor);
const auxiliaryGrid=new THREE.GridHelper(32,32,0x4e8fff,0x203d49);
auxiliaryGrid.position.set(0,.014,-39.25);auxiliaryGrid.scale.z=.64;
auxiliaryGrid.material.opacity=.3;auxiliaryGrid.material.transparent=true;scene.add(auxiliaryGrid);

for(const [bridgeX,bridgeColor] of [[-8.25,0x43f4d0],[8.25,0x4e8fff]]){
  const deck=addBox(bridgeX,-.08,-26.1,3.7,.18,8.4,0x263b43,false);
  deck.material.roughness=.48;deck.material.metalness=.58;
  // Reinforced undercarriage and segmented deck panels.
  addBox(bridgeX-.92,-.28,-26.1,.18,.28,8.2,0x15272f,false);
  addBox(bridgeX+.92,-.28,-26.1,.18,.28,8.2,0x15272f,false);
  for(let z=-29.35;z<=-22.85;z+=1.3){
    addBox(bridgeX,-.16,z,3.55,.12,.16,0x3b525b,false);
    addBox(bridgeX,.025,z,2.72,.025,.045,bridgeColor,false);
  }
  addBox(bridgeX-.5,.03,-26.1,.055,.035,7.8,bridgeColor,false);
  addBox(bridgeX+.5,.03,-26.1,.055,.035,7.8,bridgeColor,false);
  for(const railX of [bridgeX-1.78,bridgeX+1.78]){
    addBox(railX,.45,-26.1,.14,.9,8.4,0x263d47,false);
    addBox(railX,.94,-26.1,.2,.14,8.4,bridgeColor,false);
    addBox(railX,.5,-26.1,.08,.08,8.15,0x65909a,false);
    for(let z=-29.5;z<=-22.7;z+=1.7)addBox(railX,.7,z,.2,1.35,.2,0x314d58,false);
  }
  // Low-profile entrance pylons make the route readable without blocking the walkway.
  for(const endZ of [-22.45,-29.72]){
    for(const side of [-1,1]){
      const postX=bridgeX+side*1.72;
      addBox(postX,1.15,endZ,.28,2.3,.28,0x203944,false);
      const lampBulb=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshBasicMaterial({color:bridgeColor}));
      lampBulb.position.set(postX,2.25,endZ);scene.add(lampBulb);
    }
  }
}

// Auxiliary platform perimeter, leaving two bridge-aligned entrances in its south wall.
addBox(-16.5,2.5,-39.25,1,5,21.5,0x182e38);
addBox(16.5,2.5,-39.25,1,5,21.5,0x182e38);
addBox(0,2.5,-50,33,5,1,0x182e38);
addBox(-13.25,2.5,-29.55,6.5,5,1,0x182e38);
addBox(0,2.5,-29.55,12.8,5,1,0x182e38);
addBox(13.25,2.5,-29.55,6.5,5,1,0x182e38);

// Open machine bay, power relays and readable lanes on the second map.
for(const x of [-12,0,12])addStrip(x,-39.25,.055,17.5,0x275f69);
for(const z of [-34,-40,-46])addStrip(0,z,27,.055,z===-40?0xff8b3d:0x315f75);
for(const [x,z,color] of [[-13.5,-47,0x43f4d0],[13.5,-47,0x4e8fff],[-13.5,-32,0xff8b3d],[13.5,-32,0x43f4d0]]){
  addBox(x,1.5,z,.5,3,.5,0x28424c,false);
  const bulb=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color}));bulb.position.set(x,3,z);scene.add(bulb);
}

// Five physical squad slots: captured units are processed behind glass, one per machine.
function createRepairDroneModel(bodyMaterial,metalMaterial,darkMaterial,glowMaterial){
  const group=new THREE.Group();
  group.scale.setScalar(.7);

  // Compact armored fuselage with a layered medical-tool silhouette.
  const body=new THREE.Mesh(unitBoxGeometry,bodyMaterial);body.scale.set(.42,.18,.34);group.add(body);
  const canopy=new THREE.Mesh(unitBoxGeometry,darkMaterial);canopy.scale.set(.25,.075,.22);canopy.position.set(0,.14,-.015);group.add(canopy);
  const armor=new THREE.Mesh(unitBoxGeometry,metalMaterial);armor.scale.set(.3,.035,.25);armor.position.set(0,.205,-.015);group.add(armor);
  const spine=new THREE.Mesh(unitBoxGeometry,darkMaterial);spine.scale.set(.1,.055,.4);spine.position.set(0,.06,-.02);group.add(spine);

  const crossbar=new THREE.Mesh(unitBoxGeometry,metalMaterial);crossbar.scale.set(.84,.045,.075);crossbar.position.y=.035;group.add(crossbar);
  const rotors=[];
  for(const side of [-1,1]){
    const nacelle=new THREE.Mesh(unitBoxGeometry,bodyMaterial);nacelle.scale.set(.17,.12,.25);nacelle.position.set(side*.4,.045,0);group.add(nacelle);
    const rotorAssembly=new THREE.Group();rotorAssembly.position.set(side*.4,.19,0);group.add(rotorAssembly);rotors.push(rotorAssembly);
    const rotor=new THREE.Mesh(unitTorusGeometry,glowMaterial);rotor.scale.setScalar(.115);rotor.rotation.x=Math.PI/2;rotorAssembly.add(rotor);
    const bladeA=new THREE.Mesh(unitBoxGeometry,metalMaterial);bladeA.scale.set(.19,.012,.026);rotorAssembly.add(bladeA);
    const bladeB=bladeA.clone();bladeB.rotation.y=Math.PI/2;rotorAssembly.add(bladeB);
    const rotorHub=new THREE.Mesh(unitSphereGeometry,glowMaterial);rotorHub.scale.setScalar(.036);rotorAssembly.add(rotorHub);
    const guard=new THREE.Mesh(unitTorusGeometry,darkMaterial);guard.scale.setScalar(.145);guard.position.set(side*.4,.185,0);guard.rotation.x=Math.PI/2;group.add(guard);
    const stabilizer=new THREE.Mesh(unitBoxGeometry,metalMaterial);stabilizer.scale.set(.055,.055,.21);stabilizer.position.set(side*.5,.015,-.13);stabilizer.rotation.y=side*.28;group.add(stabilizer);
  }

  // Forward sensor face and articulated-looking repair prongs.
  const visor=new THREE.Mesh(unitBoxGeometry,darkMaterial);visor.scale.set(.29,.085,.055);visor.position.set(0,.015,.325);group.add(visor);
  const eyes=[];
  for(const x of [-.085,0,.085]){
    const lens=new THREE.Mesh(unitSphereGeometry,glowMaterial);lens.scale.set(.035,.035,.018);lens.position.set(x,.02,.36);group.add(lens);eyes.push(lens);
  }
  const eye=eyes[1];
  for(const side of [-1,1]){
    const prong=new THREE.Mesh(unitBoxGeometry,metalMaterial);prong.scale.set(.055,.045,.25);prong.position.set(side*.13,-.09,.35);prong.rotation.x=-.18;prong.rotation.y=-side*.12;group.add(prong);
    const tip=new THREE.Mesh(unitConeGeometry,glowMaterial);tip.scale.set(.045,.1,.045);tip.position.set(side*.16,-.13,.49);tip.rotation.x=Math.PI/2;group.add(tip);
  }
  const emitter=new THREE.Mesh(unitCylinderGeometry,glowMaterial);emitter.scale.set(.075,.035,.075);emitter.position.set(0,-.18,.035);group.add(emitter);
  const emitterGuard=new THREE.Mesh(unitTorusGeometry,darkMaterial);emitterGuard.scale.setScalar(.105);emitterGuard.position.set(0,-.185,.035);emitterGuard.rotation.x=Math.PI/2;group.add(emitterGuard);

  group.userData.repairDroneParts={rotors,eye,eyes,emitter};
  return group;
}

// Shared repair-station shell assets keep all five machines detailed without
// allocating a separate material and geometry set for every chamber.
const repairStationArmor=material(0x18313a,.3,.88);
const repairStationEdge=material(0x456773,.22,.92);
const repairStationDark=material(0x071116,.5,.76);
const repairStationCopper=material(0x9b6127,.3,.82);
const repairStationGlow=new THREE.MeshBasicMaterial({color:0x43f4d0,transparent:true,opacity:.82});
const repairStationDimGlow=new THREE.MeshBasicMaterial({color:0x1c9d91,transparent:true,opacity:.42});
const repairStationBaseGeometry=new RoundedBoxGeometry(3.82,.18,2.48,3,.06);
const repairStationFasciaGeometry=new RoundedBoxGeometry(3.36,.34,.22,2,.045);
const repairStationBeamGeometry=new RoundedBoxGeometry(3.44,.24,.28,2,.04);
const repairStationBraceGeometry=new RoundedBoxGeometry(.18,3.12,.18,2,.035);
const repairStationPodGeometry=new RoundedBoxGeometry(.34,1.36,.46,2,.055);
const repairStationPanelGeometry=new RoundedBoxGeometry(1.72,.72,.1,2,.035);
const repairStationCollarGeometry=new THREE.TorusGeometry(1.31,.075,8,28);
const repairStationCollarMaterial=material(0x294b55,.25,.9);

for(let slot=0;slot<5;slot+=1){
  const machine=new THREE.Group();machine.position.set(-10+slot*5,0,-47);scene.add(machine);
  const baseMat=material(0x1c3039,.42,.72);
  const lowerPlinth=new THREE.Mesh(repairStationBaseGeometry,repairStationDark);lowerPlinth.position.y=.09;lowerPlinth.receiveShadow=true;machine.add(lowerPlinth);
  const base=new THREE.Mesh(new THREE.BoxGeometry(3.5,.35,2.2),baseMat);base.position.y=.18;base.receiveShadow=true;machine.add(base);shootableSurfaces.push(base);
  const frontFascia=new THREE.Mesh(repairStationFasciaGeometry,repairStationArmor);frontFascia.position.set(0,.35,1.12);machine.add(frontFascia);
  for(const x of [-1.22,-.72,.72,1.22]){
    const vent=new THREE.Mesh(unitBoxGeometry,repairStationGlow);vent.scale.set(.26,.045,.018);vent.position.set(x,.35,1.238);machine.add(vent);
  }
  const back=new THREE.Mesh(new THREE.BoxGeometry(3.25,3.25,.35),material(0x243d47,.38,.68));back.position.set(0,1.8,-.92);machine.add(back);shootableSurfaces.push(back);
  for(const x of [-1.48,1.48]){
    const pillar=new THREE.Mesh(new THREE.BoxGeometry(.22,3.15,.22),material(0x314d58,.34,.7));pillar.position.set(x,1.72,0);machine.add(pillar);
  }
  // Reinforced exoskeleton, overhead gantry, and hydraulic service columns.
  for(const x of [-1.52,1.52])for(const z of [-.77,.77]){
    const brace=new THREE.Mesh(repairStationBraceGeometry,repairStationEdge);brace.position.set(x,1.72,z);machine.add(brace);
    const foot=new THREE.Mesh(unitBoxGeometry,repairStationCopper);foot.scale.set(.32,.13,.38);foot.position.set(x,.36,z);machine.add(foot);
  }
  const crownFront=new THREE.Mesh(repairStationBeamGeometry,repairStationEdge);crownFront.position.set(0,3.22,.78);machine.add(crownFront);
  const crownRear=new THREE.Mesh(repairStationBeamGeometry,repairStationArmor);crownRear.position.set(0,3.22,-.78);machine.add(crownRear);
  for(const side of [-1,1]){
    const powerPod=new THREE.Mesh(repairStationPodGeometry,repairStationArmor);powerPod.position.set(side*1.53,1.64,-.47);machine.add(powerPod);
    const pistonCase=new THREE.Mesh(unitCylinderGeometry,repairStationDark);pistonCase.scale.set(.12,.62,.12);pistonCase.position.set(side*1.53,1.52,.47);machine.add(pistonCase);
    const pistonRod=new THREE.Mesh(unitCylinderGeometry,repairStationCopper);pistonRod.scale.set(.052,.51,.052);pistonRod.position.set(side*1.53,1.54,.47);machine.add(pistonRod);
    const podLight=new THREE.Mesh(unitBoxGeometry,repairStationDimGlow);podLight.scale.set(.045,.42,.245);podLight.position.set(side*1.708,1.68,-.47);machine.add(podLight);
  }
  const glassMaterial=new THREE.MeshStandardMaterial({color:0x6fdbef,emissive:0x07151a,emissiveIntensity:.08,roughness:.22,metalness:.08,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(1.28,1.28,2.85,20,1,true),glassMaterial);glass.position.set(0,1.65,0);machine.add(glass);
  for(const y of [.3,3.08]){
    const collar=new THREE.Mesh(repairStationCollarGeometry,repairStationCollarMaterial);collar.rotation.x=Math.PI/2;collar.position.y=y;machine.add(collar);
  }
  // Rear diagnostic console and animated-looking energy bus details.
  const diagnosticPanel=new THREE.Mesh(repairStationPanelGeometry,repairStationDark);diagnosticPanel.position.set(0,1.76,-.73);machine.add(diagnosticPanel);
  for(let line=0;line<3;line+=1){
    const trace=new THREE.Mesh(unitBoxGeometry,line===1?repairStationGlow:repairStationDimGlow);trace.scale.set(.58-line*.09,.035,.018);trace.position.set(-.18+line*.09,1.98-line*.22,-.665);machine.add(trace);
  }
  for(const x of [-.68,.68]){
    const dial=new THREE.Mesh(unitCylinderGeometry,repairStationCopper);dial.scale.set(.065,.026,.065);dial.rotation.x=Math.PI/2;dial.position.set(x,1.52,-.66);machine.add(dial);
  }
  // Compact ceiling hub; the actual repair tools deploy from the hidden side bays.
  const ceilingHub=new THREE.Mesh(unitCylinderGeometry,repairStationArmor);ceilingHub.scale.set(.31,.1,.31);ceilingHub.position.set(0,2.99,0);machine.add(ceilingHub);
  const ringMaterial=new THREE.MeshBasicMaterial({color:0x43f4d0,transparent:true,opacity:.2});
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.12,1.38,24),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.38;machine.add(ring);
  const buttonMaterial=new THREE.MeshBasicMaterial({color:0x641b26});
  const removeButton=new THREE.Mesh(new THREE.BoxGeometry(.48,.48,.12),buttonMaterial);removeButton.position.set(1.18,2.75,.98);removeButton.userData.machineSlot=slot;machine.add(removeButton);machineHitMeshes.push(removeButton);
  const slashA=new THREE.Mesh(new THREE.BoxGeometry(.31,.055,.025),new THREE.MeshBasicMaterial({color:0xff6272}));slashA.position.copy(removeButton.position);slashA.position.z+=.07;slashA.rotation.z=.78;machine.add(slashA);
  const slashB=slashA.clone();slashB.rotation.z=-.78;machine.add(slashB);
  const slotLight=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:0x43f4d0,transparent:true,opacity:.3}));slotLight.position.set(0,2.5,.3);machine.add(slotLight);
  // The scanners stay in the chamber, while the two articulated tools retract
  // into armored side bays whenever the five-second taming cycle is inactive.
  const repairRig=new THREE.Group();repairRig.visible=true;machine.add(repairRig);
  const repairArmRig=new THREE.Group();repairArmRig.visible=false;repairRig.add(repairArmRig);
  const repairArms=[],repairHatches=[];
  const repairMetal=material(0x415b66,.26,.9),repairDark=material(0x101a20,.42,.78);
  const repairCopper=material(0xa96c2d,.25,.88),repairArmor=material(0x284a55,.24,.92);
  const repairGlow=new THREE.MeshBasicMaterial({color:0x72f6ff,transparent:true,opacity:.9});
  for(const side of [-1,1]){
    const bay=new THREE.Group();bay.position.set(side*1.29,2.38,-.48);repairRig.add(bay);
    const recess=new THREE.Mesh(new RoundedBoxGeometry(.62,1.22,.24,2,.055),repairDark);bay.add(recess);
    const bayFrame=new THREE.Mesh(new THREE.TorusGeometry(.39,.045,6,4),repairMetal);bayFrame.scale.y=1.45;bayFrame.rotation.z=Math.PI/4;bayFrame.position.z=.14;bay.add(bayFrame);
    const upperHatch=new THREE.Mesh(new RoundedBoxGeometry(.55,.48,.1,2,.035),repairArmor);upperHatch.position.set(0,.27,.2);bay.add(upperHatch);
    const lowerHatch=new THREE.Mesh(new RoundedBoxGeometry(.55,.48,.1,2,.035),repairArmor);lowerHatch.position.set(0,-.27,.2);bay.add(lowerHatch);
    const hatchSeam=new THREE.Mesh(unitBoxGeometry,repairGlow.clone());hatchSeam.scale.set(.21,.018,.012);hatchSeam.position.set(0,0,.26);bay.add(hatchSeam);
    repairHatches.push({bay,upperHatch,lowerHatch,hatchSeam});

    const pivot=new THREE.Group();pivot.position.set(side*1.31,2.38,-.34);repairArmRig.add(pivot);
    const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.32,12),repairDark);shoulder.rotation.x=Math.PI/2;pivot.add(shoulder);
    const shoulderRing=new THREE.Mesh(new THREE.TorusGeometry(.225,.035,7,14),repairGlow.clone());shoulderRing.position.z=.17;pivot.add(shoulderRing);
    const upper=new THREE.Mesh(new RoundedBoxGeometry(1.05,.2,.22,2,.045),repairMetal);upper.position.x=-side*.49;pivot.add(upper);
    const upperArmor=new THREE.Mesh(new RoundedBoxGeometry(.64,.26,.12,2,.035),repairArmor);upperArmor.position.set(-side*.42,.08,.08);pivot.add(upperArmor);
    const upperPiston=new THREE.Mesh(unitCylinderGeometry,repairCopper);upperPiston.scale.set(.045,.36,.045);upperPiston.rotation.z=Math.PI/2;upperPiston.position.set(-side*.48,-.13,.03);pivot.add(upperPiston);
    const elbow=new THREE.Group();elbow.position.x=-side*.98;pivot.add(elbow);
    const joint=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),repairDark);elbow.add(joint);
    const jointRing=new THREE.Mesh(new THREE.TorusGeometry(.185,.03,6,14),repairCopper);jointRing.position.z=.12;elbow.add(jointRing);
    const lower=new THREE.Mesh(new RoundedBoxGeometry(.19,.8,.18,2,.035),repairMetal);lower.position.y=-.38;elbow.add(lower);
    const lowerPiston=new THREE.Mesh(unitCylinderGeometry,repairCopper);lowerPiston.scale.set(.04,.29,.04);lowerPiston.position.set(side*.13,-.37,.04);elbow.add(lowerPiston);
    const wrist=new THREE.Group();wrist.position.y=-.82;elbow.add(wrist);
    const wristBody=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.25,10),repairDark);wristBody.position.y=-.08;wrist.add(wristBody);
    const emitter=new THREE.Mesh(new THREE.SphereGeometry(.105,10,7),repairGlow.clone());emitter.position.y=-.23;wrist.add(emitter);
    const prongs=[];
    for(const clawSide of [-1,1]){
      const prong=new THREE.Mesh(unitBoxGeometry,repairCopper);prong.scale.set(.045,.22,.045);prong.position.set(clawSide*.1,-.37,0);prong.rotation.z=clawSide*.24;wrist.add(prong);prongs.push(prong);
    }
    const beamMaterial=new THREE.MeshBasicMaterial({color:0x72f6ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const beam=new THREE.Mesh(unitCylinderGeometry,beamMaterial);beam.scale.set(.025,.34,.025);beam.position.y=-.58;beam.visible=false;wrist.add(beam);
    repairArms.push({side,pivot,elbow,wrist,emitter,prongs,beam,shoulderRing});
  }
  const repairScanners=[];
  for(const height of [.72,1.55,2.38]){
    const scanner=new THREE.Mesh(new THREE.TorusGeometry(1.04,.025,6,28),repairGlow.clone());
    scanner.rotation.x=Math.PI/2;scanner.position.y=height;repairRig.add(scanner);repairScanners.push(scanner);
  }
  const repairSparks=[];
  for(let sparkIndex=0;sparkIndex<8;sparkIndex+=1){
    const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:sparkIndex%2?0x43f4d0:0xffd35c,transparent:true,opacity:0}));
    spark.visible=false;repairRig.add(spark);repairSparks.push(spark);
  }
  // Four permanent drone docks: two stacked chambers on each side.
  const droneDocks=[];
  const dockFrameMaterial=material(0x263d47,.3,.86);
  const dockDarkMaterial=material(0x071015,.52,.72);
  const dockDroneMaterial=new THREE.MeshStandardMaterial({color:0x165331,emissive:0x0b5e32,emissiveIntensity:.58,roughness:.26,metalness:.82});
  const dockGlowMaterial=new THREE.MeshBasicMaterial({color:0x4dff8a});
  for(const side of [-1,1])for(let tier=0;tier<2;tier+=1){
    const dock=new THREE.Group();dock.position.set(side*1.72,.82+tier*1.12,.18);machine.add(dock);
    const backplate=new THREE.Mesh(unitBoxGeometry,dockDarkMaterial);backplate.scale.set(.64,.54,.12);backplate.position.z=-.22;dock.add(backplate);
    for(const y of [-.29,.29]){const rail=new THREE.Mesh(unitBoxGeometry,dockFrameMaterial);rail.scale.set(.72,.07,.58);rail.position.y=y;dock.add(rail);}
    for(const x of [-.36,.36]){const rail=new THREE.Mesh(unitBoxGeometry,dockFrameMaterial);rail.scale.set(.07,.58,.58);rail.position.x=x;dock.add(rail);}
    const droneModel=createRepairDroneModel(dockDroneMaterial,dockFrameMaterial,dockDarkMaterial,dockGlowMaterial);droneModel.position.set(0,0,.08);dock.add(droneModel);
    droneDocks.push({group:dock,droneModel});
  }
  const recoveryRingGreenMaterial=new THREE.MeshBasicMaterial({color:0x39ff78,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const recoveryRingYellowMaterial=new THREE.MeshBasicMaterial({color:0xffd35c,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const recoveryRingGreen=new THREE.Mesh(new THREE.TorusGeometry(1.48,.027,6,32),recoveryRingGreenMaterial);recoveryRingGreen.rotation.x=Math.PI/2;recoveryRingGreen.position.y=.43;recoveryRingGreen.visible=false;machine.add(recoveryRingGreen);
  const recoveryRingYellow=new THREE.Mesh(new THREE.TorusGeometry(1.65,.023,6,32),recoveryRingYellowMaterial);recoveryRingYellow.rotation.x=Math.PI/2;recoveryRingYellow.position.y=.45;recoveryRingYellow.visible=false;machine.add(recoveryRingYellow);
  const label=createWorldPanel(`TAMING MACHINE ${slot+1}`);label.position.set(0,3.5,.2);label.scale.set(2.7,.5,1);label.visible=!isMobileDevice;machine.add(label);
  const carryLabel=createCarryActionLabel(
    isMobileDevice?"TAP USE - INSTALL ROBOT":"PRESS E - INSTALL ROBOT",
    "TAMES AFTER 5 SECONDS",
    0x35ff82
  );
  carryLabel.position.set(0,4.15,.2);carryLabel.visible=false;machine.add(carryLabel);
  const interactionHighlight=createInteractionHighlight(machine,0x35ff82);
  const machineData={index:slot,group:machine,glass,glassMaterial,ring,ringMaterial,removeButton,buttonMaterial,slotLight,carryLabel,interactionHighlight,repairRig,repairArmRig,repairArms,repairHatches,repairScanners,repairSparks,droneDocks,recoveryRingGreen,recoveryRingYellow,recoveryRingGreenMaterial,recoveryRingYellowMaterial,processingEnemy:null,tamedEnemy:null,display:null,storedDisplay:null,readyAt:0,repairSoundAt:0,repairDeploy:0,mobileMarker:null,mobileMarkerTitle:null,mobileMarkerStatus:null,mobileRemoveButton:null};
  const mobileMarker=document.createElement("div");mobileMarker.className="mobile-world-marker mobile-machine-marker";
  const mobileCopy=document.createElement("div");
  const mobileTitle=document.createElement("strong");mobileTitle.textContent=`TAMING MACHINE ${slot+1}`;
  const mobileStatus=document.createElement("span");mobileStatus.textContent="EMPTY CHAMBER";
  const mobileRemove=document.createElement("button");mobileRemove.className="mobile-machine-remove";mobileRemove.type="button";mobileRemove.textContent="×";mobileRemove.hidden=true;
  mobileRemove.setAttribute("aria-label",`Remove robot from taming machine ${slot+1}`);
  mobileCopy.append(mobileTitle,mobileStatus);mobileMarker.append(mobileCopy,mobileRemove);mobileWorldUiEl.append(mobileMarker);
  machineData.mobileMarker=mobileMarker;machineData.mobileMarkerTitle=mobileTitle;machineData.mobileMarkerStatus=mobileStatus;machineData.mobileRemoveButton=mobileRemove;
  mobileRemove.addEventListener("pointerdown",(event)=>{
    event.preventDefault();event.stopPropagation();firingHeld=false;
    if(!mobilePlaying||playerDistanceTo(machineData.group.position)>9)return;
    initAudio();removeMachineCompanion(machineData);
  });
  removeButton.userData.machine=machineData;tamingMachines.push(machineData);
  obstacles.push({minX:machine.position.x-1.72,maxX:machine.position.x+1.72,minZ:-48.2,maxZ:-46.05,height:3.5});
}

// Demolition chute for carried robots the player does not want to tame.
{
  const group=new THREE.Group();group.position.set(13,0,-39);scene.add(group);
  const armorMat=new THREE.MeshStandardMaterial({color:0x271c22,roughness:.42,metalness:.78});
  const edgeMat=new THREE.MeshStandardMaterial({color:0x53616a,roughness:.3,metalness:.9});
  const darkMat=new THREE.MeshStandardMaterial({color:0x090b0e,roughness:.6,metalness:.72});
  const redMat=new THREE.MeshBasicMaterial({color:0xff3048,transparent:true,opacity:.78});
  const hazardMat=new THREE.MeshBasicMaterial({color:0xff9b35});
  const base=new THREE.Mesh(new RoundedBoxGeometry(4.7,.38,4.15,3,.12),edgeMat);base.position.y=.2;group.add(base);shootableSurfaces.push(base);
  const body=new THREE.Mesh(new RoundedBoxGeometry(3.75,3.15,2.7,3,.14),armorMat);body.position.set(0,1.82,-.38);group.add(body);shootableSurfaces.push(body);
  const rearPlate=new THREE.Mesh(new THREE.BoxGeometry(3.35,2.7,.16),edgeMat);rearPlate.position.set(0,1.85,-1.78);group.add(rearPlate);

  // Deep intake hopper with armored frame and a recessed black crusher chamber.
  const mouth=new THREE.Mesh(new THREE.PlaneGeometry(2.72,1.65),new THREE.MeshBasicMaterial({color:0x020305,side:THREE.DoubleSide}));mouth.position.set(0,1.62,1.42);group.add(mouth);
  for(const side of [-1,1]){
    const cheek=new THREE.Mesh(new RoundedBoxGeometry(.48,2.55,.88,2,.08),edgeMat);cheek.position.set(side*1.64,1.65,1.08);cheek.rotation.z=side*.08;group.add(cheek);
    const pistonCase=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,1.65,10),darkMat);pistonCase.position.set(side*2.02,1.75,.15);group.add(pistonCase);
    const pistonRod=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1.22,8),new THREE.MeshBasicMaterial({color:0xff5669}));pistonRod.position.set(side*2.02,1.8,.5);group.add(pistonRod);
    const sideVent=new THREE.Mesh(new THREE.BoxGeometry(.13,1.15,1.05),darkMat);sideVent.position.set(side*1.94,1.65,-.55);group.add(sideVent);
    for(let vent=0;vent<4;vent+=1){const fin=new THREE.Mesh(new THREE.BoxGeometry(.06,.1,.88),edgeMat);fin.position.set(side*2.02,1.28+vent*.25,-.55);group.add(fin);}
  }
  const topBeam=new THREE.Mesh(new RoundedBoxGeometry(3.45,.5,.92,2,.08),edgeMat);topBeam.position.set(0,2.98,1.04);group.add(topBeam);
  const lowerLip=new THREE.Mesh(new RoundedBoxGeometry(3.42,.42,1.05,2,.07),edgeMat);lowerLip.position.set(0,.48,1.14);lowerLip.rotation.x=-.09;group.add(lowerLip);

  // Counter-rotating dismantling drums remain visible inside the intake.
  const crusherDrums=[];
  for(const y of [1.28,1.9]){
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,2.45,12),darkMat);drum.position.set(0,y,1.52);drum.rotation.z=Math.PI/2;group.add(drum);crusherDrums.push(drum);
    for(let tooth=0;tooth<8;tooth+=1){
      const angle=tooth/8*Math.PI*2;
      const ridge=new THREE.Mesh(new THREE.BoxGeometry(.12,2.58,.07),edgeMat);ridge.rotation.z=Math.PI/2;ridge.rotation.y=angle;drum.add(ridge);
    }
  }
  const crusherJaws=[];
  for(const [jawY,direction] of [[2.42,-1],[.82,1]]){
    const jaw=new THREE.Group();jaw.position.y=jawY;group.add(jaw);crusherJaws.push({group:jaw,baseY:jawY,direction});
    for(let tooth=0;tooth<7;tooth+=1){
      const fang=new THREE.Mesh(new THREE.ConeGeometry(.13,.38,4),edgeMat);fang.position.set(-1.14+tooth*.38,0,1.58);fang.rotation.z=direction<0?Math.PI:0;jaw.add(fang);
    }
  }

  // High-contrast hazard lip, inspection bolts and warning beacons.
  for(let stripe=0;stripe<10;stripe+=1){
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.28,.07,.16),stripe%2===0?hazardMat:darkMat);strip.position.set(-1.3+stripe*.29,.68,1.7);strip.rotation.z=-.32;group.add(strip);
  }
  for(const x of [-1.7,1.7])for(const y of [.65,2.72]){
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.045,8),edgeMat);bolt.position.set(x,y,1.55);bolt.rotation.x=Math.PI/2;group.add(bolt);
  }
  const warningLights=[];
  for(const x of [-1.25,1.25]){
    const beaconBase=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.12,10),darkMat);beaconBase.position.set(x,3.33,.5);group.add(beaconBase);
    const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.24,10),redMat.clone());beacon.position.set(x,3.5,.5);group.add(beacon);warningLights.push(beacon);
  }
  for(const x of [-.7,.7]){
    const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.8,10),edgeMat);exhaust.position.set(x,3.48,-.8);group.add(exhaust);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.22,.15,.16,10),darkMat);cap.position.set(x,3.9,-.8);group.add(cap);
  }
  const screenMaterial=new THREE.MeshBasicMaterial({color:0xff4057,transparent:true,opacity:.62});
  const terminal=new THREE.Mesh(new RoundedBoxGeometry(.72,.72,.18,2,.04),darkMat);terminal.position.set(1.78,2.45,1.32);terminal.rotation.y=-.16;group.add(terminal);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.5,.4),screenMaterial);screen.position.set(1.72,2.47,1.43);screen.rotation.y=-.16;group.add(screen);
  const core=new THREE.Mesh(new THREE.RingGeometry(.34,.52,16),redMat.clone());core.position.set(0,2,-1.81);core.rotation.y=Math.PI;group.add(core);
  const ringMaterial=new THREE.MeshBasicMaterial({color:0xff4057,transparent:true,opacity:.2});
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.85,2.15,32),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.415;group.add(ring);
  const light=new THREE.Mesh(new THREE.OctahedronGeometry(.15,0),redMat.clone());light.position.set(0,3.35,1.22);group.add(light);
  const label=createWorldPanel("ROBOT DEMOLITION STATION",0xff4057);label.position.set(0,4.35,.1);label.scale.set(3.65,.62,1);label.visible=!isMobileDevice;group.add(label);
  const carryLabel=createCarryActionLabel(
    isMobileDevice?"TAP USE - DEMOLISH ROBOT":"PRESS E - DEMOLISH ROBOT",
    "PERMANENTLY DESTROYS UNIT",
    0xff4057
  );
  carryLabel.position.set(0,5.08,.2);carryLabel.visible=false;group.add(carryLabel);
  const interactionHighlight=createInteractionHighlight(group,0xff203f);
  trashStation={group,ring,ringMaterial,light,carryLabel,interactionHighlight,crusherDrums,crusherJaws,warningLights,screenMaterial,core,activeUntil:0,demolition:null};
  obstacles.push({minX:10.65,maxX:15.35,minZ:-41.05,maxZ:-36.85,height:4});
}
const bridgeSignCanvas=document.createElement("canvas");bridgeSignCanvas.width=512;bridgeSignCanvas.height=96;
const bridgeSignContext=bridgeSignCanvas.getContext("2d");bridgeSignContext.fillStyle="rgba(3,12,18,.92)";bridgeSignContext.fillRect(0,0,512,96);
bridgeSignContext.strokeStyle="#43f4d0";bridgeSignContext.lineWidth=5;bridgeSignContext.strokeRect(3,3,506,90);
bridgeSignContext.fillStyle="#bffff3";bridgeSignContext.font="700 31px monospace";bridgeSignContext.textAlign="center";bridgeSignContext.fillText("AUXILIARY PLATFORM",256,59);
const bridgeSignTexture=new THREE.CanvasTexture(bridgeSignCanvas);bridgeSignTexture.colorSpace=THREE.SRGBColorSpace;
const bridgeSign=new THREE.Mesh(new THREE.PlaneGeometry(7.5,1.4),new THREE.MeshBasicMaterial({map:bridgeSignTexture,transparent:true,side:THREE.DoubleSide}));bridgeSign.position.set(0,4,-49.42);scene.add(bridgeSign);

// Towers, overhead crossbeams and signal lights.
for (const x of [-20, 20]) {
  for (const z of [-20, 20]) {
    addBox(x, 4, z, 1, 8, 1, 0x273b40);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(.14, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x43f4d0 })
    );
    bulb.position.set(x,7.7,z);
    scene.add(bulb);
  }
}
addBox(0, 6.5, -18, 12, .35, .35, 0x354a4e, false);
addBox(0, 6.5, 18, 12, .35, .35, 0x354a4e, false);

// Layered perimeter panels make the arena read as a fortified outpost instead of a plain box.
for(let coordinate=-20;coordinate<=20;coordinate+=5){
  for(const side of [-1,1]){
    if(side>0||Math.abs(Math.abs(coordinate)-10)>2.6)addBox(coordinate,2.4,side*24.42,4.35,3.7,.12,coordinate%10===0?0x29434a:0x22363d,false);
    addBox(side*24.42,2.4,coordinate,.12,3.7,4.35,coordinate%10===0?0x29434a:0x22363d,false);
    if(side>0||Math.abs(Math.abs(coordinate)-10)>2.6)addStrip(coordinate,side*23.82,2.5,.055,side>0?0x43f4d0:0xff8b3d);
    addStrip(side*23.82,coordinate,.055,2.5,side>0?0x4e8fff:0xff526e);
  }
}

function buildSpawnGate(point,index){
  const [x,z]=point;const edgeZ=Math.abs(z)>20;
  const group=new THREE.Group();group.position.set(x,0,z);if(!edgeZ)group.rotation.y=Math.PI/2;scene.add(group);
  const frameMaterial=material(index%2?0x2d444c:0x344d53,.38,.72);
  const gateColor=index%2?0xff8b3d:0x43f4d0;
  const portalMaterial=new THREE.MeshBasicMaterial({color:gateColor,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    const pillar=new THREE.Mesh(new RoundedBoxGeometry(.24,2.8,.42,2,.04),frameMaterial);pillar.position.set(side*1.15,1.4,0);group.add(pillar);
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.055,2.15,.035),new THREE.MeshBasicMaterial({color:gateColor}));strip.position.set(side*1.15,1.42,.24);group.add(strip);
  }
  const header=new THREE.Mesh(new RoundedBoxGeometry(2.55,.3,.5,2,.05),frameMaterial);header.position.set(0,2.72,0);group.add(header);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(1.95,2.25),portalMaterial);portal.position.set(0,1.25,.04);group.add(portal);
  const padMaterial=new THREE.MeshBasicMaterial({color:gateColor,transparent:true,opacity:.48});
  const pad=new THREE.Mesh(new THREE.RingGeometry(.7,1.08,24),padMaterial);pad.rotation.x=-Math.PI/2;pad.position.set(0,.035,edgeZ?(z>0?-.9:.9):(x>0?-.9:.9));group.add(pad);
  spawnGates.push({group,portal,pad,portalMaterial,padMaterial,flash:0,index});
}
spawnPoints.forEach(buildSpawnGate);

function updateSpawnGates(delta,elapsed){
  for(const gate of spawnGates){
    gate.flash=Math.max(0,gate.flash-delta*1.4);
    const idle=.09+Math.sin(elapsed*1.7+gate.index)*.025;
    gate.portalMaterial.opacity=idle+gate.flash*.72;
    gate.padMaterial.opacity=.35+Math.sin(elapsed*2.4+gate.index)*.1+gate.flash*.5;
    gate.pad.rotation.z+=delta*(.35+gate.flash*3);
  }
}

// Distant skyline silhouettes. Presets can hide a stable percentage of these
// cosmetic meshes without changing any collision or playable area.
const skylineDecorations=[];
for (let i = 0; i < 18; i += 1) {
  const angle = (i / 32) * Math.PI * 2;
  const radius = 37 + Math.random() * 10;
  const height = 4 + Math.random() * 14;
  skylineDecorations.push(addBox(Math.cos(angle) * radius, height / 2 - .5, Math.sin(angle) * radius,
    2 + Math.random() * 5, height, 2 + Math.random() * 5, 0x0d181e, false));
}

// Star-like dust particles.
const particleCount = 220;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i += 1) {
  let x,z,clearOfGate;
  do{
    x=(Math.random()-.5)*100;z=(Math.random()-.5)*100;
    clearOfGate=spawnPoints.every(([sx,sz])=>(x-sx)**2+(z-sz)**2>25);
  }while(!clearOfGate);
  particlePositions[i * 3]=x;
  particlePositions[i * 3 + 1]=2+Math.random()*28;
  particlePositions[i * 3 + 2]=z;
}
const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
worldParticles=new THREE.Points(particlesGeometry, new THREE.PointsMaterial({
  color: 0x8edfd5, size: .045, transparent: true, opacity: .55,
}));
scene.add(worldParticles);

function updateGraphicsReadout(fps=0){
  const preset=GRAPHICS_PRESETS[activeGraphicsPreset];
  if(graphicsEffectiveEl)graphicsEffectiveEl.textContent=graphicsMode==="auto"
    ?`AUTO // ${preset.label}`
    :preset.label;
  if(graphicsDetailsEl){
    const dust=Math.max(0,Math.round(particleCount*preset.particles));
    const fpsCopy=fps>0?` // ${Math.round(fps)} FPS`:"";
    graphicsDetailsEl.textContent=`${renderScale.toFixed(2)}X RENDER // ${dust} PARTICLES // ${preset.repairDrones} REPAIR DRONES${fpsCopy}${graphicsMode==="auto"?" // LIVE TUNING":" // MANUAL LOCK"}`;
  }
}

function applyEnemyGraphicsDetail(enemy){
  const preset=GRAPHICS_PRESETS[activeGraphicsPreset];
  const rings=enemy?.parts?.rings||[];
  const visibleRings=Math.ceil(rings.length*preset.modelDetail);
  rings.forEach((ring,index)=>{ring.visible=index<visibleRings;});
}

function applyGraphicsPreset(presetName,{resetSamples=true}={}){
  if(!GRAPHICS_PRESETS[presetName])return;
  activeGraphicsPreset=presetName;
  const preset=GRAPHICS_PRESETS[presetName];
  renderScale=Math.min(window.devicePixelRatio||1,preset.pixelRatio);
  renderer.setPixelRatio(renderScale);
  renderer.setSize(window.innerWidth,window.innerHeight);
  setEnemyModelAnisotropy(Math.min(preset.anisotropy,renderer.capabilities.getMaxAnisotropy()));
  const visibleParticles=Math.round(particleCount*preset.particles);
  worldParticles.geometry.setDrawRange(0,visibleParticles);
  worldParticles.visible=visibleParticles>0;
  camera.far=preset.cameraFar;camera.updateProjectionMatrix();
  renderer.toneMapping=preset.toneMapping?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
  renderer.toneMappingExposure=preset.toneMapping?1.15:1;
  hemisphereLight.intensity=preset.toneMapping?1.35:1.15;
  moonHalo.visible=preset.effectDensity>=.7;
  setEnemyEffectQuality(preset.effectDensity);
  const visibleSkyline=Math.ceil(skylineDecorations.length*preset.skyline);
  skylineDecorations.forEach((mesh,index)=>{mesh.visible=index<visibleSkyline;});
  enemies.forEach(applyEnemyGraphicsDetail);
  abilityEffects.forEach((effect)=>{
    if(effect.mesh.children.length<=1)return;
    const visibleChildren=Math.max(1,Math.ceil(effect.mesh.children.length*preset.effectDensity));
    effect.mesh.children.forEach((child,index)=>{child.visible=index<visibleChildren;});
  });
  document.body.dataset.graphics=activeGraphicsPreset;
  if(resetSamples){qualityTime=0;qualityFrames=0;qualityRecoverySamples=0;qualityLowSamples=0;}
  updateGraphicsReadout();
}

if(graphicsMode==="auto"&&renderer.capabilities.maxTextureSize<=4096&&GRAPHICS_ORDER.indexOf(activeGraphicsPreset)>2){
  activeGraphicsPreset="medium";
}
if(graphicsSelectEl){
  graphicsSelectEl.value=graphicsMode;
  graphicsSelectEl.addEventListener("change",()=>{
    const requested=graphicsSelectEl.value;
    graphicsMode=requested==="auto"||GRAPHICS_PRESETS[requested]?requested:"auto";
    try{localStorage.setItem(GRAPHICS_STORAGE_KEY,graphicsMode);}catch{}
    applyGraphicsPreset(graphicsMode==="auto"?detectGraphicsPreset():graphicsMode);
  });
}
applyGraphicsPreset(activeGraphicsPreset);


// Each entry is [enemy type, amount]. Low-tier pressure units remain relevant
// throughout the game while stronger control, support and siege units are added.
const WAVE_PLAN = [
  [[1,6]], [[1,6],[2,2]], [[1,5],[2,3],[3,2]], [[1,4],[2,3],[3,3]], [[1,4],[2,4],[3,3]],
  [[1,3],[2,4],[3,4],[4,1]], [[1,3],[2,3],[3,4],[4,3]], [[1,3],[2,3],[3,4],[4,4]], [[1,3],[2,3],[3,4],[4,4],[5,1]], [[1,3],[2,3],[3,4],[4,4],[5,2]],
  [[1,3],[3,3],[4,3],[5,3],[6,2]], [[1,3],[2,2],[4,3],[5,3],[6,3]], [[2,3],[3,3],[4,3],[5,3],[6,3]], [[1,2],[3,3],[5,3],[6,4],[7,3]], [[2,3],[4,3],[5,3],[6,4],[7,3]],
  [[1,3],[3,3],[5,3],[6,4],[7,4]], [[2,3],[4,3],[6,4],[7,4],[8,3]], [[1,3],[3,3],[5,3],[7,4],[8,4]], [[2,3],[4,3],[6,4],[7,4],[8,3],[9,2]], [[1,3],[3,3],[5,3],[7,3],[8,3],[9,2],[10,2]],
  [[1,3],[4,3],[6,3],[8,3],[9,3],[10,2],[11,2]], [[2,3],[3,3],[5,3],[7,3],[9,3],[10,2],[11,3]], [[1,3],[4,3],[6,3],[8,3],[10,3],[11,3],[12,2]], [[2,3],[5,3],[7,3],[9,3],[10,3],[11,3],[12,3]], [[1,3],[3,3],[6,3],[8,3],[10,3],[11,3],[12,3],[13,2]],
  [[2,3],[4,3],[7,3],[9,3],[11,4],[12,3],[13,3]], [[1,3],[5,3],[8,3],[10,3],[11,4],[12,3],[13,3]], [[2,3],[3,3],[7,3],[9,3],[11,4],[12,3],[13,3]], [[1,3],[4,3],[6,3],[8,3],[10,3],[12,3],[13,3],[14,2]], [[2,3],[5,3],[7,3],[9,3],[11,3],[12,3],[13,3],[14,3]],
  [[1,3],[4,3],[6,3],[9,3],[11,3],[13,3],[14,3],[15,2]], [[2,3],[5,3],[7,3],[10,3],[12,3],[13,3],[14,3],[15,3]], [[1,3],[6,3],[8,3],[11,3],[13,3],[14,3],[15,3],[16,2]], [[2,3],[4,3],[7,3],[9,3],[12,3],[14,3],[15,3],[16,3]], [[1,3],[5,3],[8,3],[10,3],[13,3],[15,3],[16,3]],
  [[2,3],[7,3],[9,3],[12,3],[15,3],[16,3],[17,2]], [[1,3],[6,3],[8,3],[11,3],[15,3],[16,3],[17,3]], [[2,3],[7,3],[10,3],[12,3],[15,3],[16,3],[17,3]], [[1,3],[6,3],[9,3],[11,3],[16,3],[17,3],[18,2]], [[2,3],[7,3],[10,3],[12,3],[15,3],[17,3],[18,3]],
  [[1,4],[4,3],[7,3],[10,3],[12,3],[14,3],[16,3],[18,2]], [[2,4],[5,3],[6,3],[9,3],[11,3],[13,3],[17,3],[18,2]], [[1,3],[3,3],[7,3],[8,3],[10,2],[12,3],[14,3],[16,3],[18,3]], [[2,3],[4,3],[5,2],[6,3],[9,3],[11,3],[13,3],[15,3],[17,3],[18,2]], [[1,3],[3,3],[7,3],[10,3],[12,3],[14,3],[16,3],[18,3],[19,1]],
  [[2,3],[4,3],[8,3],[9,2],[11,3],[13,3],[17,3],[18,3],[19,2]], [[1,3],[5,3],[7,3],[10,3],[12,3],[16,3],[17,3],[18,3],[19,2]], [[2,3],[3,3],[6,3],[8,3],[9,2],[11,3],[14,3],[17,3],[18,3],[19,2]], [[1,3],[4,3],[7,3],[10,3],[12,3],[14,3],[16,3],[17,3],[18,3],[19,3]], [[20,1],[1,3],[3,3],[6,3],[8,3],[12,3],[14,3],[16,3],[17,3],[18,3],[19,2]],
];

totalEl.textContent = String(MAX_WAVES);

const enemyBodyGeometry = new THREE.BoxGeometry(.72, 1.15, .58);
const enemyHeadGeometry = new THREE.BoxGeometry(.52, .42, .48);
const enemyEyeGeometry = new THREE.SphereGeometry(.085, 8, 6);
const enemyShieldGeometry = new THREE.BoxGeometry(.95, 1.25, .1);
const miniRepairDroneBodyMaterial=new THREE.MeshStandardMaterial({color:0x164b2d,emissive:0x0c6a38,emissiveIntensity:.72,roughness:.28,metalness:.82});
const miniRepairDroneMetalMaterial=new THREE.MeshStandardMaterial({color:0x74d99a,roughness:.2,metalness:.92});
const miniRepairDroneDarkMaterial=new THREE.MeshStandardMaterial({color:0x06110c,emissive:0x062416,emissiveIntensity:.35,roughness:.36,metalness:.88});
const miniRepairDroneGlowMaterial=new THREE.MeshBasicMaterial({color:0x4dff8a,transparent:true,opacity:.95});
const repairDroneUp=new THREE.Vector3(0,1,0),repairDroneBeamDirection=new THREE.Vector3(),repairDroneTarget=new THREE.Vector3();
const repairDroneCurveA=new THREE.Vector3(),repairDroneCurveC=new THREE.Vector3();
const repairDroneAnchor=new THREE.Vector3(),repairDroneOutward=new THREE.Vector3(),repairDroneRaycaster=new THREE.Raycaster();
const repairDroneModelBounds=new THREE.Box3(),repairDronePartBounds=new THREE.Box3(),repairDroneBoundsCenter=new THREE.Vector3(),repairDroneBoundsSize=new THREE.Vector3();
const enemyFloorBounds=new THREE.Box3(),enemyFloorMeshBounds=new THREE.Box3();

function keepEnemyAboveArenaFloor(enemy,clearance=.012){
  if(!enemy?.group||!enemy.repairSurfaceMeshes?.length)return;
  enemy.group.updateMatrixWorld(true);enemyFloorBounds.makeEmpty();
  for(const mesh of enemy.repairSurfaceMeshes){
    if(!mesh.visible||!mesh.geometry)continue;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    if(!mesh.geometry.boundingBox)continue;
    enemyFloorMeshBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    enemyFloorBounds.union(enemyFloorMeshBounds);
  }
  if(Number.isFinite(enemyFloorBounds.min.y)&&enemyFloorBounds.min.y<clearance)enemy.group.position.y+=clearance-enemyFloorBounds.min.y;
}

function enemyRepairAnchorPosition(enemy,index,target=repairDroneAnchor){
  const anchors=enemy.parts?.repairAnchors;
  if(anchors?.length){anchors[index%anchors.length].getWorldPosition(target);return target;}
  return target.set(enemy.group.position.x,enemy.group.position.y+Math.max(.45,enemy.type.scale*.65),enemy.group.position.z);
}

function enemyRandomRepairSectionPosition(enemy,droneIndex,cycleIndex,target=repairDroneAnchor){
  const surfaces=enemy.repairSurfaceMeshes;
  if(!surfaces?.length)return enemyRepairAnchorPosition(enemy,droneIndex,target);
  // A stable hash changes only when a new repair route begins. This avoids
  // flicker while distributing the four lasers across different real meshes.
  const hash=Math.abs(Math.sin((cycleIndex+1)*91.733+(droneIndex+1)*37.719+(enemy.seed||0)*11.17));
  const meshIndex=Math.min(surfaces.length-1,Math.floor(hash*surfaces.length));
  surfaces[meshIndex].getWorldPosition(target);
  return target;
}

function measureRepairDroneOrbit(enemy){
  const repairKey=enemy.tamedRepairStartedAt??-1;
  if(enemy.repairDroneOrbitMetrics?.repairKey===repairKey)return enemy.repairDroneOrbitMetrics;
  enemy.group.updateMatrixWorld(true);
  repairDroneModelBounds.makeEmpty();
  for(const mesh of enemy.repairSurfaceMeshes||[]){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    repairDronePartBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    repairDroneModelBounds.union(repairDronePartBounds);
  }
  if(repairDroneModelBounds.isEmpty()){
    repairDroneBoundsCenter.set(enemy.group.position.x,enemy.group.position.y+Math.max(.45,enemy.type.scale*.65),enemy.group.position.z);
    repairDroneBoundsSize.set(enemy.type.scale*1.4,enemy.type.scale,enemy.type.scale*1.4);
  }else{
    repairDroneModelBounds.getCenter(repairDroneBoundsCenter);
    repairDroneModelBounds.getSize(repairDroneBoundsSize);
  }
  const bodyRadius=Math.max(repairDroneBoundsSize.x,repairDroneBoundsSize.z)*.5;
  const clearance=THREE.MathUtils.clamp(.38+bodyRadius*.14,.46,.9);
  enemy.repairDroneOrbitMetrics={
    repairKey,
    center:repairDroneBoundsCenter.clone(),
    radius:Math.max(.9,bodyRadius+clearance),
    minRadius:Math.max(.75,bodyRadius+clearance*.68),
    minY:Math.max(.34,repairDroneModelBounds.isEmpty()?repairDroneBoundsCenter.y-.1:repairDroneModelBounds.min.y+.18),
    maxY:Math.max(.8,repairDroneModelBounds.isEmpty()?repairDroneBoundsCenter.y+.65:repairDroneModelBounds.max.y+clearance*.72),
  };
  return enemy.repairDroneOrbitMetrics;
}

function enemyRepairSurfacePosition(enemy,dronePosition,anchorPosition,target=repairDroneTarget){
  repairDroneBeamDirection.subVectors(anchorPosition,dronePosition);
  const distance=repairDroneBeamDirection.length();
  if(distance>.001&&enemy.repairSurfaceMeshes?.length){
    repairDroneRaycaster.set(dronePosition,repairDroneBeamDirection.multiplyScalar(1/distance));
    repairDroneRaycaster.near=.02;repairDroneRaycaster.far=distance+.45;
    const hit=repairDroneRaycaster.intersectObjects(enemy.repairSurfaceMeshes,false)[0];
    if(hit){target.copy(hit.point);return target;}
  }
  return target.copy(anchorPosition);
}

function buildRepairDroneRoute(start,end){
  const startCell=nearestWalkableCell(worldToNav(start.x),worldToNav(start.z));
  const endCell=nearestWalkableCell(worldToNav(end.x),worldToNav(end.z));
  const direct={points:[start.clone(),end.clone()],cumulative:[0,Math.hypot(end.x-start.x,end.z-start.z)]};direct.totalLength=direct.cumulative[1];
  if(!startCell||!endCell)return direct;
  const parents=new Int32Array(NAV_SIZE*NAV_SIZE);parents.fill(-1);
  const queue=new Int32Array(NAV_SIZE*NAV_SIZE);let head=0,tail=0;
  const startIndex=navIndex(startCell.x,startCell.z),endIndex=navIndex(endCell.x,endCell.z);
  queue[tail++]=startIndex;parents[startIndex]=startIndex;
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(head<tail&&parents[endIndex]===-1){
    const current=queue[head++],cx=current%NAV_SIZE,cz=Math.floor(current/NAV_SIZE);
    for(const [dx,dz] of directions){
      const nx=cx+dx,nz=cz+dz;if(nx<0||nz<0||nx>=NAV_SIZE||nz>=NAV_SIZE)continue;
      const next=navIndex(nx,nz);if(!navWalkable[next]||parents[next]!==-1)continue;
      if(dx!==0&&dz!==0&&(!navWalkable[navIndex(cx+dx,cz)]||!navWalkable[navIndex(cx,cz+dz)]))continue;
      parents[next]=current;queue[tail++]=next;
    }
  }
  if(parents[endIndex]===-1)return direct;
  const cells=[];let current=endIndex;
  while(current!==startIndex){cells.push(current);current=parents[current];}cells.push(startIndex);cells.reverse();
  const points=[start.clone()];
  let previousDx=null,previousDz=null;
  for(let index=1;index<cells.length;index+=1){
    const previous=cells[index-1],cell=cells[index];
    const dx=cell%NAV_SIZE-previous%NAV_SIZE,dz=Math.floor(cell/NAV_SIZE)-Math.floor(previous/NAV_SIZE);
    if(previousDx!==null&&(dx!==previousDx||dz!==previousDz)){
      points.push(new THREE.Vector3(navToWorld(previous%NAV_SIZE),0,navToWorld(Math.floor(previous/NAV_SIZE))));
    }
    previousDx=dx;previousDz=dz;
  }
  if(cells.length>1){const last=cells[cells.length-1];points.push(new THREE.Vector3(navToWorld(last%NAV_SIZE),0,navToWorld(Math.floor(last/NAV_SIZE))));}
  points.push(end.clone());
  const cumulative=[0];
  for(let index=1;index<points.length;index+=1)cumulative.push(cumulative[index-1]+Math.hypot(points[index].x-points[index-1].x,points[index].z-points[index-1].z));
  return {points,cumulative,totalLength:Math.max(.001,cumulative[cumulative.length-1])};
}

function setRepairDroneRoutePosition(output,start,end,route,t){
  const travel=THREE.MathUtils.smootherstep(t,0,1),distance=route.totalLength*travel;
  let segment=1;while(segment<route.cumulative.length-1&&route.cumulative[segment]<distance)segment+=1;
  const segmentStart=route.cumulative[segment-1],segmentLength=Math.max(.001,route.cumulative[segment]-segmentStart),segmentProgress=(distance-segmentStart)/segmentLength;
  output.copy(route.points[segment-1]).lerp(route.points[segment],segmentProgress);
  output.y=THREE.MathUtils.lerp(start.y,end.y,travel);
  return output;
}

function steerRepairDroneAlongFlight(drone,delta,roll=0){
  repairDroneCurveC.subVectors(drone.group.position,drone.previousFlightPosition);
  if(repairDroneCurveC.lengthSq()>.000001){
    const targetYaw=Math.atan2(repairDroneCurveC.x,repairDroneCurveC.z);
    const yawDifference=Math.atan2(Math.sin(targetYaw-drone.group.rotation.y),Math.cos(targetYaw-drone.group.rotation.y));
    drone.group.rotation.y+=yawDifference*Math.min(1,delta*9);
  }
  drone.group.rotation.z=THREE.MathUtils.lerp(drone.group.rotation.z,roll,Math.min(1,delta*8));
  drone.previousFlightPosition.copy(drone.group.position);
}

function pulseRepairDroneLights(drone,pulse=1){
  drone.eyes?.forEach((lens,lensIndex)=>{
    const lensPulse=pulse*(lensIndex===1?1.12:.92);
    lens.scale.set(.035*lensPulse,.035*lensPulse,.018*lensPulse);
  });
  if(drone.emitter)drone.emitter.scale.set(.075*pulse,.035,.075*pulse);
}

const hostileArrowCanvas=document.createElement("canvas");hostileArrowCanvas.width=256;hostileArrowCanvas.height=256;
const hostileArrowContext=hostileArrowCanvas.getContext("2d");
hostileArrowContext.shadowColor="#ff243f";hostileArrowContext.shadowBlur=20;hostileArrowContext.fillStyle="#ff3048";
hostileArrowContext.fillRect(108,22,40,94);
hostileArrowContext.beginPath();hostileArrowContext.moveTo(48,104);hostileArrowContext.lineTo(208,104);hostileArrowContext.lineTo(128,220);hostileArrowContext.closePath();hostileArrowContext.fill();
hostileArrowContext.shadowBlur=0;hostileArrowContext.fillStyle="#fff0f2";hostileArrowContext.font="900 18px monospace";hostileArrowContext.textAlign="center";hostileArrowContext.fillText("HOSTILE",128,85);
const hostileArrowTexture=new THREE.CanvasTexture(hostileArrowCanvas);hostileArrowTexture.colorSpace=THREE.SRGBColorSpace;

// Lightweight first-person weapon built from simple geometry.
const gun = new THREE.Group();
gun.position.set(.48, -.4, -.78);
camera.add(gun);

const carryRig=new THREE.Group();
carryRig.position.set(-.4,-.36,-.82);carryRig.rotation.set(-.08,.12,0);carryRig.visible=false;camera.add(carryRig);
const carryGlove=new THREE.Mesh(new THREE.BoxGeometry(.18,.16,.32),material(0x17242c,.5,.55));
carryGlove.position.set(0,-.06,.08);carryGlove.rotation.x=-.28;carryRig.add(carryGlove);
const carryPalmGlow=new THREE.Mesh(new THREE.BoxGeometry(.12,.035,.19),new THREE.MeshBasicMaterial({color:0x43f4d0}));
carryPalmGlow.position.set(0,.035,-.02);carryRig.add(carryPalmGlow);
const carryField=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),new THREE.MeshBasicMaterial({color:0x2587ff,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
carryField.position.set(0,.15,-.08);carryField.scale.set(.55,.7,.55);carryRig.add(carryField);
const carryFieldRing=new THREE.Mesh(new THREE.TorusGeometry(.36,.018,6,24),new THREE.MeshBasicMaterial({color:0x70baff,transparent:true,opacity:.82,depthWrite:false}));
carryFieldRing.position.copy(carryField.position);carryFieldRing.scale.setScalar(.62);carryFieldRing.rotation.x=Math.PI/2;carryRig.add(carryFieldRing);

const gunDark = new THREE.MeshStandardMaterial({ color: 0x11191d, roughness: .42, metalness: .72 });
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x33454a, roughness: .3, metalness: .82 });
const gunGlow = new THREE.MeshBasicMaterial({ color: 0x43f4d0 });
const gunArmor = new THREE.MeshStandardMaterial({color:0x172832,roughness:.3,metalness:.84});
const gunEdge = new THREE.MeshStandardMaterial({color:0x68818a,roughness:.23,metalness:.92});
const gunOrange = new THREE.MeshBasicMaterial({color:0xff8b3d});

const receiver = new THREE.Mesh(new THREE.BoxGeometry(.19, .17, .52), gunDark);
receiver.position.z = -.08;
receiver.scale.set(1.3,1.16,1);
gun.add(receiver);

const upper = new THREE.Mesh(new THREE.BoxGeometry(.13, .08, .6), gunMetal);
upper.position.set(0, .1, -.13);
gun.add(upper);

const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .44, 10), gunMetal);
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0, .04, -.55);
gun.add(barrel);

const grip = new THREE.Mesh(new THREE.BoxGeometry(.13, .3, .15), gunDark);
grip.position.set(0, -.2, .06);
grip.rotation.x = -.18;
gun.add(grip);

const gunMagazine = new THREE.Group();
gunMagazine.position.set(0,-.16,-.015);gunMagazine.rotation.x=.08;gun.add(gunMagazine);
const magazineBody=new THREE.Mesh(new THREE.BoxGeometry(.15,.25,.16),gunDark);gunMagazine.add(magazineBody);
const magazineRib=new THREE.Mesh(new THREE.BoxGeometry(.158,.035,.17),gunMetal);magazineRib.position.y=-.075;gunMagazine.add(magazineRib);
const magazineCell=new THREE.Mesh(new THREE.BoxGeometry(.025,.13,.1),gunGlow);magazineCell.position.set(.088,.025,0);gunMagazine.add(magazineCell);

const chargingHandle=new THREE.Mesh(new THREE.BoxGeometry(.07,.055,.16),gunMetal);
chargingHandle.position.set(.13,.12,.04);gun.add(chargingHandle);

// The support arm is attached to the camera instead of the rifle so it remains
// clearly visible while the weapon rotates during a reload.
const reloadHand=new THREE.Group();reloadHand.visible=false;camera.add(reloadHand);
const reloadForearm=new THREE.Mesh(new THREE.BoxGeometry(.19,.42,.2),gunDark);reloadForearm.position.set(-.04,-.2,.12);reloadForearm.rotation.z=-.2;reloadHand.add(reloadForearm);
const reloadWrist=new THREE.Mesh(new THREE.CylinderGeometry(.115,.1,.13,8),gunMetal);reloadWrist.position.set(0,.035,.02);reloadHand.add(reloadWrist);
const reloadGlove=new THREE.Mesh(new THREE.BoxGeometry(.2,.15,.3),gunDark);reloadGlove.position.y=.12;reloadGlove.rotation.x=-.12;reloadHand.add(reloadGlove);
const reloadKnuckle=new THREE.Mesh(new THREE.BoxGeometry(.18,.045,.23),gunMetal);reloadKnuckle.position.set(0,.215,-.01);reloadHand.add(reloadKnuckle);
for(let finger=0;finger<4;finger+=1){
  const digit=new THREE.Mesh(new THREE.BoxGeometry(.038,.055,.19),gunDark);digit.position.set(-.067+finger*.045,.13,-.2);digit.rotation.x=-.28;reloadHand.add(digit);
}
const reloadWristGlow=new THREE.Mesh(new THREE.BoxGeometry(.205,.035,.1),gunGlow);reloadWristGlow.position.set(0,-.02,.1);reloadHand.add(reloadWristGlow);

const energyStrip = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .36), gunGlow);
energyStrip.position.set(.1, .08, -.1);
gun.add(energyStrip);

// Layered pulse-rifle shell and rear power housing.
const rifleShell=new THREE.Mesh(new RoundedBoxGeometry(.31,.24,.67,3,.055),gunArmor);rifleShell.position.set(0,.015,-.08);gun.add(rifleShell);
const rearHousing=new THREE.Mesh(new RoundedBoxGeometry(.29,.19,.3,3,.045),gunDark);rearHousing.position.set(0,.005,.34);rearHousing.rotation.x=-.04;gun.add(rearHousing);
const rearCap=new THREE.Mesh(new RoundedBoxGeometry(.25,.15,.08,2,.03),gunEdge);rearCap.position.set(0,-.005,.51);gun.add(rearCap);
for(const side of [-1,1]){
  const sidePlate=new THREE.Mesh(new THREE.BoxGeometry(.035,.17,.49),side<0?gunMetal:gunEdge);sidePlate.position.set(side*.174,.015,-.04);sidePlate.rotation.z=side*.05;gun.add(sidePlate);
  const shoulder=new THREE.Mesh(new THREE.BoxGeometry(.055,.13,.23),gunArmor);shoulder.position.set(side*.18,.01,.3);shoulder.rotation.z=side*.12;gun.add(shoulder);
}
const lowerRail=new THREE.Mesh(new THREE.BoxGeometry(.16,.045,.5),gunEdge);lowerRail.position.set(0,-.13,-.12);gun.add(lowerRail);
for(let notch=0;notch<5;notch+=1){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,.035),gunDark);tooth.position.set(0,-.158,.04-notch*.105);gun.add(tooth);}

// Recessed lateral energy chamber. Keep it inside the armor so first-person
// camera clipping cannot turn decorative coils into large floating arcs.
const gunEnergyCoreMaterial=new THREE.MeshBasicMaterial({color:0x5dfff0,transparent:true,opacity:.88});
const gunEnergyCore=new THREE.Mesh(new RoundedBoxGeometry(.018,.055,.29,2,.008),gunEnergyCoreMaterial);gunEnergyCore.position.set(-.194,.045,-.15);gun.add(gunEnergyCore);
for(const y of [.086,.004]){const coreRail=new THREE.Mesh(new THREE.BoxGeometry(.024,.018,.34),gunEdge);coreRail.position.set(-.19,y,-.15);gun.add(coreRail);}

// Reinforced barrel shroud, focusing coils and split muzzle brake.
const barrelShroud=new THREE.Mesh(new THREE.CylinderGeometry(.085,.095,.56,12),gunArmor);barrelShroud.rotation.x=Math.PI/2;barrelShroud.position.set(0,.04,-.64);gun.add(barrelShroud);
const barrelVentTop=new THREE.Mesh(new THREE.BoxGeometry(.11,.04,.54),gunEdge);barrelVentTop.position.set(0,.13,-.63);gun.add(barrelVentTop);
const barrelVentBottom=new THREE.Mesh(new THREE.BoxGeometry(.09,.035,.48),gunDark);barrelVentBottom.position.set(0,-.04,-.62);gun.add(barrelVentBottom);
// Inset focusing strips replace exposed torus coils, which clipped into large
// curved shapes when the first-person weapon moved close to the camera.
for(const z of [-.46,-.58,-.7,-.82]){
  const stripMaterial=new THREE.MeshBasicMaterial({color:z===-.7?0xff8b3d:0x43f4d0});
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.045,.012,.07),stripMaterial);strip.position.set(0,.137,z);gun.add(strip);
}
const muzzleBrake=new THREE.Mesh(new THREE.CylinderGeometry(.105,.13,.18,10),gunEdge);muzzleBrake.rotation.x=Math.PI/2;muzzleBrake.position.set(0,.04,-.96);gun.add(muzzleBrake);
for(const side of [-1,1]){const port=new THREE.Mesh(new THREE.BoxGeometry(.075,.07,.13),gunDark);port.position.set(side*.105,.04,-.96);gun.add(port);}

// Compact holographic optic with a luminous reticle.
const opticBase=new THREE.Mesh(new RoundedBoxGeometry(.17,.045,.27,2,.018),gunDark);opticBase.position.set(0,.175,-.08);gun.add(opticBase);
for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.025,.13,.04),gunEdge);post.position.set(side*.07,.245,-.16);gun.add(post);}
const opticTop=new THREE.Mesh(new THREE.BoxGeometry(.16,.025,.04),gunEdge);opticTop.position.set(0,.31,-.16);gun.add(opticTop);
const opticGlassMaterial=new THREE.MeshBasicMaterial({color:0x54e8ff,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false});
const opticGlass=new THREE.Mesh(new THREE.PlaneGeometry(.13,.11),opticGlassMaterial);opticGlass.position.set(0,.255,-.158);gun.add(opticGlass);
const gunReticleMaterial=new THREE.MeshBasicMaterial({color:0xff8b3d,transparent:true,opacity:.9,depthWrite:false});
const gunReticle=new THREE.Mesh(new THREE.RingGeometry(.016,.023,12),gunReticleMaterial);gunReticle.position.set(0,.255,-.155);gun.add(gunReticle);

// Side ammunition cells visually drain as the magazine empties.
const gunAmmoCells=[];
for(let cell=0;cell<8;cell+=1){
  const cellMaterial=new THREE.MeshBasicMaterial({color:0x43f4d0,transparent:true,opacity:.9});
  const indicator=new THREE.Mesh(new THREE.BoxGeometry(.025,.035,.045),cellMaterial);indicator.position.set(.19,.075,.18-cell*.06);gun.add(indicator);gunAmmoCells.push(indicator);
}
const gunVentMaterials=[];
for(let vent=0;vent<4;vent+=1){
  const ventMaterial=new THREE.MeshBasicMaterial({color:0x43f4d0,transparent:true,opacity:.52});
  const ventMesh=new THREE.Mesh(new THREE.BoxGeometry(.026,.025,.075),ventMaterial);ventMesh.position.set(-.19,-.045,.14-vent*.1);ventMesh.rotation.z=-.12;gun.add(ventMesh);gunVentMaterials.push(ventMaterial);
}

// Rear-facing digital weapon display.
const gunDisplayCanvas=document.createElement("canvas");gunDisplayCanvas.width=256;gunDisplayCanvas.height=96;
const gunDisplayTexture=new THREE.CanvasTexture(gunDisplayCanvas);gunDisplayTexture.colorSpace=THREE.SRGBColorSpace;
const gunDisplay=new THREE.Mesh(new THREE.PlaneGeometry(.22,.082),new THREE.MeshBasicMaterial({map:gunDisplayTexture,transparent:true,depthWrite:false}));gunDisplay.position.set(0,.08,.505);gun.add(gunDisplay);
let gunDisplayState="";

// Trigger hand, armored knuckles and forearm remain visible during firing.
const firingHand=new THREE.Group();firingHand.position.set(.015,-.34,.13);firingHand.rotation.set(-.18,0,-.06);gun.add(firingHand);
const firingGlove=new THREE.Mesh(new RoundedBoxGeometry(.2,.16,.28,2,.035),gunDark);firingHand.add(firingGlove);
const firingKnuckle=new THREE.Mesh(new THREE.BoxGeometry(.18,.045,.2),gunEdge);firingKnuckle.position.set(0,.095,-.02);firingHand.add(firingKnuckle);
const firingWrist=new THREE.Mesh(new THREE.CylinderGeometry(.1,.115,.24,8),gunArmor);firingWrist.position.set(.015,-.19,.1);firingWrist.rotation.z=-.08;firingHand.add(firingWrist);
const firingWristLight=new THREE.Mesh(new THREE.BoxGeometry(.18,.03,.09),gunGlow);firingWristLight.position.set(.015,-.08,.1);firingHand.add(firingWristLight);

const muzzleFlash = new THREE.Mesh(
  new THREE.OctahedronGeometry(.12, 0),
  new THREE.MeshBasicMaterial({ color: 0xffb15c, transparent: true, opacity: 0 })
);
muzzleFlash.position.set(0, .04, -1.08);
gun.add(muzzleFlash);


const raycaster = new THREE.Raycaster();
raycaster.far = 55;
const screenCenter = new THREE.Vector2(0, 0);
const impactGeometry = new THREE.SphereGeometry(.035, 6, 4);
const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffb15c });

// Procedural audio avoids loading large sound files and starts after the first click.
let audioContext;
let masterBus;
let sfxBus;
let musicBus;
let musicMuted = false;
let masterMuted=false;
let masterVolume=1;
let squadVoiceEnabled=false;
let preferredSquadVoice=null;
let musicTimer;
let musicStep = 0;
let musicNoiseBuffer;
const enemyNoiseBufferCache=new Map();
let nextAmbientEnemySoundAt=0;

function initAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") audioContext.resume();
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext = new AudioContextClass();
  masterBus = audioContext.createGain();
  masterBus.gain.value = masterMuted?0:masterVolume;
  masterBus.connect(audioContext.destination);
  sfxBus = audioContext.createGain();
  sfxBus.gain.value = .72;
  sfxBus.connect(masterBus);
  musicBus = audioContext.createGain();
  musicBus.gain.value = .16;
  musicBus.connect(masterBus);

  const padFilter = audioContext.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 240;
  padFilter.Q.value = 2.5;
  padFilter.connect(musicBus);
  [55, 82.5].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index ? "triangle" : "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index ? 5 : -5;
    gain.gain.value = index ? .15 : .1;
    oscillator.connect(gain).connect(padFilter);
    oscillator.start();
  });

  musicNoiseBuffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*.07),audioContext.sampleRate);
  const musicNoiseData=musicNoiseBuffer.getChannelData(0);
  for(let i=0;i<musicNoiseData.length;i+=1)musicNoiseData[i]=(Math.random()*2-1)*(1-i/musicNoiseData.length);

  musicTimer = window.setInterval(playMusicNote, 300);
}

function updateMasterVolumeUI(){
  const percentage=Math.round(masterVolume*100);
  volumeStateEl.textContent=masterMuted?"OFF":"ON";
  volumePercentageEl.textContent=`${percentage}%`;
  volumePercentageEl.classList.toggle("hidden",masterMuted);
  volumeButtonEl.setAttribute("aria-pressed",String(!masterMuted));
  volumeRangeEl.value=String(percentage);
}

function applyMasterVolume(){
  if(audioContext&&masterBus)masterBus.gain.setTargetAtTime(masterMuted?0:masterVolume,audioContext.currentTime,.035);
  updateMasterVolumeUI();
}

function setMasterVolume(value){
  masterVolume=THREE.MathUtils.clamp(value,0,1);
  masterMuted=masterVolume<=0;
  applyMasterVolume();
  statusEl.textContent=masterMuted?"Overall volume off":`Overall volume ${Math.round(masterVolume*100)}%`;
}

function toggleMasterVolume(){
  initAudio();
  if(masterMuted&&masterVolume<=0)masterVolume=1;
  masterMuted=!masterMuted;
  applyMasterVolume();
  statusEl.textContent=masterMuted?"Overall volume off":`Overall volume on - ${Math.round(masterVolume*100)}%`;
}

function chooseSquadVoice(){
  if(!("speechSynthesis" in window))return;
  const voices=window.speechSynthesis.getVoices().filter((voice)=>voice.lang?.toLowerCase().startsWith("en"));
  const score=(voice)=>{
    const name=voice.name.toLowerCase();
    return (name.includes("natural")?12:0)+(name.includes("neural")?11:0)+(name.includes("ava")?8:0)+
      (name.includes("samantha")?7:0)+(name.includes("google")?6:0)+(name.includes("microsoft")?4:0)+(voice.localService?2:0)-
      (name.includes("robot")||name.includes("espeak")?10:0);
  };
  preferredSquadVoice=voices.sort((a,b)=>score(b)-score(a))[0]||null;
}

function setSquadVoiceEnabled(enabled){
  squadVoiceEnabled=Boolean(enabled);
  voiceButtonEl.setAttribute("aria-pressed",String(squadVoiceEnabled));
  voiceStateEl.textContent=squadVoiceEnabled?"ON":"OFF";
  if(!squadVoiceEnabled&&"speechSynthesis" in window)window.speechSynthesis.cancel();
  statusEl.textContent=`Squad voice ${squadVoiceEnabled?"enabled":"disabled"}`;
}

function tone(frequency, duration, volume, type = "sine", destination = sfxBus, delay = 0) {
  if (!audioContext || !destination) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(now);
  oscillator.stop(now + duration + .03);
}

const spatialAudioPosition=new THREE.Vector3();
function worldSoundAudibility(source,nearDistance=4,farDistance=42){
  if(!source)return 1;
  if(source.isObject3D)source.getWorldPosition(spatialAudioPosition);
  else if(source.group?.isObject3D)source.group.getWorldPosition(spatialAudioPosition);
  else spatialAudioPosition.copy(source);
  const distance=spatialAudioPosition.distanceTo(camera.position);
  if(distance<=nearDistance)return 1;
  if(distance>=farDistance)return 0;
  return 1-THREE.MathUtils.smootherstep((distance-nearDistance)/(farDistance-nearDistance),0,1);
}

function worldTone(source,frequency,duration,volume,type="sine",destination=sfxBus,delay=0){
  const audibility=worldSoundAudibility(source);
  if(audibility<=.001)return;
  tone(frequency,duration,volume*audibility,type,destination,delay);
}

function playNanoShieldWarningSound(state){
  if(state==="warning"){
    tone(510,.1,.065,"triangle",sfxBus,0);
    tone(390,.14,.055,"triangle",sfxBus,.12);
    return;
  }
  if(state==="critical"){
    tone(245,.11,.085,"square",sfxBus,0);
    tone(175,.14,.075,"sawtooth",sfxBus,.14);
    tone(245,.11,.085,"square",sfxBus,.31);
  }
}

function playTamedRepairSound(source=camera) {
  if (!audioContext || !sfxBus) return;
  worldTone(source,185,.16,.075,"sawtooth",sfxBus,0);
  worldTone(source,370,.18,.085,"triangle",sfxBus,.1);
  worldTone(source,555,.2,.075,"sine",sfxBus,.21);
  worldTone(source,740,.28,.065,"sine",sfxBus,.32);
}

function speakSquadAlert(message) {
  if (masterMuted || !squadVoiceEnabled || !("speechSynthesis" in window)) return;
  tone(880,.055,.035,"sine",sfxBus,0);tone(1175,.06,.028,"sine",sfxBus,.07);
  window.setTimeout(()=>{
    if(masterMuted||!squadVoiceEnabled)return;
    const alert=new window.SpeechSynthesisUtterance(message);
    if(preferredSquadVoice)alert.voice=preferredSquadVoice;
    alert.volume=THREE.MathUtils.clamp(masterVolume,0,1);
    alert.rate=1.02;
    alert.pitch=1;
    window.speechSynthesis.speak(alert);
  },150);
}

function playMusicKick(volume) {
  if(!audioContext||!musicBus)return;
  const now=audioContext.currentTime,oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
  oscillator.type="sine";oscillator.frequency.setValueAtTime(105,now);oscillator.frequency.exponentialRampToValueAtTime(38,now+.14);
  gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
  oscillator.connect(gain).connect(musicBus);oscillator.start(now);oscillator.stop(now+.2);
}

function playMusicHat(volume) {
  if(!audioContext||!musicBus||!musicNoiseBuffer)return;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  source.buffer=musicNoiseBuffer;filter.type="highpass";filter.frequency.value=4200;gain.gain.value=volume;
  source.connect(filter).connect(gain).connect(musicBus);source.start();
}

function playMusicNote() {
  if (!audioContext || musicMuted) return;
  const step=musicStep%16;
  const intensity=THREE.MathUtils.clamp(.2+currentWave/50*.55+livingHostiles().length/12*.3,.2,1);
  const roots=[55,49,65.41,43.65];
  const root=roots[Math.floor(musicStep/16)%roots.length];
  const minorRatios=[1,1.122,1.189,1.335,1.498,1.587,1.782,2];
  const melodyPattern=[0,2,4,2,5,4,2,1,0,2,6,5,4,2,1,3];
  if(step%2===0)tone(root*(step===8?.5:1),.42,.045+intensity*.025,"sawtooth",musicBus);
  if(step%4===0){
    playMusicKick(.12+intensity*.1);
    tone(root*2,.55,.025+intensity*.018,"sine",musicBus);
  }
  if(step%2===1)playMusicHat(.025+intensity*.035);
  if(intensity>.38||step%4===2){
    const note=root*2*minorRatios[melodyPattern[step]];
    tone(note,.2,.025+intensity*.035,step%3?"triangle":"square",musicBus);
  }
  if(step===0||step===8){
    [1,minorRatios[2],minorRatios[4]].forEach((ratio,index)=>tone(root*ratio,.95,.016+intensity*.01,"sine",musicBus,index*.025));
  }
  if(currentWave%10===0&&currentWave>0&&step===12)tone(root*4*.943,.62,.045,"sawtooth",musicBus);
  musicStep += 1;
}

function playShotSound() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(150, now);
  oscillator.frequency.exponentialRampToValueAtTime(42, now + .09);
  gain.gain.setValueAtTime(.32, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .11);
  oscillator.connect(gain).connect(sfxBus);
  oscillator.start(now);
  oscillator.stop(now + .12);

  const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * .065), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = audioContext.createBufferSource();
  const noiseGain = audioContext.createGain();
  noise.buffer = buffer;
  noiseGain.gain.value = .24;
  noise.connect(noiseGain).connect(sfxBus);
  noise.start(now);
}

function playPlayerHurtSound(amount) {
  healthHudEl.classList.remove("hurt");
  void healthHudEl.offsetWidth;
  healthHudEl.classList.add("hurt");
  window.setTimeout(()=>healthHudEl.classList.remove("hurt"),380);
  damageFlashEl.classList.remove("hit","shield-hit");
  void damageFlashEl.offsetWidth;
  damageFlashEl.classList.add("hit");
  window.setTimeout(() => damageFlashEl.classList.remove("hit"), 360);
  if (!audioContext || !sfxBus) return;
  const now = audioContext.currentTime;
  const severity = THREE.MathUtils.clamp(amount / 35, .35, 1.2);
  const voice = audioContext.createOscillator();
  const voiceGain = audioContext.createGain();
  const voiceFilter = audioContext.createBiquadFilter();
  voice.type = "sawtooth";
  voice.frequency.setValueAtTime(165 - severity * 25, now);
  voice.frequency.exponentialRampToValueAtTime(62, now + .22);
  voiceFilter.type = "lowpass";
  voiceFilter.frequency.setValueAtTime(720, now);
  voiceFilter.frequency.exponentialRampToValueAtTime(240, now + .22);
  voiceGain.gain.setValueAtTime(.0001, now);
  voiceGain.gain.exponentialRampToValueAtTime(.24 * severity, now + .012);
  voiceGain.gain.exponentialRampToValueAtTime(.0001, now + .24);
  voice.connect(voiceFilter).connect(voiceGain).connect(sfxBus);
  voice.start(now);
  voice.stop(now + .26);

  const breathLength = Math.floor(audioContext.sampleRate * .16);
  const breathBuffer = audioContext.createBuffer(1, breathLength, audioContext.sampleRate);
  const breathData = breathBuffer.getChannelData(0);
  for (let i=0;i<breathLength;i+=1) breathData[i] = (Math.random()*2-1) * Math.sin(Math.PI*i/breathLength);
  const breath = audioContext.createBufferSource();
  const breathFilter = audioContext.createBiquadFilter();
  const breathGain = audioContext.createGain();
  breath.buffer = breathBuffer;
  breathFilter.type = "bandpass";
  breathFilter.frequency.value = 520;
  breathFilter.Q.value = .8;
  breathGain.gain.value = .18 * severity;
  breath.connect(breathFilter).connect(breathGain).connect(sfxBus);
  breath.start(now + .035);

}

function playPlayerDeathSound(){
  if(!audioContext||!sfxBus)return;
  const now=audioContext.currentTime;
  const shutdown=audioContext.createOscillator();
  const shutdownGain=audioContext.createGain();
  shutdown.type="sawtooth";
  shutdown.frequency.setValueAtTime(190,now);
  shutdown.frequency.exponentialRampToValueAtTime(28,now+1.05);
  shutdownGain.gain.setValueAtTime(.18,now);
  shutdownGain.gain.exponentialRampToValueAtTime(.0001,now+1.12);
  shutdown.connect(shutdownGain).connect(sfxBus);
  shutdown.start(now);shutdown.stop(now+1.15);
  tone(92,.32,.16,"square",sfxBus,.34);
  tone(54,.5,.14,"triangle",sfxBus,.72);
  const noiseLength=Math.floor(audioContext.sampleRate*.38);
  const noiseBuffer=audioContext.createBuffer(1,noiseLength,audioContext.sampleRate);
  const noiseData=noiseBuffer.getChannelData(0);
  for(let index=0;index<noiseLength;index+=1)noiseData[index]=(Math.random()*2-1)*(1-index/noiseLength);
  const impact=audioContext.createBufferSource();
  const impactFilter=audioContext.createBiquadFilter();
  const impactGain=audioContext.createGain();
  impact.buffer=noiseBuffer;impactFilter.type="lowpass";impactFilter.frequency.value=520;impactGain.gain.value=.24;
  impact.connect(impactFilter).connect(impactGain).connect(sfxBus);impact.start(now+.7);
}

function playNanoShieldHitSound(amount){
  if(audioContext&&sfxBus){
    const severity=THREE.MathUtils.clamp(amount/45,.3,1.15);
    tone(760,.08,.055*severity,"sine");
    tone(240,.18,.045*severity,"triangle",sfxBus,.025);
  }
  damageFlashEl.classList.remove("hit","shield-hit");
  void damageFlashEl.offsetWidth;
  damageFlashEl.classList.add("shield-hit");
  window.setTimeout(()=>damageFlashEl.classList.remove("shield-hit"),360);
  if(nanoShieldImpactEl){
    nanoShieldImpactEl.classList.remove("shield-hit");
    void nanoShieldImpactEl.getBoundingClientRect();
    nanoShieldImpactEl.classList.add("shield-hit");
    window.setTimeout(()=>nanoShieldImpactEl.classList.remove("shield-hit"),480);
  }
}

const enemyAudioWorldPosition=new THREE.Vector3();

function enemySpatialTone(enemy, frequency, duration, volume, wave, endRatio = 1, delay = 0, timbre = {}) {
  if (!audioContext || !sfxBus) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * endRatio), now + duration);
  filter.type = timbre.filterType || "lowpass";
  filter.frequency.value = timbre.filterFrequency ?? Math.min(4200, Math.max(300, frequency * 8));
  filter.Q.value = timbre.q ?? .7;
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + Math.min(duration * .35, timbre.attack ?? .012));
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(filter).connect(gain);
  if (timbre.vibratoRate && timbre.vibratoDepth) {
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = timbre.vibratoWave || "sine";
    lfo.frequency.value = timbre.vibratoRate;
    lfoGain.gain.value = timbre.vibratoDepth;
    lfo.connect(lfoGain).connect(oscillator.frequency);
    lfo.start(now);
    lfo.stop(now + duration + .03);
  }
  if (audioContext.createStereoPanner) {
    const panner = audioContext.createStereoPanner();
    enemy.group.getWorldPosition(enemyAudioWorldPosition);
    const relative = enemyAudioWorldPosition.sub(camera.position).normalize();
    const cameraRight = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    panner.pan.value = THREE.MathUtils.clamp(relative.dot(cameraRight), -1, 1);
    gain.connect(panner).connect(sfxBus);
  } else gain.connect(sfxBus);
  oscillator.start(now);
  oscillator.stop(now + duration + .03);
}

function enemyNoise(enemy, duration, volume, delay = 0, timbre = {}) {
  if (!audioContext || !sfxBus) return;
  const durationKey=Math.max(.025,Math.round(duration/.025)*.025);
  let buffer=enemyNoiseBufferCache.get(durationKey);
  if(!buffer){
    const length=Math.floor(audioContext.sampleRate*durationKey);
    buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i+=1)data[i]=(Math.random()*2-1)*(1-i/length);
    enemyNoiseBufferCache.set(durationKey,buffer);
  }
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  const now = audioContext.currentTime + delay;
  gain.gain.setValueAtTime(Math.max(.0002, volume), now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  let output = source;
  if (timbre.filterType || timbre.filterFrequency) {
    const filter = audioContext.createBiquadFilter();
    filter.type = timbre.filterType || "bandpass";
    filter.frequency.value = timbre.filterFrequency ?? 900;
    filter.Q.value = timbre.q ?? 1;
    source.connect(filter);
    output = filter;
  }
  output.connect(gain);
  if (audioContext.createStereoPanner) {
    const panner = audioContext.createStereoPanner();
    enemy.group.getWorldPosition(enemyAudioWorldPosition);
    const relative = enemyAudioWorldPosition.sub(camera.position).normalize();
    const cameraRight = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    panner.pan.value = THREE.MathUtils.clamp(relative.dot(cameraRight), -1, 1);
    gain.connect(panner).connect(sfxBus);
  } else gain.connect(sfxBus);
  source.start(now, 0, duration);
}

function playEnemySignature(enemy, event, volume) {
  const profile = ENEMY_SOUND_PROFILES[enemy.typeId];
  const attack = event === "attack";
  const death = event === "death";
  const idle = event === "idle";
  const level = volume * (death ? 1.45 : attack ? 1.15 : idle ? .48 : .8);
  const base = profile.base;
  switch (enemy.typeId) {
    case 1: // dragging scrap and jaw clank
      if (death) {
        enemySpatialTone(enemy, base * 1.25, .38, level * 1.05, "sawtooth", .18);
        enemyNoise(enemy, .32, level * .9);
        [0,.08,.17].forEach((delay,index) => enemySpatialTone(enemy, base*(1.8-index*.35), .055, level*.65, "square", .35, delay));
      } else if (idle) {
        enemySpatialTone(enemy, base * .72, .16, level * .6, "sawtooth", 1.12);
        enemySpatialTone(enemy, base * 1.65, .035, level * .45, "square", .62, .12);
      } else {
        enemyNoise(enemy, attack ? .15 : .07, level * .55);
        enemySpatialTone(enemy, base, .12, level, "square", .48);
        enemySpatialTone(enemy, base * 1.9, .035, level * .7, "triangle", .7, .075);
      }
      break;
    case 2: // broken digital drone stutter
      [0, .045, .1].forEach((delay, index) =>
        enemySpatialTone(enemy, base * (index === 1 ? 2.15 : 1.25), .032, level * .75, "square", .7, delay));
      break;
    case 3: // sharp animal squeak
      enemySpatialTone(enemy, base * 2.2, .09, level, "triangle", 1.75);
      enemySpatialTone(enemy, base * 3.1, .045, level * .55, "sine", .8, .055);
      break;
    case 4: // patrol radio acknowledgement
      enemySpatialTone(enemy, base, .055, level, "square", 1);
      enemySpatialTone(enemy, base * 1.5, .07, level * .8, "square", .72, .075);
      enemyNoise(enemy, .035, level * .25, .04);
      break;
    case 5: // heavy rusted servo and armor clang
      enemySpatialTone(enemy, base * .7, .18, level, "sawtooth", .45);
      enemyNoise(enemy, .1, level * .65, .045);
      break;
    case 6: // three-note pulse burst
      [1, 1.35, 1.8].forEach((ratio, index) =>
        enemySpatialTone(enemy, base * ratio, .045, level * .78, "square", .6, index * .055));
      break;
    case 7: // electrical spider crackle
      enemyNoise(enemy, .1, level * .8);
      enemySpatialTone(enemy, base * 1.7, .08, level, "sawtooth", .35);
      enemySpatialTone(enemy, base * 3.2, .025, level * .65, "square", .5, .035);
      break;
    case 8: // riot shield hydraulic thump
      enemySpatialTone(enemy, base * .65, .15, level * 1.2, "square", .42);
      enemyNoise(enemy, .055, level * .35, .025);
      enemySpatialTone(enemy, base * 2.4, .035, level * .4, "triangle", .8, .09);
      break;
    case 9: // toxic bubbling oscillator
      [0, .065, .13].forEach((delay, index) =>
        enemySpatialTone(enemy, base * (.75 + index * .18), .09, level * .65, "sine", 1.18, delay));
      break;
    case 10: // sniper charge followed by discharge
      enemySpatialTone(enemy, base * .45, .16, level * .7, "sine", 3.2);
      enemySpatialTone(enemy, base * 2.5, .045, level * 1.25, "sawtooth", .25, .15);
      break;
    case 11: // cloaked phase whisper
      enemySpatialTone(enemy, base * 2.1, .22, level * .7, "sine", .28);
      enemySpatialTone(enemy, base * .72, .26, level * .5, "triangle", 1.6, .035);
      break;
    case 12: // repair confirmation arpeggio
      [1, 1.25, 1.5, 2].forEach((ratio, index) =>
        enemySpatialTone(enemy, base * ratio, .07, level * .62, "sine", .92, index * .065));
      break;
    case 13: // flamethrower ignition and hiss
      enemySpatialTone(enemy, base * .8, .14, level, "sawtooth", .45);
      enemyNoise(enemy, attack ? .28 : .12, level * .95, .035);
      break;
    case 14: // phantom bell pair
      enemySpatialTone(enemy, base, .32, level * .72, "sine", .52);
      enemySpatialTone(enemy, base * 1.5, .38, level * .52, "sine", .7, .04);
      break;
    case 15: // minigun motor chatter
      enemySpatialTone(enemy, base, .16, level, "square", 1.8);
      [0,.035,.07,.105].forEach((delay) => enemyNoise(enemy, .025, level * .55, delay));
      break;
    case 16: // plasma warble
      enemySpatialTone(enemy, base * .65, .24, level * .8, "triangle", 2.4);
      enemySpatialTone(enemy, base * 1.8, .17, level * .62, "sine", .55, .08);
      break;
    case 17: // siege launch boom
      enemySpatialTone(enemy, base * .55, .25, level * 1.35, "sawtooth", .3);
      enemyNoise(enemy, .22, level, .02);
      enemySpatialTone(enemy, base * 3.5, .045, level * .35, "square", .4, .12);
      break;
    case 18: // void reverse chirp and blade ring
      enemySpatialTone(enemy, base * .45, .15, level * .7, "sine", 4.2);
      enemySpatialTone(enemy, base * 2.2, .11, level, "square", .3, .11);
      break;
    case 19: // titan bass roar and armor impact
      enemySpatialTone(enemy, base, .38, level * 1.4, "sawtooth", .32);
      enemySpatialTone(enemy, base * 2.2, .12, level * .6, "square", .55, .08);
      enemyNoise(enemy, .18, level * .8, .04);
      break;
    case 20: // layered Core alarm
      [1, 1.5, 2.25].forEach((ratio, index) =>
        enemySpatialTone(enemy, base * ratio, .42-index*.06, level * (1-index*.18), index===1?"square":"sawtooth", .45, index*.055));
      enemyNoise(enemy, .25, level * .75, .08);
      break;
  }
}

function playEnemySound(enemy, event) {
  if (!audioContext || !sfxBus) return;
  enemy.group.getWorldPosition(enemyAudioWorldPosition);
  const audibility=worldSoundAudibility(enemyAudioWorldPosition);
  if(audibility<=.001)return;
  const sizeBoost = enemy.typeId >= 19 ? 1.45 : enemy.elite ? 1.2 : 1;
  const volume = .075 * audibility * sizeBoost;
  emitEnemySoundRecipe(enemy.typeId,event,volume,{
    tone:(...parameters)=>enemySpatialTone(enemy,...parameters),
    noise:(...parameters)=>enemyNoise(enemy,...parameters),
  });
}

function updateCrawlerStunnedSound(enemy,elapsed){
  if(enemy.typeId!==1||elapsed<(enemy.nextCrawlerStunnedSound||0))return;
  playEnemySound(enemy,"stunned");
  enemy.nextCrawlerStunnedSound=elapsed+1.05;
}

function playScrapBurrowSound(enemy, phase) {
  if (!audioContext || !sfxBus) return;
  enemy.group.getWorldPosition(enemyAudioWorldPosition);
  const audibility=worldSoundAudibility(enemyAudioWorldPosition);
  if(audibility<=.001)return;
  const volume=.085*audibility;
  emitScrapBurrowRecipe(phase,volume,{
    tone:(...parameters)=>enemySpatialTone(enemy,...parameters),
    noise:(...parameters)=>enemyNoise(enemy,...parameters),
  });
}

function createImpact(point) {
  const impact = new THREE.Mesh(impactGeometry, impactMaterial);
  impact.position.copy(point);
  scene.add(impact);
  window.setTimeout(() => scene.remove(impact), 1800);
}

function createTracer(start, end, color = 0x8ffff0) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const tracerMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: .95,
    blending: THREE.AdditiveBlending,
  });
  const tracer = new THREE.Line(geometry, tracerMaterial);
  scene.add(tracer);
  window.setTimeout(() => {
    scene.remove(tracer);
    geometry.dispose();
    tracerMaterial.dispose();
  }, 70);
}

function gameplayActive() {
  return controls.isLocked || (mobilePlaying && mobileLandscapeQuery.matches);
}

function shoot() {
  if (!gameplayActive() || missionComplete || gameOver || reloading) return;
  initAudio();
  const now = performance.now();
  if (now - lastShot < 125) return;
  lastShot = now;
  raycaster.setFromCamera(screenCenter,camera);
  const machineButtonHit=raycaster.intersectObjects(machineHitMeshes,false)[0];
  if(machineButtonHit&&machineButtonHit.distance<5&&removeMachineCompanion(machineButtonHit.object.userData.machine))return;
  if (ammo <= 0 && !noReloadMode) {
    tone(190, .055, .08, "square");
    statusEl.textContent = "Magazine empty - press R";
    return;
  }

  if(!noReloadMode)ammo -= 1;
  else ammo=MAGAZINE_CAPACITY;
  ammoEl.textContent = String(ammo);
  recoil = 1;
  muzzleFlash.material.opacity = 1;
  muzzleFlash.scale.setScalar(.7 + Math.random() * .8);
  crosshair.classList.add("firing");
  window.setTimeout(() => {
    muzzleFlash.material.opacity = 0;
    crosshair.classList.remove("firing");
  }, 55);
  playShotSound();

  raycaster.setFromCamera(screenCenter, camera);
  const hit = raycaster.intersectObjects([...shootableSurfaces, ...enemyHitMeshes, ...abilityHitMeshes], false)[0];
  const tracerStart = new THREE.Vector3();
  muzzleFlash.getWorldPosition(tracerStart);
  const tracerEnd = hit
    ? hit.point.clone()
    : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, raycaster.far);
  createTracer(tracerStart, tracerEnd);
  if (hit) {
    createImpact(hit.point);
    if (hit.object.userData.enemy) damageEnemy(hit.object.userData.enemy, 25, hit.object.name,true);
    else if (hit.object.userData.abilityEffect) damageAbilityEffect(hit.object.userData.abilityEffect, 25);
  }
  if (ammo === 0 && !noReloadMode) statusEl.textContent = "Magazine empty - press R";
}

function updateAmmoWarning(){
  ammoWarningEl.classList.toggle("hidden",noReloadMode||ammo>0||reloading||!gameplayActive()||missionComplete||gameOver);
}

function playReloadSound(stage){
  initAudio();
  if(stage===0){
    tone(185,.055,.075,"square");tone(92,.09,.045,"triangle",sfxBus,.025);
  }else if(stage===1){
    tone(118,.12,.055,"sawtooth");tone(72,.08,.04,"square",sfxBus,.06);
  }else if(stage===2){
    tone(145,.09,.085,"square");tone(310,.065,.06,"triangle",sfxBus,.035);
  }else if(stage===3){
    tone(420,.055,.075,"square");tone(190,.11,.065,"sawtooth",sfxBus,.06);tone(560,.04,.035,"triangle",sfxBus,.14);
  }else{
    tone(690,.07,.04,"sine");tone(920,.08,.025,"sine",sfxBus,.055);
  }
}

function reload() {
  if(noReloadMode){ammo=MAGAZINE_CAPACITY;ammoEl.textContent=String(ammo);statusEl.textContent="No Reload active - magazine locked at full";return;}
  if (reloading || ammo === MAGAZINE_CAPACITY || !gameplayActive()) return;
  reloading = true;
  firingHeld=false;
  reloadStartedAt=performance.now();
  reloadSoundStage=1;
  statusEl.textContent = "Reloading - ejecting power magazine";
  playReloadSound(0);
}

function toggleMusic() {
  initAudio();
  musicMuted = !musicMuted;
  if (musicBus) musicBus.gain.setTargetAtTime(musicMuted ? 0 : .16, audioContext.currentTime, .05);
  statusEl.textContent = musicMuted ? "Music muted" : "Music enabled";
}

const projectileGeometry = new THREE.SphereGeometry(.11, 7, 5);
const projectileMaterials = new Map();
const navDirection = new THREE.Vector3();
const enemySightRaycaster = new THREE.Raycaster();
const enemySightOrigin = new THREE.Vector3();
const enemySightDirection = new THREE.Vector3();
const tamedVisibilityRaycaster = new THREE.Raycaster();
const tamedVisibilityPoint = new THREE.Vector3();
const tamedVisibilityDirection = new THREE.Vector3();
const hostileVisibilityRaycaster = new THREE.Raycaster();
const hostileVisibilityPoint = new THREE.Vector3();
const hostileProjectedPoint = new THREE.Vector3();
const hostileVisibilityDirection = new THREE.Vector3();
const NAV_STEP = 1.4;
const NAV_MIN = -50.4;
const NAV_SIZE = 55;
const navWalkable = new Uint8Array(NAV_SIZE * NAV_SIZE);
const navDistance = new Int16Array(NAV_SIZE * NAV_SIZE);
let navRefresh = 0;
let navVersion = 0;
let navTargetIndex = -1;

function enemyCollides(x, z, radius = .42) {
  if (!insidePlayableArea(x,z,radius)) return true;
  return obstacles.some((box) =>
    x + radius > box.minX && x - radius < box.maxX &&
    z + radius > box.minZ && z - radius < box.maxZ
  );
}

function navIndex(x, z) {
  return z * NAV_SIZE + x;
}

function worldToNav(value) {
  return THREE.MathUtils.clamp(Math.round((value - NAV_MIN) / NAV_STEP), 0, NAV_SIZE - 1);
}

function navToWorld(cell) {
  return NAV_MIN + cell * NAV_STEP;
}

function buildNavigationGrid() {
  for (let z = 0; z < NAV_SIZE; z += 1) {
    for (let x = 0; x < NAV_SIZE; x += 1) {
      navWalkable[navIndex(x, z)] = enemyCollides(navToWorld(x), navToWorld(z), .52) ? 0 : 1;
    }
  }
}

function nearestWalkableCell(startX, startZ) {
  if (navWalkable[navIndex(startX, startZ)]) return { x: startX, z: startZ };
  for (let radius = 1; radius < 6; radius += 1) {
    for (let z = startZ - radius; z <= startZ + radius; z += 1) {
      for (let x = startX - radius; x <= startX + radius; x += 1) {
        if (x < 0 || z < 0 || x >= NAV_SIZE || z >= NAV_SIZE) continue;
        if (navWalkable[navIndex(x, z)]) return { x, z };
      }
    }
  }
  return null;
}

function rebuildFlowField() {
  navDistance.fill(-1);
  const requestedX = worldToNav(camera.position.x);
  const requestedZ = worldToNav(camera.position.z);
  const target = nearestWalkableCell(requestedX, requestedZ);
  if (!target) return;
  const queue = new Int32Array(NAV_SIZE * NAV_SIZE);
  let head = 0;
  let tail = 0;
  const targetIndex = navIndex(target.x, target.z);
  navTargetIndex = navIndex(requestedX, requestedZ);
  navVersion += 1;
  navDistance[targetIndex] = 0;
  queue[tail++] = targetIndex;
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while (head < tail) {
    const current = queue[head++];
    const cx = current % NAV_SIZE;
    const cz = Math.floor(current / NAV_SIZE);
    for (const [dx, dz] of directions) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= NAV_SIZE || nz >= NAV_SIZE) continue;
      const nextIndex = navIndex(nx, nz);
      if (!navWalkable[nextIndex] || navDistance[nextIndex] !== -1) continue;
      if (dx !== 0 && dz !== 0 &&
          (!navWalkable[navIndex(cx + dx, cz)] || !navWalkable[navIndex(cx, cz + dz)])) continue;
      navDistance[nextIndex] = navDistance[current] + 1;
      queue[tail++] = nextIndex;
    }
  }
}

function getFlowDirection(position, output) {
  const cx = worldToNav(position.x);
  const cz = worldToNav(position.z);
  let bestX = cx;
  let bestZ = cz;
  let bestDistance = navDistance[navIndex(cx, cz)];
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dz === 0) continue;
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= NAV_SIZE || nz >= NAV_SIZE) continue;
      const distance = navDistance[navIndex(nx, nz)];
      if (distance >= 0 && (bestDistance < 0 || distance < bestDistance)) {
        bestDistance = distance;
        bestX = nx;
        bestZ = nz;
      }
    }
  }
  output.set(navToWorld(bestX) - position.x, 0, navToWorld(bestZ) - position.z);
  if (output.lengthSq() < .01 || bestDistance < 0) {
    output.set(camera.position.x - position.x, 0, camera.position.z - position.z);
  }
  return output.normalize();
}

function buildWaypointPath(position) {
  const start = nearestWalkableCell(worldToNav(position.x), worldToNav(position.z));
  if (!start) return [];
  const path = [];
  let cx = start.x;
  let cz = start.z;
  let previousDx = 99;
  let previousDz = 99;
  for (let step = 0; step < NAV_SIZE * 2; step += 1) {
    const currentDistance = navDistance[navIndex(cx, cz)];
    if (currentDistance <= 0) break;
    let bestX = cx;
    let bestZ = cz;
    let bestDistance = currentDistance;
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dz === 0) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= NAV_SIZE || nz >= NAV_SIZE) continue;
        if (dx !== 0 && dz !== 0 &&
            (!navWalkable[navIndex(cx + dx, cz)] || !navWalkable[navIndex(cx, cz + dz)])) continue;
        const distance = navDistance[navIndex(nx, nz)];
        if (distance >= 0 && distance < bestDistance) {
          bestDistance = distance;
          bestX = nx;
          bestZ = nz;
        }
      }
    }
    if (bestX === cx && bestZ === cz) break;
    const directionX = bestX - cx;
    const directionZ = bestZ - cz;
    if (directionX !== previousDx || directionZ !== previousDz || path.length === 0) {
      path.push(new THREE.Vector3(navToWorld(bestX), 0, navToWorld(bestZ)));
      previousDx = directionX;
      previousDz = directionZ;
    } else {
      path[path.length - 1].set(navToWorld(bestX), 0, navToWorld(bestZ));
    }
    cx = bestX;
    cz = bestZ;
  }
  return path;
}

function getWaypointDirection(enemy, output) {
  if (enemy.pathVersion !== navVersion || !enemy.path) {
    enemy.path = buildWaypointPath(enemy.group.position);
    enemy.pathIndex = 0;
    enemy.pathVersion = navVersion;
  }
  while (enemy.pathIndex < enemy.path.length) {
    const waypoint = enemy.path[enemy.pathIndex];
    const dx = waypoint.x - enemy.group.position.x;
    const dz = waypoint.z - enemy.group.position.z;
    if (dx * dx + dz * dz > .3) return output.set(dx, 0, dz).normalize();
    enemy.pathIndex += 1;
  }
  return output.set(camera.position.x - enemy.group.position.x, 0, camera.position.z - enemy.group.position.z).normalize();
}

buildNavigationGrid();
rebuildFlowField();

function pickSpawnPoint() {
  const candidates=spawnPoints.map((point,index)=>({point,index}));
  const valid = candidates.filter(({point:[x,z]}) => {
    const dx = x - camera.position.x;
    const dz = z - camera.position.z;
    return dx * dx + dz * dz > 90 && !enemyCollides(x, z, .5);
  });
  const source=valid.length?valid:candidates;
  const selected=source[Math.floor(Math.random()*source.length)];
  const [x,z]=selected.point;
  return {x:x+(Math.random()-.5)*1.1,z:z+(Math.random()-.5)*1.1,gateIndex:selected.index};
}


function addHostileTracking(enemy){
  const sourceMeshes=[
    enemy.parts.body,enemy.parts.head,
    ...enemy.parts.legs,...enemy.parts.arms,...enemy.parts.rotors,...enemy.parts.weapons,
  ].filter((part)=>part?.isMesh).slice(0,14);
  const silhouetteMaterial=new THREE.MeshBasicMaterial({
    color:0xff203d,transparent:true,opacity:.58,depthTest:false,depthWrite:false,
    side:THREE.BackSide,blending:THREE.AdditiveBlending,
  });
  enemy.hostileTrackingShells=sourceMeshes.map((part)=>{
    const shell=new THREE.Mesh(part.geometry,silhouetteMaterial);shell.scale.setScalar(1.065);shell.visible=false;shell.renderOrder=52;
    shell.userData.hostileTrackingShell=true;shell.raycast=()=>{};part.add(shell);return shell;
  });
  enemy.hostileTrackingMaterial=silhouetteMaterial;
  const arrowMaterial=new THREE.SpriteMaterial({map:hostileArrowTexture,color:0xffffff,transparent:true,opacity:.92,depthTest:false,depthWrite:false});
  const arrow=new THREE.Sprite(arrowMaterial);arrow.scale.set(.72,.72,1);arrow.visible=false;arrow.renderOrder=54;scene.add(arrow);enemy.hostileArrow=arrow;
}

function hideHostileTracking(enemy){
  enemy.hostileTrackingShells?.forEach((shell)=>{shell.visible=false;});
  if(enemy.hostileArrow)enemy.hostileArrow.visible=false;
}

function removeHostileTracking(enemy){
  enemy.hostileTrackingShells?.forEach((shell)=>shell.parent?.remove(shell));
  enemy.hostileTrackingMaterial?.dispose();enemy.hostileTrackingShells=[];enemy.hostileTrackingMaterial=null;
  if(enemy.hostileArrow){scene.remove(enemy.hostileArrow);enemy.hostileArrow.material.dispose();enemy.hostileArrow=null;}
}

function spawnEnemy(typeId, elite = false) {
  const type = ENEMY_TYPES[typeId];
  const model = buildEnemyModel(typeId, type, elite);
  const { group, bodyMaterial, parts, flying } = model;
  const spawn = pickSpawnPoint();
  const size = type.scale * (elite ? 1.2 : 1);
  group.scale.setScalar(size);
  group.position.set(spawn.x, flying ? 1.15 : 0, spawn.z);
  // Scrap Crawler Burrow pitches around its own local X axis. YXZ keeps that
  // pitch local after gameplay yaw; default XYZ made the side/rear dive first
  // whenever the crawler was facing away from the showroom's zero-yaw angle.
  if(typeId===1)group.rotation.order="YXZ";
  scene.add(group);
  if(spawnGates[spawn.gateIndex])spawnGates[spawn.gateIndex].flash=1;

  const healthScale = 1 + Math.floor((currentWave - 1) / 5) * .1;
  const damageScale = 1 + Math.floor((currentWave - 1) / 10) * .08;
  const maxHealth = Math.round(type.health * healthScale * (elite ? 1.5 : 1));
  const enemy = {
    typeId, type, group, bodyMaterial, parts, flying, elite, maxHealth, health: maxHealth,
    damage: Math.round(type.damage * damageScale * (elite ? 1.2 : 1)),
    speed: type.speed * (elite ? 1.08 : 1),
    nextAttack: clock.elapsedTime + 1 + Math.random(),
    abilityAt: clock.elapsedTime + 3 + Math.random() * 3,
    seed: Math.random() * Math.PI * 2,
    alive: true, dying: false, deathTime: 0, attackAnimation: 0, walkPhase: Math.random() * Math.PI * 2,
    steering: new THREE.Vector3(), path: null, pathIndex: 0, pathVersion: -1,
    nextIdleSound: clock.elapsedTime + (typeId === 1 ? .8 + Math.random() : 1.5 + Math.random() * 2.5),
    nextStepSound: clock.elapsedTime + (typeId === 1 ? .08 : Math.random() * .3),
    animationBaseY: 0, baseScale: group.scale.clone(), deathBaseY: group.position.y,
    deathBaseRotationY: group.rotation.y, deathDuration: (typeId===1||typeId===2)?(getEnemyDefinition(typeId).animations.deathDuration||2.4):1.2,
  };
  applyEnemyGraphicsDetail(enemy);
  const nonRepairSurfaces=new Set([...parts.rings,...parts.glows,...parts.crawlerSmoke,...parts.crawlerSparks]);
  enemy.repairSurfaceMeshes=[];
  group.traverse((child)=>{if(child.isMesh&&!child.userData.crawlerDamageFx&&!nonRepairSurfaces.has(child))enemy.repairSurfaceMeshes.push(child);});
  if(typeId===1)enemy.skillPoseSnapshots=captureEnemySkillPose(group);
  group.traverse((child) => {
    if (!child.isMesh||child.userData.crawlerDamageFx) return;
    child.userData.enemy = enemy;
    enemyHitMeshes.push(child);
  });
  addHostileTracking(enemy);
  enemies.push(enemy);
  playEnemySound(enemy, "spawn");
  updateEnemyCount();
}

function livingHostiles() {
  return enemies.filter((enemy) => enemy.alive && !enemy.tamed);
}

function createEnemyPortrait(enemy) {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 80;
  const context = canvas.getContext("2d");
  const color = `#${enemy.type.color.toString(16).padStart(6,"0")}`;
  const gradient = context.createRadialGradient(40,34,4,40,40,52);
  gradient.addColorStop(0,color);
  gradient.addColorStop(1,"#06101d");
  context.fillStyle=gradient; context.fillRect(0,0,80,80);
  context.fillStyle="rgba(2,8,15,.82)"; context.strokeStyle="#76bdff"; context.lineWidth=4; context.lineCap="round"; context.lineJoin="round";
  const line=(x1,y1,x2,y2)=>{context.beginPath();context.moveTo(x1,y1);context.lineTo(x2,y2);context.stroke();};
  const circle=(x,y,r,fill=true)=>{context.beginPath();context.arc(x,y,r,0,Math.PI*2);fill?context.fill():context.stroke();};
  const box=(x,y,w,h)=>context.fillRect(x,y,w,h);
  switch(enemy.typeId){
    case 1: box(22,34,36,17); box(50,30,16,15); for(const y of [34,42,50]){line(23,y,10,y+7);line(57,y,70,y+7);} break;
    case 2: circle(40,39,15); line(12,31,68,31); circle(14,31,6,false);circle(66,31,6,false);box(34,50,12,8); break;
    case 3: context.beginPath();context.ellipse(38,44,23,13,0,0,Math.PI*2);context.fill();circle(59,37,11);line(18,45,7,57);line(7,57,12,63); break;
    case 4: box(25,29,30,30);box(29,18,22,14);line(40,18,40,9);circle(40,8,3,false);break;
    case 5: box(22,28,36,33);box(17,24,13,18);box(50,24,13,18);box(27,17,26,14);break;
    case 6: circle(40,39,14);circle(40,39,25,false);box(17,35,10,8);box(53,35,10,8);break;
    case 7: circle(40,39,13);for(let i=0;i<4;i++){line(31,31+i*6,10,20+i*13);line(49,31+i*6,70,20+i*13);}break;
    case 8: box(29,24,25,37);box(11,20,25,44);line(17,28,30,56);box(37,14,17,14);break;
    case 9: box(26,26,28,35);circle(29,22,8,false);circle(51,22,8,false);line(29,15,29,55);line(51,15,51,55);break;
    case 10: box(20,27,23,34);box(24,17,18,13);line(33,43,70,22);circle(51,32,5,false);break;
    case 11: context.beginPath();context.moveTo(40,12);context.lineTo(20,34);context.lineTo(27,63);context.lineTo(53,63);context.lineTo(60,34);context.closePath();context.fill();line(18,58,6,29);line(62,58,74,29);break;
    case 12: box(24,25,31,36);box(18,30,10,25);line(55,42,70,18);circle(70,18,6,false);line(65,13,75,23);break;
    case 13: box(24,26,28,35);circle(31,25,9,false);circle(49,25,9,false);line(50,43,72,34);line(72,34,76,27);break;
    case 14: context.beginPath();context.moveTo(40,14);context.lineTo(58,40);context.lineTo(40,65);context.lineTo(22,40);context.closePath();context.fill();circle(40,40,29,false);break;
    case 15: box(17,24,40,39);box(10,20,16,22);box(48,20,16,22);circle(56,49,10,false);for(const y of [44,49,54])line(56,y,76,y);break;
    case 16: context.beginPath();context.moveTo(40,10);context.lineTo(18,43);context.lineTo(62,43);context.closePath();context.fill();box(27,40,26,23);line(60,58,68,17);circle(68,15,7,false);break;
    case 17: box(20,24,40,28);for(const x of [26,54]){line(x,50,x-8,66);line(x,50,x+8,66);}box(8,20,15,20);box(57,20,15,20);break;
    case 18: context.beginPath();context.moveTo(40,13);context.lineTo(25,28);context.lineTo(29,60);context.lineTo(51,60);context.lineTo(55,28);context.closePath();context.fill();line(25,47,8,18);line(55,47,72,18);break;
    case 19: box(19,22,42,41);box(7,18,21,22);box(52,18,21,22);circle(40,38,11,false);line(18,17,18,8);line(62,17,62,8);break;
    case 20: circle(40,40,16);circle(40,40,29,false);context.setLineDash([5,5]);circle(40,40,36,false);context.setLineDash([]);for(let i=0;i<6;i++){const a=i*Math.PI/3;circle(40+Math.cos(a)*29,40+Math.sin(a)*29,3);}break;
  }
  context.fillStyle="#55aaff"; context.fillRect(31,36,18,4);
  context.fillStyle="rgba(255,255,255,.75)"; context.font="bold 12px monospace";
  context.fillText(`E${enemy.typeId}`,6,15);
  context.fillStyle="rgba(255,255,255,.13)";
  for(let i=0;i<6;i+=1) context.fillRect(8+i*13,67-(i%2)*4,8,2);
  return canvas.toDataURL("image/png");
}

function removeEnemyFromHitMeshes(enemy) {
  for (let i=enemyHitMeshes.length-1;i>=0;i-=1) {
    if (enemyHitMeshes[i].userData.enemy === enemy) enemyHitMeshes.splice(i,1);
  }
}

function addEnemyToHitMeshes(enemy){
  if(!enemy?.alive||enemy.tamed||enemy.capturable)return;
  enemy.group.traverse((child)=>{
    if(!child.isMesh||child.userData.crawlerDamageFx||child.userData.enemy!==enemy||enemyHitMeshes.includes(child))return;
    enemyHitMeshes.push(child);
  });
}

function isScrapCrawlerUnderground(enemy){
  return Boolean(enemy?.typeId===1&&enemy.burrowState?.phase==="travel");
}

function addTamedAura(enemy) {
  const bodyMeshes=[];
  enemy.group.traverse((child)=>{
    if(!child.isMesh)return;
    bodyMeshes.push(child);
    const materials=Array.isArray(child.material)?child.material:[child.material];
    materials.forEach((entry)=>{
      if(entry?.emissive){entry.emissive.setHex(0x0b63c9);entry.emissiveIntensity=Math.max(.2,entry.emissiveIntensity||0);}
    });
  });
  const aura = new THREE.Group();
  const blue = new THREE.MeshBasicMaterial({color:0x3d9bff,transparent:true,opacity:.78,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
  const ring = new THREE.Mesh(unitTorusGeometry,blue);
  ring.scale.set(1.05,1.05,1.05);
  ring.rotation.x=Math.PI/2;
  ring.position.y=.12;
  aura.add(ring);
  for(let i=0;i<6;i+=1){
    const particle=new THREE.Mesh(unitSphereGeometry,blue);
    particle.scale.setScalar(.075);
    particle.userData.auraAngle=i*Math.PI/3;
    particle.renderOrder=50;particle.frustumCulled=true;
    aura.add(particle);
  }
  ring.renderOrder=50;ring.frustumCulled=true;
  enemy.group.add(aura);
  enemy.tameAura=aura;
  enemy.tameAuraMaterial=blue;
  const silhouetteMaterial=new THREE.MeshBasicMaterial({color:0x2587ff,transparent:true,opacity:.48,depthTest:false,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending});
  const importantParts=new Set([enemy.parts.body,enemy.parts.head,...enemy.parts.legs,...enemy.parts.arms,...enemy.parts.rotors,...enemy.parts.weapons,...enemy.parts.rings,...enemy.parts.glows].filter((part)=>part?.isMesh));
  const highlightParts=[...importantParts].slice(0,28);
  enemy.tameHighlightMeshes=highlightParts.map((bodyPart)=>{
    const shell=new THREE.Mesh(bodyPart.geometry,silhouetteMaterial);
    shell.scale.setScalar(1.075);shell.renderOrder=49;shell.frustumCulled=true;
    shell.userData.tamedHighlightShell=true;
    bodyPart.add(shell);
    return shell;
  });
  enemy.tameHighlightMaterial=silhouetteMaterial;
}

function createCarryActionLabel(title,subtitle,color){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
  const context=canvas.getContext("2d");
  const cssColor=`#${color.toString(16).padStart(6,"0")}`;
  context.fillStyle="rgba(3,12,18,.94)";context.fillRect(7,7,498,114);
  context.strokeStyle=cssColor;context.lineWidth=5;context.strokeRect(9.5,9.5,493,109);
  context.fillStyle=cssColor;context.font="800 27px monospace";context.textAlign="center";context.fillText(title,256,57);
  context.fillStyle="rgba(235,248,248,.78)";context.font="700 16px monospace";context.fillText(subtitle,256,88);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
  sprite.scale.set(3.1,.78,1);sprite.renderOrder=55;
  return sprite;
}

function createCaptureArrow(enemy){
  const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;
  const context=canvas.getContext("2d");
  context.shadowColor="#ffd35c";context.shadowBlur=18;context.fillStyle="#ffd35c";
  context.fillRect(108,28,40,96);
  context.beginPath();context.moveTo(50,112);context.lineTo(206,112);context.lineTo(128,218);context.closePath();context.fill();
  context.shadowBlur=0;context.fillStyle="#071019";context.font="900 18px monospace";context.textAlign="center";context.fillText("RECOVER",128,92);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const arrow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
  arrow.scale.set(.72,.72,1);arrow.visible=false;arrow.renderOrder=56;scene.add(arrow);enemy.captureArrow=arrow;
}

function createCaptureLabel(enemy){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=112;
  const context=canvas.getContext("2d");
  context.fillStyle="rgba(5,13,18,.9)";context.fillRect(8,8,496,96);
  context.strokeStyle="#ffd35c";context.lineWidth=5;context.strokeRect(10.5,10.5,491,91);
  context.fillStyle="#ffd35c";context.font="800 30px monospace";context.textAlign="center";context.fillText(isMobileDevice?"TAP USE TO PICK UP":"PRESS E TO PICK UP",256,59);
  context.fillStyle="rgba(255,255,255,.68)";context.font="700 15px monospace";context.fillText("TAKE TO AUXILIARY PLATFORM",256,84);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false}));
  sprite.scale.set(1.75,.385,1);sprite.visible=false;sprite.renderOrder=45;scene.add(sprite);
  enemy.captureLabel=sprite;
  createCaptureArrow(enemy);
}

function removeCaptureLabel(enemy){
  if(!enemy)return;
  if(enemy.captureLabel){
    scene.remove(enemy.captureLabel);
    enemy.captureLabel.material.map?.dispose();enemy.captureLabel.material.dispose();enemy.captureLabel=null;
  }
  if(enemy.captureArrow){
    scene.remove(enemy.captureArrow);
    enemy.captureArrow.material.map?.dispose();enemy.captureArrow.material.dispose();enemy.captureArrow=null;
  }
}

function ensureCarryTutorialLines(){
  if(carryTutorialLines.length)return;
  for(const color of [0x35ff82,0xff4057]){
    const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
    const material=new THREE.LineDashedMaterial({color,transparent:true,opacity:.84,dashSize:.55,gapSize:.28,depthWrite:false});
    const line=new THREE.Line(geometry,material);line.visible=false;line.renderOrder=18;scene.add(line);carryTutorialLines.push(line);
  }
}

function buildCarryTutorialPath(target){
  const points=[new THREE.Vector3(camera.position.x,.07,camera.position.z)];
  if(camera.position.z>-29&&target.z<-29){
    const bridgeX=Math.abs(target.x+8.25)<Math.abs(target.x-8.25)?-8.25:8.25;
    points.push(new THREE.Vector3(bridgeX,.07,-21.7),new THREE.Vector3(bridgeX,.07,-30.35));
  }
  points.push(new THREE.Vector3(target.x,.07,target.z));
  return points;
}

function stopCarryTutorial(){
  carryTutorialActive=false;
  carryTutorialLines.forEach((line)=>{line.visible=false;});
}

function updateCarryTutorial(elapsed){
  if(!carryTutorialActive||!carriedEnemy){stopCarryTutorial();return;}
  if(elapsed<carryTutorialRefreshAt)return;
  carryTutorialRefreshAt=elapsed+.12;
  ensureCarryTutorialLines();
  const available=tamingMachines.filter((machine)=>!machine.processingEnemy&&!machine.tamedEnemy)
    .sort((a,b)=>playerDistanceTo(a.group.position)-playerDistanceTo(b.group.position))[0];
  const targets=[available?.group.position,trashStation.demolition?null:trashStation.group.position];
  carryTutorialLines.forEach((line,index)=>{
    const target=targets[index];line.visible=Boolean(target);
    if(!target)return;
    line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(buildCarryTutorialPath(target));line.computeLineDistances();
    line.material.opacity=.62+Math.sin(elapsed*7+index*Math.PI)*.25;
  });
}

function renderSquadUI() {
  squadListEl.replaceChildren();
  squadCountEl.textContent=`${tamedEnemies.length}/5`;
  for(const enemy of tamedEnemies){
    const card=document.createElement("div"); card.className="squad-card";
    const portrait=document.createElement("img"); portrait.className="squad-portrait"; portrait.alt=enemy.type.name; portrait.src=createEnemyPortrait(enemy);
    const info=document.createElement("div"); info.className="squad-info";
    const name=document.createElement("div"); name.className="squad-name"; name.textContent=enemy.type.name;
    const state=document.createElement("div"); state.className="squad-state"; state.textContent="READY";
    const health=document.createElement("div"); health.className="squad-health";
    const fill=document.createElement("i"); fill.style.width="100%"; health.append(fill);
    info.append(name,state,health);
    const slot=document.createElement("span");slot.className="squad-slot";slot.textContent=`M${(enemy.machineSlot??0)+1}`;
    card.append(portrait,info,slot); squadListEl.append(card);
    enemy.squadCard={card,state,fill};
  }
}

function updateSquadUI(elapsed) {
  if (elapsed < squadUiAt) return;
  squadUiAt=elapsed+.15;
  for(const enemy of tamedEnemies){
    if(!enemy.squadCard) continue;
    const stunned=elapsed < (enemy.tamedStunnedUntil||0);
    const repairPercent=stunned?Math.round(THREE.MathUtils.clamp(enemy.health/enemy.maxHealth,0,1)*100):100;
    enemy.squadCard.card.classList.toggle("stunned",stunned);
    enemy.squadCard.state.textContent=stunned ? `M${(enemy.machineSlot??0)+1} · REPAIR ${repairPercent}% · ${Math.max(0,Math.ceil(enemy.tamedStunnedUntil-elapsed))}S` : `M${(enemy.machineSlot??0)+1} · ${squadMode.toUpperCase()}`;
    enemy.squadCard.fill.style.width=`${Math.max(0,enemy.health/enemy.maxHealth*100)}%`;
  }
}

function setSquadMode(mode) {
  squadMode=mode;
  squadAttackEl.classList.toggle("active",mode==="attack");
  squadProtectEl.classList.toggle("active",mode==="protect");
  mobileAttackEl.classList.toggle("active",mode==="attack");
  mobileProtectEl.classList.toggle("active",mode==="protect");
  squadModeCopyEl.textContent=mode==="attack" ? "Hunt enemies across the arena, then return." : "Stay near the player and engage nearby threats.";
  statusEl.textContent=`Squad mode: ${mode}`;
}

function makeEnemyCapturable(enemy) {
  removeHostileTracking(enemy);
  enemy.alive=false; enemy.dying=false; enemy.capturable=true; enemy.captureTimeRemaining=CAPTURABLE_LIFETIME;
  enemy.group.visible=true; enemy.group.position.y=Math.max(0,enemy.group.position.y);
  enemy.group.rotation.x=0; enemy.group.rotation.z=(enemy.typeId===1||enemy.typeId===2)?0:.92;
  enemy.steering.set(0,0,0);
  removeEnemyFromHitMeshes(enemy);
  if(enemy.typeId===1){enemy.burrowState=null;removeScrapBurrowMarker(enemy);}
  if(enemy.typeId===1){playEnemySound(enemy,"stunned");enemy.nextCrawlerStunnedSound=clock.elapsedTime+1.05;}
  const markerMaterial=new THREE.MeshBasicMaterial({color:0xffd35c,transparent:true,opacity:.88,depthWrite:false});
  const marker=new THREE.Mesh(unitTorusGeometry,markerMaterial);
  marker.rotation.x=Math.PI/2; marker.position.y=Math.max(1.2,enemy.type.scale*1.5); marker.scale.setScalar(.72);
  enemy.group.add(marker); enemy.captureMarker=marker;
  createCaptureLabel(enemy);
  worldTone(enemy.group,520,.18,.08,"triangle");worldTone(enemy.group,780,.2,.06,"sine",sfxBus,.12);
  statusEl.textContent=`${enemy.type.name} recoverable - ${isMobileDevice?"tap USE":"press E"} to pick it up`;
  updateEnemyCount();
}

function clearCarryDisplay(){
  if(carriedEnemy?.carriedDisplay){
    carryRig.remove(carriedEnemy.carriedDisplay);disposeDisplayMaterials(carriedEnemy.carriedDisplay);carriedEnemy.carriedDisplay=null;
  }
  carryRig.visible=false;
}

function disposeDisplayMaterials(display){
  if(!display||display.userData.actualCarriedEnemy||display.userData.sharedMachineDisplay)return;
  const disposed=new Set();
  display.traverse((child)=>{
    const materials=child.isMesh?(Array.isArray(child.material)?child.material:[child.material]):[];
    materials.forEach((entry)=>{if(entry&&!disposed.has(entry)){entry.dispose();disposed.add(entry);}});
  });
}

function createStoredMachineDisplay(source){
  const savedUserData=[];
  source.traverse((part)=>{savedUserData.push([part,part.userData]);part.userData={};});
  let display;
  try{display=source.clone(true);}
  catch(error){console.warn("Could not prepare the chamber display; taming will still complete.",error);return null;}
  finally{savedUserData.forEach(([part,userData])=>{part.userData=userData;});}
  display.userData.actualCarriedEnemy=null;display.userData.sharedMachineDisplay=true;
  display.traverse((child)=>{
    if(!child.isMesh)return;
    child.userData={};child.castShadow=false;child.frustumCulled=true;
  });
  display.position.set(0,.35,0);display.rotation.set(0,0,0);display.scale.setScalar(.42);display.visible=true;
  const poseSourceNodes=[],poseDisplayNodes=[];
  source.traverse((node)=>{if(node!==source)poseSourceNodes.push(node);});
  display.traverse((node)=>{if(node!==display)poseDisplayNodes.push(node);});
  display.userData.poseSourceNodes=poseSourceNodes;display.userData.poseDisplayNodes=poseDisplayNodes;
  return display;
}

function syncStoredMachineStunnedPose(machine,ally){
  const display=machine.display;if(!display)return;
  const sourceNodes=display.userData.poseSourceNodes,displayNodes=display.userData.poseDisplayNodes;
  if(sourceNodes&&displayNodes){
    const count=Math.min(sourceNodes.length,displayNodes.length);
    for(let index=0;index<count;index+=1){
      const source=sourceNodes[index],target=displayNodes[index];
      target.position.copy(source.position);target.quaternion.copy(source.quaternion);target.scale.copy(source.scale);target.visible=source.visible;
    }
  }
  display.position.set(0,.35,0);
  display.rotation.set(ally.group.rotation.x,0,ally.group.rotation.z);
  display.scale.setScalar(.42);
  display.visible=true;
}

function resetMachineTransport(clearLinked=false){
  stopCarryTutorial();
  clearDemolitionSequence();
  if(clearLinked)carryTutorialSeen=false;
  clearCarryDisplay();
  if(carriedEnemy){carriedEnemy.carried=false;carriedEnemy=null;}
  for(const machine of tamingMachines){
    if(machine.display&&(clearLinked||machine.processingEnemy)){
      machine.group.remove(machine.display);disposeDisplayMaterials(machine.display);machine.display=null;
    }
    machine.storedDisplay=null;
    if(machine.processingEnemy){machine.processingEnemy.processing=false;machine.processingEnemy.processingMachine=null;}
    machine.processingEnemy=null;machine.readyAt=0;
    if(clearLinked)machine.tamedEnemy=null;
  }
}

function pickUpCapturableEnemy(enemy){
  if(!enemy?.capturable||carriedEnemy||enemies.some((candidate)=>candidate.carried)){
    statusEl.textContent="You can carry only one robot - place or demolish the current unit first";return false;
  }
  enemy.capturable=false;enemy.carried=true;enemy.steering.set(0,0,0);
  if(enemy.typeId===1)applyCrawlerMalfunctionEffects(enemy,clock.elapsedTime,0);
  if(enemy.captureMarker){enemy.group.remove(enemy.captureMarker);enemy.captureMarker.material.dispose();enemy.captureMarker=null;}
  removeCaptureLabel(enemy);
  enemy.originalWorldScale=enemy.group.scale.x;
  const display=enemy.group;display.visible=true;display.position.set(0,.05,-.08);display.rotation.set(0,0,0);display.scale.setScalar(.12);
  display.userData.actualCarriedEnemy=true;
  carryRig.add(display);carryRig.visible=true;enemy.carriedDisplay=display;carriedEnemy=enemy;
  if(!carryTutorialSeen){
    carryTutorialSeen=true;carryTutorialActive=true;carryTutorialRefreshAt=0;ensureCarryTutorialLines();
  }
  worldTone(enemy.group,420,.1,.07,"triangle");worldTone(enemy.group,620,.16,.06,"sine",sfxBus,.09);
  statusEl.textContent=carryTutorialActive
    ? `Tutorial: follow green to install ${enemy.type.name}, or red to demolish it`
    : `Carrying ${enemy.type.name} - highlighted chambers tame it; red chute demolishes it`;
  updateEnemyCount();return true;
}

function depositCarriedEnemy(machine){
  if(!carriedEnemy||!machine||machine.processingEnemy||machine.tamedEnemy)return false;
  const enemy=carriedEnemy,display=enemy.carriedDisplay;
  carryRig.remove(display);machine.group.add(display);display.position.set(0,.35,0);display.rotation.set(0,0,0);display.scale.setScalar(.42);
  display.traverse((child)=>{if(child.isMesh)child.frustumCulled=true;});
  carryRig.visible=false;enemy.carriedDisplay=null;enemy.carried=false;enemy.processing=true;enemy.processingMachine=machine;
  machine.processingEnemy=enemy;machine.display=display;machine.readyAt=clock.elapsedTime+5;machine.repairSoundAt=clock.elapsedTime;carriedEnemy=null;
  stopCarryTutorial();
  const prepareStoredDisplay=()=>{
    if(machine.processingEnemy===enemy&&!machine.storedDisplay)machine.storedDisplay=createStoredMachineDisplay(enemy.group);
  };
  if("requestIdleCallback" in window)window.requestIdleCallback(prepareStoredDisplay,{timeout:2500});
  else window.setTimeout(prepareStoredDisplay,30);
  worldTone(machine.group,300,.14,.08,"square");worldTone(machine.group,520,.2,.07,"triangle",sfxBus,.1);
  statusEl.textContent=`Machine ${machine.index+1} processing ${enemy.type.name} - 5 seconds`;
  return true;
}

function createDemolitionEffects(){
  const effects=new THREE.Group();trashStation.group.add(effects);
  const sparkGeometry=new THREE.OctahedronGeometry(.055,0);
  const sparkMaterials=[
    new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:1}),
    new THREE.MeshBasicMaterial({color:0xff4057,transparent:true,opacity:1}),
  ];
  const sparks=[];
  for(let index=0;index<18;index+=1){
    const spark=new THREE.Mesh(sparkGeometry,sparkMaterials[index%2]);
    spark.position.set((Math.random()-.5)*.65,1.55+Math.random()*.55,1.7);
    spark.userData.velocity=new THREE.Vector3((Math.random()-.5)*2.4,1+Math.random()*2.1,.4+Math.random()*1.4);
    spark.visible=false;effects.add(spark);sparks.push(spark);
  }
  const smoke=[];
  for(let index=0;index<4;index+=1){
    const smokeMaterial=new THREE.MeshBasicMaterial({color:0x788086,transparent:true,opacity:0,depthWrite:false});
    const puff=new THREE.Mesh(new THREE.SphereGeometry(.2,7,5),smokeMaterial);
    puff.position.set((index-1.5)*.16,2,1.52);puff.visible=false;effects.add(puff);smoke.push(puff);
  }
  return {group:effects,sparks,smoke,sparkGeometry,sparkMaterials};
}

function playDemolitionStage(stage){
  const source=trashStation?.group;
  if(stage===0){worldTone(source,78,.35,.09,"sawtooth");worldTone(source,42,.45,.06,"square",sfxBus,.08);}
  else if(stage===1){worldTone(source,155,.1,.095,"square");worldTone(source,62,.22,.075,"sawtooth",sfxBus,.035);}
  else if(stage===2){worldTone(source,49,.4,.12,"sawtooth");worldTone(source,98,.24,.08,"square",sfxBus,.04);worldTone(source,235,.06,.05,"triangle",sfxBus,.14);}
  else if(stage===3){worldTone(source,72,.28,.09,"square");worldTone(source,360,.045,.055,"triangle",sfxBus,.18);}
  else {worldTone(source,210,.07,.05,"square");worldTone(source,520,.09,.035,"sine",sfxBus,.06);}
}

function clearDemolitionSequence(){
  const sequence=trashStation?.demolition;
  if(!sequence)return;
  sequence.model.visible=false;trashStation.group.remove(sequence.model);
  trashStation.group.remove(sequence.effects.group);
  sequence.effects.sparkGeometry.dispose();sequence.effects.sparkMaterials.forEach((entry)=>entry.dispose());
  sequence.effects.smoke.forEach((puff)=>{puff.geometry.dispose();puff.material.dispose();});
  disposeEnemyResources(sequence.enemy);trashStation.demolition=null;
}

function demolishCarriedEnemy(){
  if(!carriedEnemy)return false;
  if(trashStation.demolition){statusEl.textContent="Demolition station busy - wait for crusher cycle";return false;}
  const enemy=carriedEnemy;const display=enemy.carriedDisplay;
  carryRig.remove(display);carryRig.visible=false;enemy.carriedDisplay=null;carriedEnemy=null;enemy.carried=false;
  stopCarryTutorial();
  display.position.set(0,1.5,2.55);display.rotation.set(0,Math.PI,0);display.scale.setScalar(.4);display.visible=true;
  trashStation.group.add(display);
  const index=enemies.indexOf(enemy);if(index>=0)enemies.splice(index,1);
  const startAt=clock.elapsedTime;
  trashStation.demolition={enemy,model:display,effects:createDemolitionEffects(),startAt,stage:0,duration:2.25};
  trashStation.activeUntil=startAt+2.35;
  playDemolitionStage(0);
  statusEl.textContent=`Demolition started - dismantling ${enemy.type.name}`;updateEnemyCount();return true;
}

function captureEnemy(enemy,machine=enemy?.processingMachine) {
  if(!enemy||!machine||tamedEnemies.length>=5) return false;
  enemy.capturable=false;enemy.processing=false;enemy.processingMachine=null; enemy.tamed=true; enemy.alive=true; enemy.dying=false;
  enemy.health=enemy.maxHealth;
  if(enemy.captureMarker){enemy.group.remove(enemy.captureMarker);enemy.captureMarker.material.dispose();enemy.captureMarker=null;}
  removeCaptureLabel(enemy);
  let storedDisplay=machine.storedDisplay;
  if(machine.display){
    machine.group.remove(machine.display);if(machine.display!==enemy.group)disposeDisplayMaterials(machine.display);machine.display=null;
  }
  machine.storedDisplay=null;
  if(enemy.group.parent!==scene)scene.add(enemy.group);
  enemy.group.userData.actualCarriedEnemy=null;
  enemy.group.scale.setScalar(enemy.originalWorldScale||enemy.type.scale);
  enemy.group.rotation.set(0,enemy.group.rotation.y,0);enemy.group.position.set(machine.group.position.x,enemy.flying?1.15:0,machine.group.position.z+2.4);enemy.group.visible=true;
  if(storedDisplay){machine.group.add(storedDisplay);machine.display=storedDisplay;}
  machine.processingEnemy=null;machine.readyAt=0;machine.tamedEnemy=enemy;enemy.machineSlot=machine.index;
  addTamedAura(enemy);
  enemy.tamedNextAttack=clock.elapsedTime+.4;enemy.tamedStunnedUntil=0;enemy.tamedRepairStartedAt=null;enemy.abilityAt=clock.elapsedTime+2+Math.random()*2;enemy.followSlot=tamedEnemies.length;
  tamedEnemies.push(enemy); renderSquadUI(); updateEnemyCount();
  playTamedRepairSound(machine.group);
  speakSquadAlert(`${enemy.type.name} linked to the squad.`);
  statusEl.textContent=`${enemy.type.name} captured - squad ${tamedEnemies.length}/5`;
  return true;
}

function captureNearestEnemy() {
  if(!gameplayActive()) return;
  if(!carriedEnemy)carriedEnemy=enemies.find((candidate)=>candidate.carried)||null;
  if(carriedEnemy){
    let nearestMachine=null,nearestDistance=3.2;
    for(const machine of tamingMachines){
      if(machine.processingEnemy||machine.tamedEnemy)continue;
      const distance=playerDistanceTo(machine.group.position);
      if(distance<nearestDistance){nearestMachine=machine;nearestDistance=distance;}
    }
    if(nearestMachine){depositCarriedEnemy(nearestMachine);return;}
    if(playerDistanceTo(trashStation.group.position)<3.3){demolishCarriedEnemy();return;}
    statusEl.textContent="Carry unit to a highlighted empty glass chamber or the red demolition chute";return;
  }
  let nearest=null,nearestDistance=2.8;
  for(const enemy of enemies){
    if(!enemy.capturable) continue;
    const distance=playerDistanceTo(enemy.group.position);
    if(distance<nearestDistance){nearest=enemy;nearestDistance=distance;}
  }
  if(nearest) pickUpCapturableEnemy(nearest);
  else statusEl.textContent="No recoverable enemy nearby";
}

function updateCapturePrompt() {
  let nearest=null,nearestDistance=2.8;
  for(const enemy of enemies){
    if(!enemy.capturable)continue;
    const distance=playerDistanceTo(enemy.group.position);
    if(distance<nearestDistance){nearest=enemy;nearestDistance=distance;}
  }
  if(nearest){
    statusEl.textContent=carriedEnemy?"Carry unit to a highlighted destination":`${isMobileDevice?"Tap USE":"Press E"} to pick up ${nearest.type.name}`;
  }
}

const mobileMarkerWorldPosition=new THREE.Vector3();
const mobileMarkerProjectedPosition=new THREE.Vector3();
let mobileWorldUiAt=0;

function placeMobileWorldMarker(element,worldPosition,maxDistance){
  const distance=playerDistanceTo(worldPosition);
  mobileMarkerProjectedPosition.copy(worldPosition).project(camera);
  const inFront=mobileMarkerProjectedPosition.z>=-1&&mobileMarkerProjectedPosition.z<=1;
  const insideView=Math.abs(mobileMarkerProjectedPosition.x)<=.94&&mobileMarkerProjectedPosition.y<=.82&&mobileMarkerProjectedPosition.y>=-.78;
  if(!inFront||!insideView||distance>maxDistance){element.classList.remove("visible","edge");return false;}
  const rawX=(mobileMarkerProjectedPosition.x*.5+.5)*window.innerWidth;
  const rawY=(-mobileMarkerProjectedPosition.y*.5+.5)*window.innerHeight;
  const safeX=THREE.MathUtils.clamp(rawX,92,window.innerWidth-92);
  const safeY=THREE.MathUtils.clamp(rawY,66,window.innerHeight-94);
  element.style.left=`${safeX}px`;element.style.top=`${safeY}px`;
  element.classList.add("visible");
  element.classList.toggle("edge",Math.abs(rawX-safeX)>2||Math.abs(rawY-safeY)>2);
  return true;
}

function updateMobileWorldUI(elapsed){
  if(!isMobileDevice)return;
  if(!mobilePlaying||!mobileLandscapeQuery.matches){
    mobileWorldUiEl.querySelectorAll(".mobile-world-marker.visible").forEach((marker)=>marker.classList.remove("visible"));
    return;
  }
  if(elapsed<mobileWorldUiAt)return;
  mobileWorldUiAt=elapsed+.05;
  for(const machine of tamingMachines){machine.mobileMarker.classList.remove("visible","edge");machine.mobileRemoveButton.hidden=true;}
  const eligibleMachines=carriedEnemy
    ? tamingMachines.filter((machine)=>!machine.processingEnemy&&!machine.tamedEnemy)
    : tamingMachines.filter((machine)=>machine.processingEnemy||machine.tamedEnemy);
  let relevantMachine=eligibleMachines.sort((a,b)=>playerDistanceTo(a.group.position)-playerDistanceTo(b.group.position))[0]||null;
  if(!relevantMachine&&!carriedEnemy){
    const nearestEmpty=[...tamingMachines].sort((a,b)=>playerDistanceTo(a.group.position)-playerDistanceTo(b.group.position))[0];
    if(nearestEmpty&&playerDistanceTo(nearestEmpty.group.position)<=5.5)relevantMachine=nearestEmpty;
  }
  if(relevantMachine){
    relevantMachine.removeButton.getWorldPosition(mobileMarkerWorldPosition);mobileMarkerWorldPosition.y+=.38;
    const distance=playerDistanceTo(relevantMachine.group.position);
    const visible=placeMobileWorldMarker(relevantMachine.mobileMarker,mobileMarkerWorldPosition,carriedEnemy?24:10);
    if(visible){
      relevantMachine.mobileMarker.classList.remove("action","processing","occupied");
      if(relevantMachine.tamedEnemy){
        relevantMachine.mobileMarker.classList.add("occupied");
        relevantMachine.mobileMarkerTitle.textContent=`M${relevantMachine.index+1} · ${relevantMachine.tamedEnemy.type.name}`;
        relevantMachine.mobileMarkerStatus.textContent=distance<=6.5?"TAP × TO REMOVE":"MOVE CLOSER TO MANAGE";
        relevantMachine.mobileRemoveButton.hidden=distance>6.5;
      }else if(relevantMachine.processingEnemy){
        relevantMachine.mobileMarker.classList.add("processing");
        relevantMachine.mobileMarkerTitle.textContent=`M${relevantMachine.index+1} · PROCESSING`;
        relevantMachine.mobileMarkerStatus.textContent=`TAMING · ${Math.max(0,Math.ceil(relevantMachine.readyAt-elapsed))}S`;
      }else{
        relevantMachine.mobileMarkerTitle.textContent=`M${relevantMachine.index+1} · EMPTY`;
        relevantMachine.mobileMarkerStatus.textContent=carriedEnemy?"TAP USE TO INSTALL":"ROBOT CHAMBER READY";
        relevantMachine.mobileMarker.classList.toggle("action",Boolean(carriedEnemy));
      }
    }
  }
  mobileMarkerWorldPosition.copy(trashStation.group.position);mobileMarkerWorldPosition.y+=4.35;
  const trashDistance=playerDistanceTo(trashStation.group.position);
  const showTrash=Boolean(carriedEnemy)||trashDistance<=6.5;
  if(showTrash&&placeMobileWorldMarker(mobileTrashMarkerEl,mobileMarkerWorldPosition,carriedEnemy?24:6.5)){
    mobileTrashTitleEl.textContent="DEMOLITION STATION";
    mobileTrashStatusEl.textContent=carriedEnemy?(playerDistanceTo(trashStation.group.position)<3.3?"TAP USE TO DEMOLISH":"BRING ROBOT TO RED CHUTE"):"PERMANENT ROBOT REMOVAL";
    mobileTrashMarkerEl.classList.toggle("action",Boolean(carriedEnemy));
  }else mobileTrashMarkerEl.classList.remove("visible","edge");
  let nearestCapture=null,nearestCaptureDistance=8;
  if(!carriedEnemy){
    for(const enemy of enemies){
      if(!enemy.capturable)continue;
      const distance=playerDistanceTo(enemy.group.position);
      if(distance<nearestCaptureDistance){nearestCapture=enemy;nearestCaptureDistance=distance;}
    }
  }
  if(nearestCapture){
    mobileMarkerWorldPosition.copy(nearestCapture.group.position);mobileMarkerWorldPosition.y+=Math.max(1.5,nearestCapture.type.scale*1.9);
    if(placeMobileWorldMarker(mobileCaptureMarkerEl,mobileMarkerWorldPosition,8)){
      mobileCaptureTitleEl.textContent=`RECOVER · ${nearestCapture.type.name}`;
      mobileCaptureStatusEl.textContent=nearestCaptureDistance<=2.8?"TAP USE TO PICK UP":`${Math.ceil(nearestCaptureDistance)}M · MOVE CLOSER`;
      mobileCaptureMarkerEl.classList.toggle("action",nearestCaptureDistance<=2.8);
    }
  }else mobileCaptureMarkerEl.classList.remove("visible");
}

function removeMachineCompanion(machine){
  if(!machine?.tamedEnemy)return false;
  const name=machine.tamedEnemy.type.name;
  removeTamedEnemy(machine.tamedEnemy);
  worldTone(machine.group,210,.12,.075,"square");worldTone(machine.group,105,.24,.065,"sawtooth",sfxBus,.08);
  statusEl.textContent=`Machine ${machine.index+1}: ${name} removed from squad`;
  return true;
}

function updateDemolitionSequence(delta,elapsed){
  const sequence=trashStation.demolition;
  if(!sequence)return;
  const progress=THREE.MathUtils.clamp((elapsed-sequence.startAt)/sequence.duration,0,1);
  const model=sequence.model;
  const intake=reloadPhase(progress,0,.27);
  const feed=reloadPhase(progress,.24,.6);
  const crush=reloadPhase(progress,.48,.82);
  model.position.z=THREE.MathUtils.lerp(2.55,1.52,intake)-.83*feed;
  model.position.y=THREE.MathUtils.lerp(1.5,1.58,intake)-.18*crush;
  model.position.x=Math.sin(elapsed*38)*.045*crush;
  model.rotation.y=Math.PI+Math.sin(elapsed*17)*.09*feed;
  model.rotation.x=-.18*feed+Math.sin(elapsed*31)*.055*crush;
  model.rotation.z=Math.sin(elapsed*42)*.08*crush;
  model.scale.set(.4-.13*crush,.4-.34*crush,.4-.2*crush);
  model.visible=progress<.89;

  if(sequence.stage<1&&progress>=.22){sequence.stage=1;playDemolitionStage(1);statusEl.textContent="Crusher rollers engaged";}
  if(sequence.stage<2&&progress>=.47){sequence.stage=2;playDemolitionStage(2);statusEl.textContent="Hydraulic compression active";}
  if(sequence.stage<3&&progress>=.72){sequence.stage=3;playDemolitionStage(3);statusEl.textContent="Separating reusable components";}
  if(sequence.stage<4&&progress>=.93){sequence.stage=4;playDemolitionStage(4);}

  sequence.effects.sparks.forEach((spark,index)=>{
    const effectLimit=Math.ceil(sequence.effects.sparks.length*GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity);
    if(index>=effectLimit||progress<.39+index*.006||progress>.86){spark.visible=false;return;}
    if(!spark.visible){spark.visible=true;spark.position.set((Math.random()-.5)*.65,1.45+Math.random()*.65,1.62);}
    spark.position.addScaledVector(spark.userData.velocity,delta);
    spark.userData.velocity.y-=4.2*delta;
    spark.rotation.x+=delta*15;spark.rotation.z+=delta*11;
    spark.scale.setScalar(.7+Math.sin(elapsed*35+index)*.3);
  });
  sequence.effects.sparkMaterials.forEach((entry)=>{entry.opacity=progress>.72?Math.max(0,(.88-progress)/.16):1;});
  sequence.effects.smoke.forEach((puff,index)=>{
    const effectLimit=Math.ceil(sequence.effects.smoke.length*GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity);
    if(index>=effectLimit||progress<.57+index*.035){puff.visible=false;return;}
    puff.visible=true;
    const smokeAge=Math.max(0,progress-.57-index*.035);
    puff.position.y=1.85+smokeAge*2.3;puff.position.z=1.5-smokeAge*.45;
    puff.position.x=(index-1.5)*.16+Math.sin(elapsed*2.5+index)*.1;
    puff.scale.setScalar(1+smokeAge*4.5);
    puff.material.opacity=Math.max(0,.28-smokeAge*.42);
  });

  if(progress>=1){
    const name=sequence.enemy.type.name;
    clearDemolitionSequence();
    statusEl.textContent=`${name} fully dismantled - station ready`;
  }
}

function animateTransportedEnemy(enemy,elapsed,placement){
  if(!enemy?.group)return;
  const stunnedDuration=getEnemyDefinition(enemy.typeId).animations.stunnedDuration||2.2;
  applyEnemyPose(enemy,{elapsed,stunnedProgress:(elapsed%stunnedDuration)/stunnedDuration});
  const carried=placement==="carry";
  enemy.group.position.set(0,carried ? .05 : .35,carried ? -.08 : 0);
  enemy.group.rotation.x=0;
  enemy.group.rotation.y=0;
  // Keep the robot readable in the hand, but never spin it inside the chamber.
  enemy.group.rotation.z=carried?Math.sin(elapsed*17+(enemy.seed||0))*.018:0;
  enemy.group.scale.setScalar(carried ? .12 : .42);
  if(enemy.typeId===1)updateCrawlerStunnedSound(enemy,elapsed);
}

function updateMachineRepairAnimation(machine,delta,elapsed,progress,linkedRecovery=false){
  const active=Boolean(machine.processingEnemy);
  const effectDensity=GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity;
  const scannerLimit=Math.max(1,Math.ceil(machine.repairScanners.length*effectDensity));
  machine.repairRig.visible=true;
  machine.repairDeploy=THREE.MathUtils.damp(machine.repairDeploy||0,active?1:0,active?7.5:5.5,delta);
  const deploy=machine.repairDeploy*machine.repairDeploy*(3-2*machine.repairDeploy);
  machine.repairArmRig.visible=machine.repairDeploy>.012;
  machine.repairHatches.forEach((hatch,index)=>{
    const stagger=THREE.MathUtils.clamp(deploy*1.18-index*.06,0,1);
    hatch.upperHatch.position.y=.27+stagger*.36;
    hatch.lowerHatch.position.y=-.27-stagger*.36;
    hatch.upperHatch.rotation.z=(index?1:-1)*stagger*.08;
    hatch.lowerHatch.rotation.z=(index?-1:1)*stagger*.08;
    hatch.hatchSeam.material.opacity=.2+stagger*.78;
    hatch.hatchSeam.scale.x=.21+stagger*.12;
  });
  machine.repairArms.forEach((arm,index)=>{
    arm.pivot.position.set(arm.side*THREE.MathUtils.lerp(1.42,1.31,deploy),THREE.MathUtils.lerp(2.42,2.38,deploy),THREE.MathUtils.lerp(-.34,.28,deploy));
    const armScale=.12+deploy*.88;arm.pivot.scale.setScalar(armScale);
    arm.pivot.rotation.y=arm.side*THREE.MathUtils.lerp(.72,0,deploy);
    arm.shoulderRing.material.opacity=.18+deploy*.72;
    if(!active){
      arm.pivot.rotation.z=arm.side*THREE.MathUtils.lerp(1.18,.08,deploy);
      arm.elbow.rotation.z=-arm.side*.08;
      arm.elbow.position.y=0;
      arm.wrist.rotation.y=0;
      arm.emitter.material.opacity=.08*deploy;
      arm.beam.visible=false;arm.beam.material.opacity=0;
      arm.prongs.forEach((prong,prongIndex)=>{prong.rotation.z=(prongIndex?1:-1)*.12;});
    }
  });
  if(linkedRecovery){
    // A recovering companion keeps its stunned pose while the station itself
    // remains parked. Only the internal scanner circles run, using the same
    // sweep as the five-second taming sequence but in recovery green.
    const cycle=elapsed*5.2+machine.index*.7;
    machine.repairScanners.forEach((scanner,index)=>{
      scanner.visible=index<scannerLimit;
      scanner.material.color.setHex(0x39ff78);
      scanner.position.y=.58+((elapsed*1.25+index*.7)%2.05);
      scanner.rotation.z+=delta*(index%2?1.7:-1.7);
      scanner.material.opacity=.26+.48*Math.max(0,Math.sin(cycle+index*1.4));
      scanner.scale.setScalar(.9+Math.sin(cycle*.7+index)*.08);
    });
    machine.repairSparks.forEach((spark)=>{spark.visible=false;});
    return;
  }
  if(!active){
    machine.repairScanners.forEach((scanner,index)=>{
      scanner.visible=index<scannerLimit;
      scanner.material.color.setHex(0x72f6ff);
      scanner.position.y=.72+index*.83;
      scanner.rotation.z+=delta*(index%2?.12:-.12);
      scanner.material.opacity=.1;
      scanner.scale.setScalar(1);
    });
    machine.repairSparks.forEach((spark)=>{spark.visible=false;});
    return;
  }
  const cycle=elapsed*5.2+machine.index*.7;
  machine.repairArms.forEach((arm,index)=>{
    const calibration=THREE.MathUtils.smoothstep(deploy,.45,.92);
    const workingStroke=.5+.5*Math.sin(cycle+index*Math.PI);
    const precisionWave=Math.sin(cycle*1.35+index);
    arm.pivot.rotation.z=arm.side*THREE.MathUtils.lerp(.82,.13+.18*workingStroke,calibration);
    arm.elbow.rotation.z=-arm.side*(.08+calibration*(.12+.16*precisionWave));
    arm.elbow.position.y=-workingStroke*.11*calibration;
    arm.wrist.rotation.y=cycle*(index?-.34:.34)*calibration;
    arm.wrist.rotation.z=Math.sin(cycle*1.8+index)*.12*calibration;
    arm.prongs.forEach((prong,prongIndex)=>{
      const direction=prongIndex?1:-1;
      prong.rotation.z=direction*(.12+.22*workingStroke*calibration);
    });
    const toolPulse=Math.max(0,Math.sin(cycle*2.4+index*Math.PI))*calibration;
    arm.emitter.material.opacity=.12*deploy+.84*toolPulse;
    arm.emitter.scale.setScalar(.72+deploy*.18+toolPulse*.42);
    arm.beam.visible=calibration>.25&&toolPulse>.18;
    arm.beam.material.opacity=arm.beam.visible?toolPulse*.48:0;
    arm.beam.scale.y=.22+workingStroke*.26;
    arm.beam.position.y=-.47-arm.beam.scale.y;
  });
  machine.repairScanners.forEach((scanner,index)=>{
    scanner.visible=index<scannerLimit;
    scanner.material.color.setHex(0x72f6ff);
    scanner.position.y=.58+((elapsed*1.25+index*.7)%2.05);
    scanner.rotation.z+=delta*(index%2?1.7:-1.7);
    scanner.material.opacity=.26+.48*Math.max(0,Math.sin(cycle+index*1.4));
    scanner.scale.setScalar(.9+Math.sin(cycle*.7+index)*.08);
  });
  machine.repairSparks.forEach((spark,index)=>{
    const burst=Math.sin(cycle*2.6+index*1.91);
    const sparkLimit=Math.ceil(machine.repairSparks.length*effectDensity);
    spark.visible=index<sparkLimit&&burst>.58;
    if(!spark.visible)return;
    const side=index%2?-1:1,age=(burst-.58)/.42;
    spark.position.set(side*(.28+age*.42),.72+(index%4)*.36+age*.16,(index%3-.9)*.18);
    spark.rotation.x+=delta*18;spark.rotation.z+=delta*13;
    spark.scale.setScalar(.7+age*.8);spark.material.opacity=(1-age)*.9;
  });
  if(elapsed>=machine.repairSoundAt){
    worldTone(machine.group,126+progress*74,.1,.035,"square");
    worldTone(machine.group,365+progress*180,.055,.025,"triangle",sfxBus,.045);
    machine.repairSoundAt=elapsed+.72;
  }
}

function updateTamingMachines(delta,elapsed){
  updateDemolitionSequence(delta,elapsed);
  const carrying=Boolean(carriedEnemy);
  if(carriedEnemy)animateTransportedEnemy(carriedEnemy,elapsed,"carry");
  for(const machine of tamingMachines){
    const linkedRecovery=Boolean(machine.tamedEnemy&&elapsed<(machine.tamedEnemy.tamedStunnedUntil||0));
    const machineRepairing=Boolean(machine.processingEnemy)||linkedRecovery;
    const available=!machine.processingEnemy&&!machine.tamedEnemy;
    const highlighted=carrying&&available;
    machine.ringMaterial.opacity=highlighted ? .88 : machineRepairing ? .7 : machine.tamedEnemy ? .38 : .16;
    machine.ringMaterial.color.setHex(linkedRecovery?0xffd35c:machine.processingEnemy?0x43f4d0:machine.tamedEnemy?0x2587ff:0x43f4d0);
    machine.glassMaterial.emissive.setHex(highlighted?0x176c78:machineRepairing?0x66551a:machine.tamedEnemy?0x124c9a:0x07151a);
    machine.glassMaterial.emissiveIntensity=highlighted ? .75 : machineRepairing ? .68 : machine.tamedEnemy ? .28 : .08;
    machine.slotLight.material.color.setHex(machineRepairing?0xffd35c:machine.tamedEnemy?0x2587ff:0x43f4d0);
    machine.slotLight.material.opacity=highlighted ? .95 : machineRepairing ? .92 : machine.tamedEnemy ? .6 : .25;
    // During linked 20-second recovery, remove all three floor rings. The
    // internal green scanner circles provide the only recovery indicator.
    machine.ring.visible=!linkedRecovery;
    machine.recoveryRingGreen.visible=false;machine.recoveryRingYellow.visible=false;
    machine.recoveryRingGreenMaterial.opacity=0;machine.recoveryRingYellowMaterial.opacity=0;
    machine.recoveryRingGreen.scale.setScalar(1);machine.recoveryRingYellow.scale.setScalar(1);
    machine.buttonMaterial.color.setHex(machine.tamedEnemy?0xff3048:0x641b26);
    machine.interactionHighlight.shells.forEach((shell)=>{shell.visible=highlighted;});
    machine.interactionHighlight.material.opacity=.32+Math.sin(elapsed*7+machine.index)*.12;
    machine.carryLabel.visible=highlighted&&!isMobileDevice;
    if(highlighted){machine.carryLabel.material.opacity=.8+Math.sin(elapsed*6+machine.index)*.18;machine.carryLabel.position.y=4.15+Math.sin(elapsed*4+machine.index)*.08;}
    if(highlighted){const pulse=1+Math.sin(elapsed*6+machine.index)*.08;machine.ring.scale.setScalar(pulse);}
    else machine.ring.scale.setScalar(1);
    if(machine.processingEnemy){
      const progress=THREE.MathUtils.clamp(1-(machine.readyAt-elapsed)/5,0,1);
      if(machine.display)animateTransportedEnemy(machine.processingEnemy,elapsed,"machine");
      updateMachineRepairAnimation(machine,delta,elapsed,progress);
      machine.ring.scale.setScalar(.85+progress*.22);
      if(elapsed>=machine.readyAt){
        if(!machine.storedDisplay)machine.storedDisplay=createStoredMachineDisplay(machine.processingEnemy.group);
        captureEnemy(machine.processingEnemy,machine);
      }
    }else if(linkedRecovery){
      const ally=machine.tamedEnemy;
      const progress=THREE.MathUtils.clamp((elapsed-(ally.tamedRepairStartedAt??elapsed))/20,0,1);
      syncStoredMachineStunnedPose(machine,ally);
      updateMachineRepairAnimation(machine,delta,elapsed,progress,true);
    }else{
      if(machine.display){machine.display.position.set(0,.35,0);machine.display.rotation.set(0,0,0);}
      updateMachineRepairAnimation(machine,delta,elapsed,0);
    }
  }
  const trashAvailable=!trashStation.demolition;
  const trashHighlighted=carrying&&trashAvailable;
  trashStation.ringMaterial.opacity=trashHighlighted ? .9 : .16;
  const crusherActive=carrying||elapsed<trashStation.activeUntil;
  trashStation.light.material.opacity=crusherActive ? .95 : .25;
  trashStation.interactionHighlight.shells.forEach((shell)=>{shell.visible=trashHighlighted;});
  trashStation.interactionHighlight.material.opacity=.38+Math.sin(elapsed*8)*.12;
  trashStation.carryLabel.visible=trashHighlighted&&!isMobileDevice;
  if(trashHighlighted){trashStation.carryLabel.material.opacity=.8+Math.sin(elapsed*6)*.18;trashStation.carryLabel.position.y=5.08+Math.sin(elapsed*4)*.08;}
  if(trashHighlighted)trashStation.ring.scale.setScalar(1+Math.sin(elapsed*7)*.08);else trashStation.ring.scale.setScalar(1);
  trashStation.crusherDrums.forEach((drum,index)=>{drum.rotation.y+=delta*(crusherActive?7.5:.55)*(index%2===0?1:-1);});
  const crushAmount=crusherActive ? .08+.09*(.5+.5*Math.sin(elapsed*13)) : .018*(.5+.5*Math.sin(elapsed*2.2));
  trashStation.crusherJaws.forEach((jaw)=>{jaw.group.position.y=jaw.baseY+jaw.direction*crushAmount;});
  trashStation.warningLights.forEach((beacon,index)=>{
    beacon.material.opacity=crusherActive ? .4+.6*Math.max(0,Math.sin(elapsed*10+index*Math.PI)) : .18;
    beacon.scale.y=crusherActive?1+Math.max(0,Math.sin(elapsed*10+index*Math.PI))*.18:1;
  });
  trashStation.screenMaterial.opacity=crusherActive ? .7+.25*Math.sin(elapsed*9) : .38+.12*Math.sin(elapsed*2);
  trashStation.core.rotation.z+=delta*(crusherActive?3.8:.55);
  trashStation.core.material.opacity=crusherActive ? .9 : .42;
}

function removeTamedEnemy(enemy) {
  if(!enemy?.tamed) return;
  removeCompanionRepairDrones(enemy);
  enemy.tamed=false;enemy.alive=false;
  const machine=tamingMachines[enemy.machineSlot];
  if(machine?.tamedEnemy===enemy){
    machine.tamedEnemy=null;
    if(machine.display){machine.group.remove(machine.display);disposeDisplayMaterials(machine.display);machine.display=null;}
  }
  for(let i=abilityEffects.length-1;i>=0;i-=1){
    if(abilityEffects[i].owner===enemy||abilityEffects[i].target===enemy)removeAbilityEffect(i);
  }
  const teamIndex=tamedEnemies.indexOf(enemy); if(teamIndex>=0)tamedEnemies.splice(teamIndex,1);
  const enemyIndex=enemies.indexOf(enemy); if(enemyIndex>=0)enemies.splice(enemyIndex,1);
  scene.remove(enemy.group); disposeEnemyResources(enemy);
  tamedEnemies.forEach((ally,index)=>{ally.followSlot=index;});
  renderSquadUI(); updateEnemyCount();
  statusEl.textContent=`${enemy.type.name} removed from squad`;
}

function expireCapturableEnemies() {
  const expired=enemies.filter((enemy)=>enemy.capturable && enemy.captureTimeRemaining<=0);
  for(const enemy of expired){
    enemy.capturable=false; enemy.dying=true; enemy.deathTime=0;
    if(enemy.captureMarker){enemy.group.remove(enemy.captureMarker);enemy.captureMarker.material.dispose();enemy.captureMarker=null;}
    removeCaptureLabel(enemy);
    playEnemySound(enemy,"death");
  }
}

function updateEnemyCount() {
  enemyCountEl.textContent = String(livingHostiles().length + spawnQueue.length);
}

function beginWave(waveNumber) {
  if (gameOver || missionComplete) return;
  currentWave = waveNumber;
  expireCapturableEnemies();
  waveSelectEl.value = String(currentWave);
  scoreEl.textContent = String(currentWave);
  waveActive = true;
  waveStartedAt=performance.now();
  nextWaveAt=0;
  spawnCooldown = .15;
  spawnQueue = [];
  const composition = WAVE_PLAN[currentWave - 1];
  composition.forEach(([typeId, amount], compositionIndex) => {
    for (let i = 0; i < amount; i += 1) {
      const isElite = currentWave % 5 === 0 && currentWave < 50 &&
        compositionIndex === composition.length - 1 && i === amount - 1;
      spawnQueue.push({ typeId, elite: isElite });
    }
  });
  // Mix roles so swarms, ranged units, support and heavy enemies overlap instead
  // of arriving in predictable type blocks. The final boss always deploys first.
  for(let index=spawnQueue.length-1;index>0;index-=1){
    const swapIndex=Math.floor(Math.random()*(index+1));
    [spawnQueue[index],spawnQueue[swapIndex]]=[spawnQueue[swapIndex],spawnQueue[index]];
  }
  if(currentWave===50){
    const bossIndex=spawnQueue.findIndex((entry)=>entry.typeId===20);
    if(bossIndex>0)spawnQueue.unshift(spawnQueue.splice(bossIndex,1)[0]);
  }
  statusEl.textContent = currentWave === 50 ? "FINAL WAVE - DESTROY THE OUTPOST CORE" : `Wave ${currentWave} incoming`;
  tone(currentWave % 10 === 0 ? 110 : 220, .4, .12, "sawtooth");
  updateEnemyCount();
}

function updateSpawning(delta) {
  if (!waveActive || spawnQueue.length === 0) return;
  spawnCooldown -= delta;
  // Graphics quality never changes wave difficulty or active-enemy pacing.
  const livingLimit = Math.min(11, 6 + Math.floor(currentWave / 5));
  if (spawnCooldown <= 0 && livingHostiles().length < livingLimit) {
    const next = spawnQueue.shift();
    spawnEnemy(next.typeId, next.elite);
    spawnCooldown = currentWave === 50 ? 1.05 : .55;
    updateEnemyCount();
  }
}

function projectileMaterial(color) {
  if (!projectileMaterials.has(color)) {
    projectileMaterials.set(color, new THREE.MeshBasicMaterial({ color }));
  }
  return projectileMaterials.get(color);
}

function fireEnemyProjectile(enemy, homing = false) {
  const color = enemy.type.style === "toxic" ? 0x76ff52 :
    enemy.type.style === "sniper" ? 0xff334f :
    enemy.type.style === "rocket" ? 0xff8b3d : enemy.type.color;
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial(color));
  const start = enemy.group.position.clone();
  start.y = enemy.flying ? enemy.group.position.y + .5 : Math.max(1, enemy.type.scale);
  mesh.position.copy(start);
  scene.add(mesh);
  const target = new THREE.Vector3(camera.position.x, PLAYER.eyeHeight * .75, camera.position.z);
  const direction = target.sub(start).normalize();
  const speed = enemy.type.style === "sniper" ? 17 : enemy.type.style === "rocket" ? 5 : 8;
  enemyProjectiles.push({ mesh, direction, speed, damage: enemy.damage, homing, life: 5 });
}

const nanoCellGeometry=new THREE.DodecahedronGeometry(.28,0);
const nanoCellMaterial=new THREE.MeshBasicMaterial({color:0x42a5ff,transparent:true,opacity:.9});
const nanoCellRingGeometry=new THREE.TorusGeometry(.42,.035,6,18);
const nanoCellMarkerGeometry=new THREE.ConeGeometry(.12,.3,5);
const nanoCellRingMaterial=new THREE.MeshBasicMaterial({color:0x83ccff,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending});

function spawnNanoCell(position){
  const group=new THREE.Group();group.position.set(position.x,.55,position.z);
  const core=new THREE.Mesh(nanoCellGeometry,nanoCellMaterial);core.scale.set(.72,1.18,.72);group.add(core);
  const ring=new THREE.Mesh(nanoCellRingGeometry,nanoCellRingMaterial);ring.rotation.x=Math.PI/2;group.add(ring);
  const marker=new THREE.Mesh(nanoCellMarkerGeometry,nanoCellRingMaterial);marker.position.y=.75;marker.rotation.z=Math.PI;group.add(marker);
  scene.add(group);nanoDrops.push({group,core,ring,baseY:.55});
}

function removeNanoCell(index){
  const drop=nanoDrops[index];if(!drop)return;
  scene.remove(drop.group);nanoDrops.splice(index,1);
}

function clearNanoCells(){
  for(let index=nanoDrops.length-1;index>=0;index-=1)removeNanoCell(index);
}

function updateNanoCells(delta,elapsed){
  for(let index=nanoDrops.length-1;index>=0;index-=1){
    const drop=nanoDrops[index];
    drop.group.position.y=drop.baseY+Math.sin(elapsed*3+index)*.12;
    drop.core.rotation.y+=delta*2.4;drop.core.rotation.x+=delta*.8;drop.ring.rotation.z+=delta*1.7;
    if(gameplayActive()&&nanoShield<NANO_SHIELD_MAX&&playerDistanceTo(drop.group.position)<1.45){
      const restored=Math.min(NANO_CELL_REPAIR,NANO_SHIELD_MAX-nanoShield);
      nanoShield+=restored;updateHealthHud();
      tone(520,.1,.075,"sine");tone(880,.2,.06,"triangle",sfxBus,.06);
      statusEl.textContent=`Nano Cell collected +${Math.round(restored)} shield`;
      removeNanoCell(index);
    }
  }
}

function damagePlayer(amount, source = "enemy") {
  if (gameOver || missionComplete) return;
  if (godMode) {
    statusEl.textContent = `God Mode blocked ${amount} damage`;
    return;
  }
  lastPlayerDamageAt=clock.elapsedTime;
  let remainingDamage=amount;
  let shieldDamage=0;
  if(nanoShield>0){
    shieldDamage=Math.min(nanoShield,remainingDamage);
    nanoShield=Math.max(0,nanoShield-shieldDamage);
    remainingDamage-=shieldDamage;
    playNanoShieldHitSound(shieldDamage);
  }
  if(remainingDamage>0){
    playerHealth=Math.max(0,playerHealth-remainingDamage);
    playPlayerHurtSound(remainingDamage);
  }
  updateHealthHud();
  statusEl.textContent=remainingDamage>0
    ? `${source} breached shield -${Math.ceil(remainingDamage)} integrity`
    : `${source} hit Nano Shield -${Math.ceil(shieldDamage)}`;
  if (playerHealth <= 0) finishGame(false);
}

function updatePlayerRegeneration(delta,elapsed){
  if(godMode||playerHealth>=PLAYER.maxHealth){
    regenStatusEl.textContent="AUTO-REPAIR STANDBY";regenStatusEl.classList.remove("active");return;
  }
  const safeTime=elapsed-lastPlayerDamageAt;
  if(safeTime<2){
    regenStatusEl.textContent=`REGEN IN ${Math.max(1,Math.ceil(2-safeTime))}S`;regenStatusEl.classList.remove("active");return;
  }
  const repair=Math.min(delta*2,PLAYER.maxHealth-playerHealth);
  if(repair<=0)return;
  playerHealth+=repair;updateHealthHud();
  regenStatusEl.textContent=`REPAIRING ${Math.ceil(playerHealth)}/${PLAYER.maxHealth}`;
  regenStatusEl.classList.add("active");
}

function updateHealthHud() {
  healthValueEl.textContent = String(Math.ceil(playerHealth));
  const percent = Math.max(0, playerHealth / PLAYER.maxHealth * 100);
  healthFillEl.style.width = `${percent}%`;
  healthFillEl.classList.toggle("danger", percent <= 30);
  const shieldPercent=Math.max(0,nanoShield/NANO_SHIELD_MAX*100);
  nanoShieldValueEl.textContent=String(Math.ceil(nanoShield));
  nanoShieldFillEl.style.width=`${shieldPercent}%`;
  nanoShieldEl.classList.toggle("depleted",nanoShield<=0);
  const nextWarningState=nanoShield<=100?"critical":nanoShield<=250?"warning":"stable";
  nanoShieldEl.classList.toggle("warning",nextWarningState==="warning");
  nanoShieldEl.classList.toggle("critical",nextWarningState==="critical");
  nanoShieldAlertEl.textContent=nextWarningState==="critical"?"!!":nextWarningState==="warning"?"!":"";
  nanoShieldEl.setAttribute("aria-label",`Nano Shield ${Math.ceil(nanoShield)} of ${NANO_SHIELD_MAX}${nextWarningState==="stable"?"":` - ${nextWarningState}`}`);
  if(nextWarningState!==nanoWarningState&&nextWarningState!=="stable")playNanoShieldWarningSound(nextWarningState);
  nanoWarningState=nextWarningState;
}

function enemyHasLineOfSight(enemy, distance, elapsed, targetPosition = camera.position) {
  if (elapsed < (enemy.sightRefreshAt || 0)) return enemy.lineOfSight;
  enemySightOrigin.copy(enemy.group.position);
  enemySightOrigin.y += enemy.flying ? .55 : Math.max(.8, enemy.type.scale);
  enemySightDirection.set(targetPosition.x, targetPosition === camera.position ? camera.position.y - .2 : Math.max(.65,targetPosition.y+.65), targetPosition.z)
    .sub(enemySightOrigin).normalize();
  enemySightRaycaster.set(enemySightOrigin, enemySightDirection);
  enemySightRaycaster.far = distance;
  const obstruction = enemySightRaycaster.intersectObjects(shootableSurfaces, false)[0];
  enemy.lineOfSight = !obstruction || obstruction.distance >= distance - .55;
  enemy.sightRefreshAt = elapsed + .28 + Math.random() * .12;
  return enemy.lineOfSight;
}

function updateEnemyAnimation(enemy, delta, elapsed, movementSpeed) {
  enemy.attackAnimation = THREE.MathUtils.damp(enemy.attackAnimation, 0, 4.5, delta);
  const movementAmount = THREE.MathUtils.clamp(movementSpeed / Math.max(.1, enemy.speed), 0, 1);
  if (movementAmount > .04) enemy.walkPhase += delta * enemy.speed * 4.2;
  const listenerDistance = enemy.group.position.distanceTo(camera.position);
  if (elapsed >= enemy.nextIdleSound && listenerDistance < 34 && elapsed>=nextAmbientEnemySoundAt) {
    playEnemySound(enemy, "idle");
    nextAmbientEnemySoundAt=elapsed+.12;
    enemy.nextIdleSound = elapsed + (enemy.typeId === 1 ? 1.35 + Math.random() * 1.1 : 2.8 + Math.random() * 3.5);
  }
  if (movementAmount > .15 && elapsed >= enemy.nextStepSound && listenerDistance < 26 && elapsed>=nextAmbientEnemySoundAt) {
    playEnemySound(enemy, enemy.flying ? "move" : "step");
    nextAmbientEnemySoundAt=elapsed+.065;
    enemy.nextStepSound = elapsed + (enemy.typeId === 1 ? .22 : enemy.flying ? .48 : THREE.MathUtils.clamp(.62 / enemy.speed, .2, .48));
  }
  // Gameplay movement and attacks remain full-rate. Presets only sample the
  // expensive articulated model pose less often, mostly for distant actors.
  const graphicsPreset=GRAPHICS_PRESETS[activeGraphicsPreset];
  const animationStride=listenerDistance>graphicsPreset.animationFarDistance
    ?graphicsPreset.animationFarStride
    :graphicsPreset.animationNearStride;
  if(animationStride>1&&(renderFrame+Math.floor(enemy.seed*10))%animationStride!==0)return;
  const stunned=elapsed<(enemy.stunnedUntil||0),stunnedDuration=stunned?(getEnemyDefinition(enemy.typeId).animations.stunnedDuration||2.2):1;
  if(stunned)updateCrawlerStunnedSound(enemy,elapsed);
  else if(enemy.typeId===1)enemy.nextCrawlerStunnedSound=0;
  const stunnedProgress=stunned?(elapsed%stunnedDuration)/stunnedDuration:null;
  applyEnemyPose(enemy,{elapsed,movementAmount,walkPhase:enemy.walkPhase,attackStrength:enemy.attackAnimation,stunnedProgress});
  if(stunned)keepEnemyAboveArenaFloor(enemy);
  if(enemy.skillAnimation&&elapsed<enemy.skillAnimation.endsAt){
    applyEnemySkillPose(enemy,getEnemyDefinition(enemy.typeId),elapsed-enemy.skillAnimation.startedAt,enemy.skillAnimation.duration);
  }else if(enemy.skillAnimation)enemy.skillAnimation=null;
}

function updateDyingEnemy(enemy, delta) {
  if(enemy.deathTime===0){
    enemy.deathBaseY=enemy.group.position.y;
    enemy.deathBaseRotationY=enemy.group.rotation.y;
    enemy.baseScale.copy(enemy.group.scale);
    enemy.group.traverse((child)=>{if(child.isMesh&&child.material)child.userData.baseOpacity=child.material.opacity;});
  }
  enemy.deathTime += delta;
  const complete=applyEnemyDeathPose(enemy,enemy.deathTime);
  if(!complete&&enemy.typeId!==1)keepEnemyAboveArenaFloor(enemy);
  return complete;
}

const ABILITY_COOLDOWNS=Object.freeze(ENEMY_DEFINITIONS.map((definition)=>definition?.skill.cooldown||0));
const abilityColor=Object.freeze(ENEMY_DEFINITIONS.map((definition)=>definition?.skill.color||0));
const TAMED_ABILITY_COLOR = 0x2587ff;

function combatAbilityColor(enemy){
  if(enemy?.tamed)return TAMED_ABILITY_COLOR;
  const definition=enemy?getEnemyDefinition(enemy.typeId):null;
  return indicatorColor(definition?.skill.indicator,abilityColor[enemy?.typeId]||0xff496c);
}

function createAbilityEffect(kind, position, options = {}) {
  const visual=createAbilityVisual(scene,kind,position,options),mesh=visual.mesh;
  const effect = {
    ...visual,damage: options.damage ?? 0,
    owner: options.owner ?? null, target: options.target ?? null, activeAfter: options.activeAfter ?? 0, tickAt: 0,
    hp: options.hp ?? 0, onExpire: options.onExpire ?? null, hitPlayer: false,
  };
  mesh.userData.abilityEffect = effect;
  if(mesh.children.length>1){
    const visibleChildren=Math.max(1,Math.ceil(mesh.children.length*GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity));
    mesh.children.forEach((child,index)=>{child.visible=index<visibleChildren;});
  }
  if (effect.hp > 0) abilityHitMeshes.push(mesh);
  abilityEffects.push(effect);
  return effect;
}

function removeAbilityEffect(index) {
  const effect = abilityEffects[index];
  if (!effect) return;
  disposeAbilityVisual(scene,effect);
  const hitIndex = abilityHitMeshes.indexOf(effect.mesh);
  if (hitIndex >= 0) abilityHitMeshes.splice(hitIndex, 1);
  abilityEffects.splice(index, 1);
}

function clearAbilityEffects() {
  for (let i = abilityEffects.length - 1; i >= 0; i -= 1) removeAbilityEffect(i);
}

function damageAbilityEffect(effect, amount) {
  if (!effect || effect.hp <= 0) return;
  effect.hp -= amount;
  effect.material.opacity = .95;
  statusEl.textContent = `${effect.kind.replaceAll("-", " ")} ${Math.max(0, effect.hp)} HP`;
  if (effect.hp <= 0) {
    const destroyedAt=effect.mesh.position.clone();
    const index = abilityEffects.indexOf(effect);
    if (index >= 0) removeAbilityEffect(index);
    worldTone(destroyedAt,760,.12,.08,"square");
  }
}

function playerDistanceTo(position) {
  return Math.hypot(camera.position.x - position.x, camera.position.z - position.z);
}

function combatTargetPosition(target) {
  return target?.group?.position || camera.position;
}

function combatTargetDistance(target, position) {
  const targetPosition=combatTargetPosition(target);
  return Math.hypot(targetPosition.x-position.x,targetPosition.z-position.z);
}

function damageCombatTarget(target, amount, source, attacker = null) {
  if(!target){damagePlayer(amount,source);return;}
  if(target.tamed)damageTamedEnemy(target,amount,source);
  else if(target.alive){
    if(attacker?.tamed){target.aggroTarget=attacker;target.aggroUntil=clock.elapsedTime+6;}
    damageEnemy(target,amount,"body");
  }
}

function pushCombatTargetFrom(target, position, strength) {
  if(!target){pushPlayerFrom(position,strength);return;}
  const targetPosition=target.group.position;
  let dx=targetPosition.x-position.x,dz=targetPosition.z-position.z;
  const length=Math.max(.01,Math.hypot(dx,dz));dx/=length;dz/=length;
  const nx=targetPosition.x+dx*strength,nz=targetPosition.z+dz*strength;
  if(!enemyCollides(nx,targetPosition.z,.4))targetPosition.x=nx;
  if(!enemyCollides(targetPosition.x,nz,.4))targetPosition.z=nz;
}

function pushPlayerFrom(position, strength) {
  let dx = camera.position.x - position.x;
  let dz = camera.position.z - position.z;
  const length = Math.max(.01, Math.hypot(dx, dz));
  dx /= length; dz /= length;
  const nx = camera.position.x + dx * strength;
  const nz = camera.position.z + dz * strength;
  if (!collides(nx, camera.position.z)) camera.position.x = nx;
  if (!collides(camera.position.x, nz)) camera.position.z = nz;
}

function updateAbilityEffects(delta) {
  for (let i = abilityEffects.length - 1; i >= 0; i -= 1) {
    const effect = abilityEffects[i];
    if (!effect) continue;
    const visualStride=GRAPHICS_PRESETS[activeGraphicsPreset].abilityVisualStride;
    const precisionVisual=effect.kind==="scrap-burrow"||effect.kind==="scrap-emerge";
    const animateVisual=precisionVisual||visualStride===1||(renderFrame+i)%visualStride===0;
    advanceAbilityVisual(effect,delta,animateVisual,delta*visualStride);
    if (effect.kind === "toxic-cloud" || effect.kind === "electric-web" || effect.kind === "flame-wall") {
      if (effect.age >= effect.activeAfter && effect.age >= effect.tickAt && combatTargetDistance(effect.target,effect.mesh.position) <= effect.radius) {
        damageCombatTarget(effect.target,effect.damage,effect.kind.replaceAll("-", " "),effect.owner);
        if (effect.kind === "electric-web" && !effect.target) slowedUntil = performance.now() + 1100;
        effect.tickAt = effect.age + .55;
      }
    } else if (effect.kind === "gravity-orb") {
      const targetPosition=combatTargetPosition(effect.target);
      const distance = combatTargetDistance(effect.target,effect.mesh.position);
      if (distance < effect.radius) {
        const pull = Math.max(0, 1 - distance / effect.radius) * delta * 4.5;
        targetPosition.x += (effect.mesh.position.x - targetPosition.x) * pull;
        targetPosition.z += (effect.mesh.position.z - targetPosition.z) * pull;
        if (effect.age >= effect.tickAt && distance < 1.4) {
          damageCombatTarget(effect.target,effect.damage,"Gravity Orb",effect.owner);
          effect.tickAt = effect.age + .8;
        }
      }
    } else if (effect.kind === "repair-station") {
      effect.mesh.rotation.y += delta * 3;
      if (effect.age >= effect.tickAt) {
        enemies.forEach((ally) => {
          if (ally.alive && ally.tamed===Boolean(effect.owner?.tamed) && ally.group.position.distanceTo(effect.mesh.position) < effect.radius) {
            ally.health = Math.min(ally.maxHealth, ally.health + ally.maxHealth * .07);
          }
        });
        effect.tickAt = effect.age + 1;
      }
    } else if (effect.kind === "shockwave") {
      const waveRadius = effect.radius * Math.min(1, effect.age / effect.life);
      effect.mesh.scale.set(waveRadius * 2, 1, waveRadius * 2);
      const distance = combatTargetDistance(effect.target,effect.mesh.position);
      const targetCanBeHit=effect.target ? true : camera.position.y < PLAYER.eyeHeight + .7;
      if (!effect.hitPlayer && distance <= waveRadius && distance >= waveRadius - 1 && targetCanBeHit) {
        effect.hitPlayer = true;
        damageCombatTarget(effect.target,effect.damage,"Titan shockwave",effect.owner);
        pushCombatTargetFrom(effect.target,effect.mesh.position,1.8);
      }
    } else if (effect.kind === "laser" && effect.owner?.alive) {
      effect.mesh.position.x = effect.owner.group.position.x;
      effect.mesh.position.z = effect.owner.group.position.z;
      effect.mesh.rotation.y += delta * 1.7;
      const targetPosition=combatTargetPosition(effect.target);
      const dx = targetPosition.x - effect.mesh.position.x;
      const dz = targetPosition.z - effect.mesh.position.z;
      const perpendicular = Math.abs(-Math.sin(effect.mesh.rotation.y) * dx + Math.cos(effect.mesh.rotation.y) * dz);
      const along = Math.abs(Math.cos(effect.mesh.rotation.y) * dx + Math.sin(effect.mesh.rotation.y) * dz);
      if (perpendicular < .32 && along < (effect.mesh.scale.x * .5) && effect.age >= effect.tickAt) {
        damageCombatTarget(effect.target,effect.damage,"Core laser",effect.owner);
        effect.tickAt = effect.age + .45;
      }
    }
    if (effect.age >= effect.life) {
      const callback = effect.onExpire;
      removeAbilityEffect(i);
      if (callback) callback();
    }
  }
}

function telegraphStrike(enemy, position, radius, delay, damage, label, target = null) {
  createAbilityEffect("warning", position, {
    color: combatAbilityColor(enemy), radius, life: delay, owner: enemy, target,
    onExpire: () => {
      if (!enemy.alive) return;
      createAbilityEffect("impact", position, { color: combatAbilityColor(enemy), radius, life: .35 });
      if (combatTargetDistance(target,position) <= radius) damageCombatTarget(target,damage,label,enemy);
      playEnemySound(enemy, "attack");
    },
  });
}

function teleportNearCombatTarget(enemy, target = null, behind = false) {
  const targetPosition=combatTargetPosition(target);
  if(!target){camera.getWorldDirection(forward);forward.y=0;forward.normalize();}
  else forward.set(targetPosition.x-enemy.group.position.x,0,targetPosition.z-enemy.group.position.z).normalize();
  const side = Math.random() > .5 ? 1 : -1;
  const nx = targetPosition.x + (behind ? -forward.x * 2.4 : -forward.z * side * 4.5);
  const nz = targetPosition.z + (behind ? -forward.z * 2.4 : forward.x * side * 4.5);
  if (!enemyCollides(nx, nz, .55)) enemy.group.position.set(nx, enemy.flying ? 1.15 : 0, nz);
  enemy.steering.set(0,0,0);
  enemy.pathVersion = -1;
}

function activateSignatureAbility(enemy, elapsed, distance, target = null) {
  const id = enemy.typeId;
  const definition=getEnemyDefinition(id);
  const visualColor=combatAbilityColor(enemy);
  if (id === 1 && distance <= (definition.skill.minDistance || enemy.type.range)) {
    // Stay above ground and use direct combat when the target is already near.
    // The crawler's melee range is intentionally smaller than its safe dig
    // distance, so use the skill-specific threshold here.
    enemy.abilityAt = elapsed + .5;
    return;
  }
  // Scrap Burrow begins its cooldown after the full four-second animation finishes.
  enemy.abilityAt = id === 1 ? Number.POSITIVE_INFINITY : elapsed + ABILITY_COOLDOWNS[id] + Math.random() * 2;
  enemy.abilityTarget=target;
  statusEl.textContent = `${enemy.type.name}: signature ability`;
  enemy.skillAnimation={startedAt:elapsed,duration:definition.animations.skillDuration,endsAt:elapsed+definition.animations.skillDuration};
  if (id !== 1) playEnemySound(enemy, "attack");
  switch (definition.skill.handler) {
    case "scrapBurrow": {
      // Burrow owns the complete crawler pose.  Clear any gait/attack blending so
      // every activation begins from the same neutral frame.
      enemy.attackAnimation = 0;
      enemy.crawlerMovementBlend = 0;
      enemy.steering.set(0,0,0);
      faceScrapCrawlerBurrowTarget(enemy,target);
      applyEnemySkillPose(enemy,definition,0,definition.animations.skillDuration);
      const entryMarkerPosition=getScrapBurrowGroundPosition(enemy);
      enemy.burrowState = { startedAt: elapsed, animationTime:0, phase: "enter", lockedYaw:enemy.group.rotation.y, entryMarkerPosition:entryMarkerPosition.clone(), nextTravelSound: elapsed + 1.15, damaged: false, target };
      enemy.burrowMarker = createAbilityEffect("scrap-burrow", entryMarkerPosition, {
        color: visualColor, radius: .42, life: 5, owner: enemy, opacity: .72,
      });
      playScrapBurrowSound(enemy, "enter");
      statusEl.textContent = "Scrap Crawler digging down - move away";
      break;
    }
    case "brokenDroneBarrage":
      // Barrage is a planted firing animation, not a stun. The old
      // crashAfterBurst flag fed E02 into the shared knockdown pose and made the
      // whole drone roll/drop after shooting.
      enemy.burstShots = 4;
      enemy.burstAt = elapsed;
      enemy.crashAfterBurst = false;
      enemy.rootedUntil = elapsed + definition.animations.skillDuration;
      enemy.steering.set(0, 0, 0);
      break;
    case "glowRatRush":
      enemies.forEach((ally)=>{if(ally.alive&&ally.tamed===enemy.tamed&&ally.typeId===3&&ally.group.position.distanceTo(enemy.group.position)<9)ally.speedBoostUntil=elapsed+5;});
      enemy.explodesOnDeath = true;
      createAbilityEffect("radiation-pack", enemy.group.position, { color: visualColor, radius: 4, life: 1.2 });
      break;
    case "scanningLock":
      telegraphStrike(enemy, combatTargetPosition(target).clone(), 1.1, 1.15, enemy.damage * 1.5, "Scanning Lock",target);
      break;
    case "charge": enemy.chargeUntil = elapsed + 1.5; break;
    case "empPulse":
      createAbilityEffect("emp-pulse", enemy.group.position, { color: visualColor, radius: 7, life: .65 });
      if (distance < 7) {
        if(!target){sprintDisabledUntil=performance.now()+3500;statusEl.textContent="EMP hit - sprint disabled";}
        else if(target.tamed&&!tamedGodMode)target.tamedStunnedUntil=Math.max(target.tamedStunnedUntil||0,elapsed+2);
        else target.stunnedUntil=elapsed+2;
      }
      break;
    case "electricLeap":
      createAbilityEffect("electric-web", combatTargetPosition(target).clone(), { color: visualColor, radius: 2.2, life: 7, damage: 4, hp: 50, target });
      break;
    case "shieldBash":
      if (distance < 4) { damageCombatTarget(target,enemy.damage*.8,"Shield Bash",enemy);pushCombatTargetFrom(target,enemy.group.position,2.4); }
      else enemy.chargeUntil = elapsed + 1;
      break;
    case "toxicCloud":
      createAbilityEffect("toxic-cloud", enemy.group.position, { color: visualColor, radius: 3.6, life: 7, damage: 4, target });
      break;
    case "sniperLaser":
      telegraphStrike(enemy, combatTargetPosition(target).clone(), 1, 1.5, enemy.damage * 2, "Sniper Laser",target);
      break;
    case "cloakedStrike":
      teleportNearCombatTarget(enemy,target,true); enemy.cloakUntil=elapsed+1; enemy.pendingStrikeAt=elapsed+.75; break;
    case "repairStation":
      createAbilityEffect("repair-station", enemy.group.position, { color: visualColor, shape: "orb", y: .7, radius: 4.5, life: 10, hp: 100, owner: enemy });
      break;
    case "flameWall": {
      const targetPosition=combatTargetPosition(target);
      const dx=targetPosition.x-enemy.group.position.x,dz=targetPosition.z-enemy.group.position.z;
      const length = Math.max(.01, Math.hypot(dx,dz)), px = -dz/length, pz = dx/length;
      for (const offset of [-2.4,0,2.4]) createAbilityEffect("flame-wall",new THREE.Vector3(targetPosition.x+px*offset,0,targetPosition.z+pz*offset),{color:visualColor,radius:1.5,life:5,damage:5,target});
      break;
    }
    case "phantomShift":
      for (let i=0;i<3;i+=1) {
        const angle=i*Math.PI*2/3;
        createAbilityEffect("phantom-copy", new THREE.Vector3(enemy.group.position.x+Math.cos(angle)*2,1,enemy.group.position.z+Math.sin(angle)*2), { color: visualColor, shape:"orb", radius:.7, life:5, hp:25 });
      }
      teleportNearCombatTarget(enemy,target);
      break;
    case "minigunBurst": enemy.burstShots = 12; enemy.burstAt = elapsed; enemy.rootedUntil = elapsed + 3; break;
    case "gravityOrb":
      createAbilityEffect("gravity-orb", combatTargetPosition(target).clone(), { color: visualColor, shape:"orb", y:1, radius:5, life:5, damage:7, hp:75, target });
      break;
    case "bombardment":
      for (let i=0;i<3;i+=1){const p=combatTargetPosition(target);telegraphStrike(enemy,new THREE.Vector3(p.x+(i-1)*2.2,0,p.z+(i%2?.8:-.8)),1.5,1.5+i*.25,enemy.damage,"Siege Bombardment",target);}
      break;
    case "voidStrike":
      teleportNearCombatTarget(enemy,target,true);enemy.pendingStrikeAt=elapsed+.45;enemy.cloakUntil=elapsed+.55;break;
    case "titanStomp":
      createAbilityEffect("shockwave",enemy.group.position,{color:visualColor,radius:10,life:1.8,damage:enemy.damage,target});
      break;
    case "coreProtocol": {
      const phase = enemy.health / enemy.maxHealth > .67 ? 1 : enemy.health / enemy.maxHealth > .34 ? 2 : 3;
      enemy.coreAbility = (enemy.coreAbility || 0) + 1;
      if (phase === 1) createAbilityEffect("laser",enemy.group.position,{color:visualColor,shape:"beam",y:1.2,length:15,life:5,damage:10,owner:enemy,target});
      else if (phase === 2) for(let i=0;i<4;i+=1){const p=combatTargetPosition(target);telegraphStrike(enemy,new THREE.Vector3(p.x+(Math.random()-.5)*6,0,p.z+(Math.random()-.5)*6),1.7,1.4,22,"Core Bombardment",target);}
      else {
        createAbilityEffect("gravity-orb",combatTargetPosition(target).clone(),{color:visualColor,shape:"orb",y:1,radius:7,life:5,damage:10,hp:120,target});
        if (!enemy.tamed&&(enemy.coreAbility%2)===0){spawnQueue.push({typeId:14,elite:false},{typeId:18,elite:false});updateEnemyCount();}
      }
      break;
    }
  }
}

function removeScrapBurrowMarker(enemy) {
  if (!enemy.burrowMarker) return;
  const index = abilityEffects.indexOf(enemy.burrowMarker);
  if (index >= 0) removeAbilityEffect(index);
  enemy.burrowMarker = null;
}

function faceScrapCrawlerBurrowTarget(enemy,target){
  const targetPosition=combatTargetPosition(target);
  const dx=targetPosition.x-enemy.group.position.x;
  const dz=targetPosition.z-enemy.group.position.z;
  if(Math.hypot(dx,dz)>.001)enemy.group.rotation.y=Math.atan2(dx,dz);
}

function findSafeCrawlerEmergence(enemy,target){
  const targetPosition=combatTargetPosition(target);
  const fromX=enemy.group.position.x,fromZ=enemy.group.position.z;
  const targetDx=targetPosition.x-fromX,targetDz=targetPosition.z-fromZ;
  const targetYaw=Math.atan2(targetDx,targetDz);
  const bodyRadius=Math.max(.4,enemy.type.scale*.34);
  const openingDistance=Math.max(.5,(enemy.group.scale.z||enemy.type.scale||1)*1.08);
  const angleOffsets=[0,.3,-.3,.62,-.62,.95,-.95,1.3,-1.3,Math.PI];
  const radii=[.9,1.2,1.55,2,2.55,3.2,4];
  for(const radius of radii){
    for(const offset of angleOffsets){
      const candidateAngle=targetYaw+Math.PI+offset;
      const x=targetPosition.x+Math.sin(candidateAngle)*radius;
      const z=targetPosition.z+Math.cos(candidateAngle)*radius;
      const yaw=Math.atan2(targetPosition.x-x,targetPosition.z-z);
      const openingX=x+Math.sin(yaw)*openingDistance;
      const openingZ=z+Math.cos(yaw)*openingDistance;
      if(enemyCollides(x,z,bodyRadius)||enemyCollides(openingX,openingZ,.24))continue;
      return {position:new THREE.Vector3(x,-.78,z),yaw};
    }
  }
  const targetCellX=worldToNav(targetPosition.x),targetCellZ=worldToNav(targetPosition.z);
  for(let cellRadius=0;cellRadius<12;cellRadius+=1){
    for(let cellZ=targetCellZ-cellRadius;cellZ<=targetCellZ+cellRadius;cellZ+=1){
      for(let cellX=targetCellX-cellRadius;cellX<=targetCellX+cellRadius;cellX+=1){
        if(cellX<0||cellZ<0||cellX>=NAV_SIZE||cellZ>=NAV_SIZE||Math.max(Math.abs(cellX-targetCellX),Math.abs(cellZ-targetCellZ))!==cellRadius)continue;
        const x=navToWorld(cellX),z=navToWorld(cellZ),yaw=Math.atan2(targetPosition.x-x,targetPosition.z-z);
        const openingX=x+Math.sin(yaw)*openingDistance,openingZ=z+Math.cos(yaw)*openingDistance;
        if(!navWalkable[navIndex(cellX,cellZ)]||enemyCollides(x,z,bodyRadius)||enemyCollides(openingX,openingZ,.24))continue;
        return {position:new THREE.Vector3(x,-.78,z),yaw};
      }
    }
  }
  // The current standing point was valid before the ability began, making it
  // the safest final fallback if the surrounding map has no usable cell.
  return {position:new THREE.Vector3(fromX,-.78,fromZ),yaw:targetYaw};
}

function updateScrapCrawlerBurrow(enemy, delta, elapsed) {
  const state = enemy.burrowState;
  if (!state) return false;
  // Advance through every important pose even when gameplay drops frames.
  // The lighter showroom rarely skips these frames, which is why it appeared
  // more consistent than gameplay before this capped animation clock.
  state.animationTime=Math.min(4,(state.animationTime||0)+Math.min(delta,.05));
  const time=state.animationTime;
  const burrowPhase=getScrapBurrowPhase(time);
  if (burrowPhase.name === "enter") {
    // Match the showroom: the visible dive keeps one fixed heading so the
    // torso cannot rotate around the hole while the player is moving.
    enemy.group.rotation.y=state.lockedYaw;
    const definition=getEnemyDefinition(enemy.typeId);
    applyEnemySkillPose(enemy,definition,time,definition.animations.skillDuration);
  } else if (burrowPhase.name === "travel") {
    if (state.phase !== "travel") {
      state.phase = "travel";
      removeEnemyFromHitMeshes(enemy);
      enemy.group.visible = false;
      enemy.group.position.y = -.78;
      enemy.group.rotation.x = .65;
      const safeEmergence=findSafeCrawlerEmergence(enemy,state.target);
      state.emergePosition=safeEmergence.position;
      state.emergeYaw=safeEmergence.yaw;
      state.travelRoute=buildRepairDroneRoute(enemy.group.position.clone(),state.emergePosition);
      state.travelPreviousPosition=enemy.group.position.clone();
      playScrapBurrowSound(enemy, "travel");
    }
    setRepairDroneRoutePosition(enemy.group.position,state.travelRoute.points[0],state.emergePosition,state.travelRoute,burrowPhase.progress);
    enemy.group.position.y=-.78;
    const travelDx=enemy.group.position.x-state.travelPreviousPosition.x,travelDz=enemy.group.position.z-state.travelPreviousPosition.z;
    if(Math.hypot(travelDx,travelDz)>.001)enemy.group.rotation.y=Math.atan2(travelDx,travelDz);
    state.travelPreviousPosition.copy(enemy.group.position);
    if (elapsed >= state.nextTravelSound) {
      playScrapBurrowSound(enemy, "travel");
      state.nextTravelSound = elapsed + .34;
    }
  } else if (burrowPhase.name === "emerge") {
    if (state.phase !== "emerge") {
      state.phase = "emerge";
      enemy.group.position.x=state.emergePosition.x;enemy.group.position.z=state.emergePosition.z;
      enemy.group.rotation.y=state.emergeYaw;
      enemy.group.visible = true;
      addEnemyToHitMeshes(enemy);
      removeScrapBurrowMarker(enemy);
      state.emergeMarkerPosition=getScrapBurrowGroundPosition(enemy).clone();
      enemy.burrowMarker = createAbilityEffect("scrap-emerge", state.emergeMarkerPosition, {
        color: combatAbilityColor(enemy), radius: .55, life: 1.05, owner: enemy, opacity: .78,
      });
      playScrapBurrowSound(enemy, "emerge");
      statusEl.textContent = "Scrap Crawler emerging - clear the small circle";
    }
    const definition=getEnemyDefinition(enemy.typeId);
    applyEnemySkillPose(enemy,definition,time,definition.animations.skillDuration);
  } else {
    const definition=getEnemyDefinition(enemy.typeId);
    applyEnemySkillPose(enemy,definition,definition.animations.skillDuration,definition.animations.skillDuration);
    enemy.group.visible = true;
    enemy.group.position.y = 0;
    enemy.group.rotation.x = 0;
    enemy.group.rotation.z = 0;
    enemy.parts.legs.forEach((leg) => {
      leg.rotation.copy(leg.userData.baseRotation);
    });
    if (enemy.parts.body) enemy.parts.body.rotation.copy(enemy.parts.body.userData.baseRotation);
    if (enemy.parts.head) enemy.parts.head.rotation.copy(enemy.parts.head.userData.baseRotation);
    const eruptionPosition=state.emergeMarkerPosition||enemy.group.position;
    if (!state.damaged && combatTargetDistance(state.target,eruptionPosition) <= .55) {
      damageCombatTarget(state.target,enemy.damage*1.5,"Scrap Crawler eruption",enemy);
      state.damaged = true;
    }
    removeScrapBurrowMarker(enemy);
    enemy.burrowState = null;
    enemy.abilityAt = elapsed + 5;
    enemy.attackAnimation = 1;
    enemy.nextAttack = elapsed + 1;
    statusEl.textContent = "Scrap Crawler surfaced";
    return false;
  }
  if(enemy.burrowMarker&&state.phase==="enter")enemy.burrowMarker.mesh.position.copy(state.entryMarkerPosition);
  return true;
}

function isTamedDirectlyVisible(enemy,elapsed){
  if(elapsed<(enemy.visibilityCheckAt||0))return Boolean(enemy.directlyVisible);
  tamedVisibilityPoint.copy(enemy.group.position);
  tamedVisibilityPoint.y+=Math.max(.65,(enemy.type?.scale||1)*.85);
  const projected=tamedVisibilityPoint.clone().project(camera);
  const onScreen=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.98&&Math.abs(projected.y)<.98;
  enemy.tamedOnScreen=onScreen;
  let unobstructed=false;
  if(onScreen){
    tamedVisibilityDirection.subVectors(tamedVisibilityPoint,camera.position);
    const distance=tamedVisibilityDirection.length();
    tamedVisibilityRaycaster.set(camera.position,tamedVisibilityDirection.normalize());
    tamedVisibilityRaycaster.far=Math.max(0,distance-.35);
    unobstructed=tamedVisibilityRaycaster.intersectObjects(shootableSurfaces,false).length===0;
  }
  enemy.directlyVisible=onScreen&&unobstructed;
  enemy.visibilityCheckAt=elapsed+GRAPHICS_PRESETS[activeGraphicsPreset].visibilityInterval;
  return enemy.directlyVisible;
}

function updateHostileTracking(enemy,elapsed){
  if(!enemy.group.visible){hideHostileTracking(enemy);return;}
  if(elapsed>=(enemy.hostileVisibilityCheckAt||0)){
    hostileVisibilityPoint.copy(enemy.group.position);
    hostileVisibilityPoint.y+=Math.max(.7,(enemy.type?.scale||1)*.9);
    hostileProjectedPoint.copy(hostileVisibilityPoint).project(camera);
    const onScreen=hostileProjectedPoint.z>-1&&hostileProjectedPoint.z<1&&Math.abs(hostileProjectedPoint.x)<.98&&Math.abs(hostileProjectedPoint.y)<.98;
    let unobstructed=false;
    if(onScreen){
      hostileVisibilityDirection.subVectors(hostileVisibilityPoint,camera.position);
      const distance=hostileVisibilityDirection.length();
      hostileVisibilityRaycaster.set(camera.position,hostileVisibilityDirection.normalize());
      hostileVisibilityRaycaster.far=Math.max(0,distance-.35);
      unobstructed=hostileVisibilityRaycaster.intersectObjects(shootableSurfaces,false).length===0;
    }
    enemy.hostileDirectlyVisible=onScreen&&unobstructed;
    enemy.hostileVisibilityCheckAt=elapsed+GRAPHICS_PRESETS[activeGraphicsPreset].visibilityInterval;
  }
  const directlyVisible=Boolean(enemy.hostileDirectlyVisible);
  enemy.hostileTrackingShells?.forEach((shell)=>{shell.visible=!directlyVisible;});
  if(enemy.hostileTrackingMaterial)enemy.hostileTrackingMaterial.opacity=.48+Math.sin(elapsed*4+enemy.seed)*.12;
  if(enemy.hostileArrow){
    enemy.hostileArrow.visible=directlyVisible;
    enemy.hostileArrow.position.copy(enemy.group.position);
    enemy.hostileArrow.position.y+=Math.max(1.75,enemy.type.scale*(enemy.elite?2.85:2.45));
    const pulse=.68+Math.sin(elapsed*5+enemy.seed)*.07;enemy.hostileArrow.scale.set(pulse,pulse,1);
    enemy.hostileArrow.material.opacity=.72+Math.sin(elapsed*5+enemy.seed)*.22;
  }
}

function animateTamedAura(enemy, delta, elapsed) {
  if(!enemy.tameAura)return;
  const directlyVisible=isTamedDirectlyVisible(enemy,elapsed);
  const hidden=Boolean(enemy.tamedOnScreen&&!directlyVisible);
  enemy.tameAura.visible=hidden;
  enemy.tameHighlightMeshes?.forEach((shell)=>{shell.visible=hidden;});
  enemy.tameAura.rotation.y+=delta*1.8;
  const auraLimit=Math.max(2,Math.ceil(enemy.tameAura.children.length*GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity));
  enemy.tameAura.children.forEach((part,index)=>{
    if(index===0)return;
    part.visible=index<auraLimit;
    if(!part.visible)return;
    const angle=(part.userData.auraAngle||0)+elapsed*1.7;
    part.position.set(Math.cos(angle)*.85,.55+Math.sin(elapsed*3+index)*.24,Math.sin(angle)*.85);
    part.scale.setScalar(.055+Math.sin(elapsed*4+index)*.018);
  });
  enemy.tameAuraMaterial.opacity=.55+Math.sin(elapsed*3+enemy.seed)*.2;
  if(enemy.tameHighlightMaterial)enemy.tameHighlightMaterial.opacity=.4+Math.sin(elapsed*3+enemy.seed)*.1;
}

function configureRepairDroneDeployment(enemy,drone,index,startPosition){
  drone.launchPosition.copy(startPosition);
  const arrivalAngle=index*Math.PI*.5,arrivalRadius=1.05+(index%2)*.14;
  enemy.group.updateMatrixWorld(true);
  enemyRepairAnchorPosition(enemy,index,repairDroneAnchor);
  // Capture a stable orbit center. The repair laser may continue following the
  // animated body surface, but the drone itself must not inherit the stunned
  // pose's shake, roll, or electrical jolts.
  if(!drone.orbitCenter)drone.orbitCenter=new THREE.Vector3();
  // Measure the actual animated model rather than estimating from its type
  // scale. Wide, tall, flat, and irregular enemies therefore receive the
  // correct drone clearance.
  const orbitMetrics=measureRepairDroneOrbit(enemy);
  drone.orbitCenter.copy(orbitMetrics.center);
  drone.orbitRadius=orbitMetrics.radius;
  drone.orbitMinRadius=orbitMetrics.minRadius;
  drone.orbitMinY=orbitMetrics.minY;
  drone.orbitMaxY=orbitMetrics.maxY;
  repairDroneOutward.set(repairDroneAnchor.x-enemy.group.position.x,0,repairDroneAnchor.z-enemy.group.position.z);
  if(repairDroneOutward.lengthSq()<.01)repairDroneOutward.set(Math.cos(arrivalAngle),0,Math.sin(arrivalAngle));else repairDroneOutward.normalize();
  drone.deployTarget.copy(repairDroneAnchor).addScaledVector(repairDroneOutward,arrivalRadius);
  drone.deployTarget.y+=.34+(index%2)*.16;
  enemyRepairSurfacePosition(enemy,drone.deployTarget,repairDroneAnchor,drone.contactTarget);
  drone.deployRoute=buildRepairDroneRoute(drone.launchPosition,drone.deployTarget);
  drone.deployDuration=THREE.MathUtils.clamp(drone.deployRoute.totalLength/5.6,.55,4.2);
  drone.previousFlightPosition.copy(drone.launchPosition);
  drone.beam.visible=false;drone.contactGlow.visible=false;drone.contactRing.visible=false;
  drone.repairSparks.forEach((spark)=>{spark.visible=false;});
}

function createCompanionRepairDrones(enemy){
  if(enemy.repairDroneSwarm){
    enemy.repairDroneSwarm.visible=true;
    if(enemy.repairDroneReturnStartedAt!=null){
      enemy.repairDroneReturnStartedAt=null;
      enemy.repairDroneDeployStartedAt=clock.elapsedTime;
      enemy.repairDrones.forEach((drone,index)=>configureRepairDroneDeployment(enemy,drone,index,drone.group.position));
      worldTone(enemy.group,285,.12,.04,"sawtooth");worldTone(enemy.group,570,.16,.035,"triangle",sfxBus,.055);
    }
    return;
  }
  const swarm=new THREE.Group();scene.add(swarm);
  enemy.repairDroneSwarm=swarm;enemy.repairDrones=[];enemy.repairDroneDeployStartedAt=clock.elapsedTime;
  const linkedMachine=tamingMachines[enemy.machineSlot];
  linkedMachine?.group.updateMatrixWorld(true);
  for(let index=0;index<4;index+=1){
    const group=createRepairDroneModel(miniRepairDroneBodyMaterial,miniRepairDroneMetalMaterial,miniRepairDroneDarkMaterial,miniRepairDroneGlowMaterial);swarm.add(group);
    const {rotors,eye,eyes,emitter}=group.userData.repairDroneParts;
    const beamMaterial=new THREE.MeshBasicMaterial({color:0x39ff78,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const beam=new THREE.Mesh(unitCylinderGeometry,beamMaterial);beam.visible=false;swarm.add(beam);
    const contactMaterial=beamMaterial.clone();
    const contactGlow=new THREE.Mesh(unitSphereGeometry,contactMaterial);contactGlow.visible=false;swarm.add(contactGlow);
    const contactRing=new THREE.Mesh(unitTorusGeometry,contactMaterial);contactRing.rotation.x=Math.PI/2;contactRing.visible=false;swarm.add(contactRing);
    const repairSparks=[];
    for(let sparkIndex=0;sparkIndex<3;sparkIndex+=1){const spark=new THREE.Mesh(unitDiamondGeometry,contactMaterial);spark.visible=false;swarm.add(spark);repairSparks.push(spark);}
    const launchPosition=new THREE.Vector3();
    if(linkedMachine?.droneDocks?.[index]){
      linkedMachine.droneDocks[index].droneModel.getWorldPosition(launchPosition);
      linkedMachine.droneDocks[index].droneModel.visible=false;
    }else launchPosition.copy(enemy.group.position).add(new THREE.Vector3((index%2?1:-1)*1.2,1.1,index<2?-1:1));
    group.position.copy(launchPosition);
    const drone={
      group,rotors,beam,eye,eyes,emitter,contactMaterial,contactGlow,contactRing,repairSparks,
      launchPosition:launchPosition.clone(),deployTarget:new THREE.Vector3(),deployRoute:null,
      contactTarget:new THREE.Vector3(),orbitCenter:new THREE.Vector3(),previousFlightPosition:launchPosition.clone(),deployDuration:1.15,settleDuration:.72
    };
    configureRepairDroneDeployment(enemy,drone,index,launchPosition);
    enemy.repairDrones.push(drone);
  }
  worldTone(linkedMachine?.group||enemy.group,245,.16,.055,"sawtooth");worldTone(linkedMachine?.group||enemy.group,490,.2,.045,"triangle",sfxBus,.08);
}

function updateCompanionRepairDrones(enemy,delta,elapsed,repairProgress){
  createCompanionRepairDrones(enemy);
  enemy.group.updateMatrixWorld(true);
  const linkedMachine=tamingMachines[enemy.machineSlot];
  const visibleDroneCount=GRAPHICS_PRESETS[activeGraphicsPreset].repairDrones;
  enemy.repairDrones.forEach((drone,index)=>{
    const droneVisible=index<visibleDroneCount;
    drone.group.visible=droneVisible;
    if(linkedMachine?.droneDocks?.[index])linkedMachine.droneDocks[index].droneModel.visible=!droneVisible;
    if(!droneVisible){
      drone.beam.visible=false;drone.contactGlow.visible=false;drone.contactRing.visible=false;
      drone.repairSparks.forEach((spark)=>{spark.visible=false;});
      return;
    }
    const deployAge=Math.max(0,elapsed-(enemy.repairDroneDeployStartedAt??elapsed));
    const deployment=Math.min(1,deployAge/drone.deployDuration);
    if(deployment<1){
      setRepairDroneRoutePosition(drone.group.position,drone.launchPosition,drone.deployTarget,drone.deployRoute,deployment);
      steerRepairDroneAlongFlight(drone,delta,Math.sin(deployment*Math.PI)*(.1-(index%2)*.2));
      drone.rotors.forEach((rotor,rotorIndex)=>{rotor.rotation.y+=delta*(rotorIndex?24:-24);});
      drone.beam.visible=false;drone.contactGlow.visible=false;drone.contactRing.visible=false;drone.repairSparks.forEach((spark)=>{spark.visible=false;});pulseRepairDroneLights(drone,1+.18*Math.sin(elapsed*12+index));
      return;
    }
    // Travel through a large arc, stop to weld, then continue from that exact
    // location. Equal phase spacing keeps the four drones separated while the
    // repeated arcs eventually inspect every side of the tamed unit.
    const repairTime=deployAge-drone.deployDuration;
    const settledTime=Math.max(0,repairTime-drone.settleDuration),cycleDuration=THREE.MathUtils.clamp(3.08+(drone.orbitRadius||1.4)*.38,3.55,4.65),cycleIndex=Math.floor(settledTime/cycleDuration),cycle=(settledTime%cycleDuration)/cycleDuration;
    const travelFraction=.7,arcStep=Math.PI*2/3,formationAngle=index*Math.PI*.5;
    const previousAngle=formationAngle+cycleIndex*arcStep;
    const nextAngle=previousAngle+arcStep;
    const moveProgress=THREE.MathUtils.smootherstep(Math.min(1,cycle/travelFraction),0,1);
    // Deterministic pseudo-random values make every pass different without
    // introducing frame-to-frame noise or shaking.
    const routeSeed=(cycleIndex+1)*12.9898+(index+1)*78.233;
    const sideRandom=Math.sin(routeSeed*1.17);
    const radialRandom=Math.sin(routeSeed*2.31+.7);
    const heightRandom=Math.sin(routeSeed*3.73+1.9);
    const travelArc=Math.sin(moveProgress*Math.PI);
    // One wide lateral bow per route looks deliberate and keeps velocity
    // continuous. The following cycle can bow to the opposite side.
    const sideWeave=travelArc*(.2+Math.abs(sideRandom)*.44)*Math.sign(sideRandom||1);
    const angle=THREE.MathUtils.lerp(previousAngle,nextAngle,moveProgress)+sideWeave;
    const baseRadius=drone.orbitRadius||THREE.MathUtils.clamp(.9+enemy.type.scale*.62,1.2,2.2);
    const previousRadius=baseRadius+Math.sin(cycleIndex*2.17+index*1.3)*.16;
    const nextRadius=baseRadius+Math.sin((cycleIndex+1)*2.17+index*1.3)*.16;
    const radialExcursion=radialRandom<0?radialRandom*.18:radialRandom*Math.min(.52,baseRadius*.24);
    const radius=Math.max(drone.orbitMinRadius||.86,THREE.MathUtils.lerp(previousRadius,nextRadius,moveProgress)+travelArc*radialExcursion);
    const previousHeight=.08+.84*(.5+.5*Math.sin(cycleIndex*1.73+index*1.57));
    const nextHeight=.08+.84*(.5+.5*Math.sin((cycleIndex+1)*1.73+index*1.57));
    enemyRandomRepairSectionPosition(enemy,index,cycleIndex,repairDroneAnchor);
    const orbitCenter=drone.orbitCenter||repairDroneAnchor;
    const routeHeight=THREE.MathUtils.clamp(THREE.MathUtils.lerp(previousHeight,nextHeight,moveProgress)+travelArc*heightRandom*.3,0,1);
    const flightY=THREE.MathUtils.lerp(drone.orbitMinY??.34,drone.orbitMaxY??1.2,routeHeight);
    repairDroneCurveA.set(
      orbitCenter.x+Math.cos(angle)*radius,
      flightY,
      orbitCenter.z+Math.sin(angle)*radius
    );
    if(repairTime<drone.settleDuration){
      const settleProgress=THREE.MathUtils.smootherstep(repairTime/drone.settleDuration,0,1);
      drone.group.position.copy(drone.deployTarget).lerp(repairDroneCurveA,settleProgress);
    }else{
      // Low-pass the procedural destination so animation remains fluid during
      // frame-rate drops and at the boundary between travel and welding.
      const flightSmoothing=1-Math.exp(-delta*7.5);
      drone.group.position.lerp(repairDroneCurveA,flightSmoothing);
    }
    enemyRepairSurfacePosition(enemy,drone.group.position,repairDroneAnchor,repairDroneTarget);
    drone.contactTarget.lerp(repairDroneTarget,1-Math.exp(-delta*18));
    repairDroneTarget.copy(drone.contactTarget);
    const targetYaw=Math.atan2(repairDroneTarget.x-drone.group.position.x,repairDroneTarget.z-drone.group.position.z);
    const yawDifference=Math.atan2(Math.sin(targetYaw-drone.group.rotation.y),Math.cos(targetYaw-drone.group.rotation.y));
    drone.group.rotation.y+=yawDifference*(1-Math.exp(-delta*7));
    const flightBank=cycle<travelFraction?THREE.MathUtils.clamp(sideWeave*.24+radialRandom*travelArc*.11,-.2,.2):0;
    drone.group.rotation.z=THREE.MathUtils.lerp(drone.group.rotation.z,flightBank,1-Math.exp(-delta*5.5));
    drone.previousFlightPosition.copy(drone.group.position);
    drone.rotors.forEach((rotor,rotorIndex)=>{rotor.rotation.y+=delta*(rotorIndex?19:-19);});
    const stopped=repairTime>=drone.settleDuration&&cycle>=travelFraction,laserPulse=stopped?Math.max(0,Math.sin((cycle-travelFraction)/(1-travelFraction)*Math.PI*8)):0;
    repairDroneBeamDirection.subVectors(repairDroneTarget,drone.group.position);
    const beamLength=repairDroneBeamDirection.length();
    drone.beam.position.copy(drone.group.position).lerp(repairDroneTarget,.5);
    drone.beam.scale.set(.014,beamLength*.5,.014);
    drone.beam.quaternion.setFromUnitVectors(repairDroneUp,repairDroneBeamDirection.normalize());
    drone.beam.visible=stopped&&laserPulse>.08;drone.beam.material.opacity=laserPulse*.82;
    drone.contactGlow.visible=stopped&&laserPulse>.04;drone.contactGlow.position.copy(repairDroneTarget);drone.contactGlow.scale.setScalar(.035+laserPulse*.075);
    drone.contactRing.visible=stopped&&laserPulse>.06;drone.contactRing.position.copy(repairDroneTarget);drone.contactRing.scale.setScalar(.11+laserPulse*.22);drone.contactMaterial.opacity=.18+laserPulse*.78;
    drone.repairSparks.forEach((spark,sparkIndex)=>{
      const sparkLimit=Math.ceil(drone.repairSparks.length*GRAPHICS_PRESETS[activeGraphicsPreset].effectDensity);
      spark.visible=sparkIndex<sparkLimit&&stopped&&laserPulse>.22;
      const sparkPhase=elapsed*18+index*3.7+sparkIndex*2.1;
      spark.position.set(repairDroneTarget.x+Math.cos(sparkPhase)*(.05+sparkIndex*.035),repairDroneTarget.y+.04+Math.sin(sparkPhase*1.3)*(.08+sparkIndex*.025),repairDroneTarget.z+Math.sin(sparkPhase)*(.05+sparkIndex*.035));
      spark.scale.setScalar(.018+laserPulse*.018);spark.rotation.y=sparkPhase;
    });
    pulseRepairDroneLights(drone,1+laserPulse*.7);
  });
  enemy.repairDroneSwarm.visible=repairProgress<1;
}

function beginCompanionRepairDroneReturn(enemy,elapsed){
  if(!enemy?.repairDroneSwarm||enemy.repairDroneReturnStartedAt!=null)return;
  const linkedMachine=tamingMachines[enemy.machineSlot];
  linkedMachine?.group.updateMatrixWorld(true);
  enemy.repairDroneSwarm.visible=true;enemy.repairDroneReturnStartedAt=elapsed;
  let coordinatedReturnDuration=0;
  enemy.repairDrones.forEach((drone,index)=>{
    drone.beam.visible=false;
    drone.contactGlow.visible=false;drone.contactRing.visible=false;drone.repairSparks.forEach((spark)=>{spark.visible=false;});
    drone.returnStartPosition=drone.group.position.clone();
    drone.returnTarget=new THREE.Vector3();
    drone.returnDockQuaternion=new THREE.Quaternion();
    if(linkedMachine?.droneDocks?.[index]){
      linkedMachine.droneDocks[index].droneModel.getWorldPosition(drone.returnTarget);
      linkedMachine.droneDocks[index].droneModel.getWorldQuaternion(drone.returnDockQuaternion);
    }else{
      drone.returnTarget.copy(drone.launchPosition);drone.returnDockQuaternion.identity();
    }
    drone.returnRoute=buildRepairDroneRoute(drone.returnStartPosition,drone.returnTarget);
    const distance=drone.returnRoute.totalLength;
    drone.previousFlightPosition.copy(drone.returnStartPosition);
    drone.returnDuration=THREE.MathUtils.clamp(distance/5.6,1.15,4.6);
    coordinatedReturnDuration=Math.max(coordinatedReturnDuration,drone.returnDuration);
  });
  // Keep the formation moving until every drone reaches its own dock. Previously
  // short routes finished early and those drones visibly froze while waiting.
  enemy.repairDrones.forEach((drone)=>{drone.returnDuration=coordinatedReturnDuration;});
  worldTone(enemy.group,520,.14,.045,"triangle");worldTone(enemy.group,260,.2,.04,"sawtooth",sfxBus,.07);
}

function updateReturningCompanionRepairDrones(enemy,delta,elapsed){
  if(!enemy?.repairDroneSwarm||enemy.repairDroneReturnStartedAt==null)return false;
  const returnAge=Math.max(0,elapsed-enemy.repairDroneReturnStartedAt);
  let allDocked=true;
  enemy.repairDrones.forEach((drone,index)=>{
    const droneVisible=index<GRAPHICS_PRESETS[activeGraphicsPreset].repairDrones;
    drone.group.visible=droneVisible;
    const linkedMachine=tamingMachines[enemy.machineSlot];
    if(linkedMachine?.droneDocks?.[index])linkedMachine.droneDocks[index].droneModel.visible=!droneVisible;
    const progress=Math.min(1,returnAge/drone.returnDuration);
    allDocked=allDocked&&progress>=1;
    setRepairDroneRoutePosition(drone.group.position,drone.returnStartPosition,drone.returnTarget,drone.returnRoute,progress);
    steerRepairDroneAlongFlight(drone,delta,-Math.sin(progress*Math.PI)*(.1-(index%2)*.2));
    const docking=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((progress-.76)/.24,0,1),0,1);
    if(docking>0)drone.group.quaternion.rotateTowards(drone.returnDockQuaternion,delta*(1.4+docking*5.2));
    const rotorSpeed=THREE.MathUtils.lerp(25,4,docking);
    drone.rotors.forEach((rotor,rotorIndex)=>{rotor.rotation.y+=delta*(rotorIndex?rotorSpeed:-rotorSpeed);});
    pulseRepairDroneLights(drone,1+.16*Math.sin(elapsed*13+index));
    drone.beam.visible=false;drone.contactGlow.visible=false;drone.contactRing.visible=false;drone.repairSparks.forEach((spark)=>{spark.visible=false;});
  });
  if(allDocked){
    removeCompanionRepairDrones(enemy);
    const linkedMachine=tamingMachines[enemy.machineSlot];
    worldTone(linkedMachine?.group||enemy.group,330,.1,.035,"square");worldTone(linkedMachine?.group||enemy.group,660,.12,.03,"sine",sfxBus,.06);
    return true;
  }
  return false;
}

function removeCompanionRepairDrones(enemy){
  if(!enemy?.repairDroneSwarm)return;
  const linkedMachine=tamingMachines[enemy.machineSlot];
  linkedMachine?.droneDocks?.forEach((dock)=>{dock.droneModel.visible=true;});
  enemy.repairDrones?.forEach((drone)=>{drone.beam.material.dispose();drone.contactMaterial.dispose();});
  scene.remove(enemy.repairDroneSwarm);enemy.repairDroneSwarm=null;enemy.repairDrones=null;enemy.repairDroneDeployStartedAt=null;enemy.repairDroneReturnStartedAt=null;
}

function damageTamedEnemy(enemy, amount, source) {
  if(!enemy?.tamed || clock.elapsedTime<(enemy.tamedStunnedUntil||0))return;
  if(tamedGodMode){statusEl.textContent=`Tamed God Mode protected ${enemy.type.name}`;return;}
  enemy.health=Math.max(0,enemy.health-amount);
  enemy.bodyMaterial.emissive.setHex(0x1677ff); enemy.bodyMaterial.emissiveIntensity=1.3;
  window.setTimeout(()=>{if(enemy.tamed)enemy.bodyMaterial.emissiveIntensity=.2;},90);
  if(enemy.health<=0){
    enemy.tamedRepairStartedAt=clock.elapsedTime;
    enemy.tamedStunnedUntil=enemy.tamedRepairStartedAt+20;
    enemy.group.rotation.z=(enemy.typeId===1||enemy.typeId===2)?0:1.15; enemy.steering.set(0,0,0);
    if(enemy.typeId===2){const stunnedDuration=getEnemyDefinition(2).animations.stunnedDuration||2.2;applyEnemyPose(enemy,{elapsed:clock.elapsedTime,stunnedProgress:0});}
    enemy.group.updateMatrixWorld(true);
    createCompanionRepairDrones(enemy);
    if(enemy.typeId===1){playEnemySound(enemy,"stunned");enemy.nextCrawlerStunnedSound=clock.elapsedTime+1.05;}
    if(enemy.typeId===1&&enemy.burrowState){enemy.burrowState=null;enemy.group.visible=true;enemy.group.position.y=0;removeScrapBurrowMarker(enemy);}
    worldTone(enemy.group,175,.32,.09,"sawtooth");worldTone(enemy.group,88,.45,.075,"square",sfxBus,.12);
    speakSquadAlert(`${enemy.type.name} is down. Repairs are underway.`);
    statusEl.textContent=`${enemy.type.name} downed - repairing for 20 seconds`;
  } else statusEl.textContent=`${source} hit companion ${enemy.type.name}`;
  updateSquadUI(clock.elapsedTime);
}

function nearestHostile(position) {
  let target=null,best=Infinity;
  for(const enemy of enemies){
    if(!enemy.alive||enemy.tamed||isScrapCrawlerUnderground(enemy))continue;
    const distance=enemy.group.position.distanceTo(position);
    if(distance<best){best=distance;target=enemy;}
  }
  return {target,distance:best};
}

function companionTransitTarget(position,target){
  const fromMain=position.z>-23.2;
  const fromAuxiliary=position.z<-29.4;
  const targetMain=target.z>-23.2;
  const targetAuxiliary=target.z<-29.4;
  if((fromMain&&targetAuxiliary)||(fromAuxiliary&&targetMain)){
    const bridgeX=Math.abs(position.x+8.25)+Math.abs(target.x+8.25)<Math.abs(position.x-8.25)+Math.abs(target.x-8.25)?-8.25:8.25;
    return {x:bridgeX,z:fromMain?-23.05:-29.25};
  }
  if(!fromMain&&!fromAuxiliary)return {x:position.x<0?-8.25:8.25,z:targetAuxiliary?-30:-22.8};
  return target;
}

function moveCompanionToward(enemy, target, delta, stopDistance) {
  const travelTarget=companionTransitTarget(enemy.group.position,target);
  const crossing=travelTarget!==target;
  const dx=travelTarget.x-enemy.group.position.x,dz=travelTarget.z-enemy.group.position.z;
  const distance=Math.max(.01,Math.hypot(dx,dz));
  const elapsed=clock.elapsedTime;
  const movementLocked=elapsed<(enemy.stunnedUntil||0)||elapsed<(enemy.rootedUntil||0);
  const abilitySpeed=movementLocked?0:elapsed<(enemy.chargeUntil||0)?2.5:elapsed<(enemy.speedBoostUntil||0)?1.45:1;
  const desiredSpeed=distance>(crossing ? .2 : stopDistance)?enemy.speed*1.08*abilitySpeed:0;
  enemy.steering.x=THREE.MathUtils.damp(enemy.steering.x,dx/distance*desiredSpeed,6,delta);
  enemy.steering.z=THREE.MathUtils.damp(enemy.steering.z,dz/distance*desiredSpeed,6,delta);
  const radius=.32*enemy.type.scale;
  const nx=enemy.group.position.x+enemy.steering.x*delta;
  const nz=enemy.group.position.z+enemy.steering.z*delta;
  if(!enemyCollides(nx,enemy.group.position.z,radius))enemy.group.position.x=nx;else enemy.steering.x=0;
  if(!enemyCollides(enemy.group.position.x,nz,radius))enemy.group.position.z=nz;else enemy.steering.z=0;
  const yaw=Math.atan2(dx/distance,dz/distance);
  const difference=Math.atan2(Math.sin(yaw-enemy.group.rotation.y),Math.cos(yaw-enemy.group.rotation.y));
  enemy.group.rotation.y+=difference*Math.min(1,delta*10);
  return Math.hypot(enemy.steering.x,enemy.steering.z);
}

function updateTamedEnemy(enemy, delta, elapsed) {
  animateTamedAura(enemy,delta,elapsed);
  if(enemy.repairDroneReturnStartedAt!=null)updateReturningCompanionRepairDrones(enemy,delta,elapsed);
  if(enemy.typeId===1&&enemy.burrowState){updateScrapCrawlerBurrow(enemy,delta,elapsed);return;}
  if(elapsed<(enemy.tamedStunnedUntil||0)){
    updateCrawlerStunnedSound(enemy,elapsed);
    const repairProgress=THREE.MathUtils.clamp((elapsed-(enemy.tamedRepairStartedAt??elapsed))/20,0,1);
    enemy.health=enemy.maxHealth*repairProgress;
    if(enemy.typeId===1||enemy.typeId===2){const stunnedDuration=getEnemyDefinition(enemy.typeId).animations.stunnedDuration||2.2;applyEnemyPose(enemy,{elapsed,stunnedProgress:(elapsed%stunnedDuration)/stunnedDuration});}
    enemy.bodyMaterial.emissiveIntensity=.2+Math.sin(elapsed*8)*.08+repairProgress*.18;
    if(enemy.typeId===1){enemy.group.rotation.z=Math.sin(elapsed*7)*.012;enemy.group.position.y=Math.sin(elapsed*5)*.025;}
    else if(enemy.typeId!==2){enemy.group.rotation.z=1.15+Math.sin(elapsed*7)*.025;enemy.group.position.y=(enemy.flying?.25:0)+Math.sin(elapsed*5)*.025;}
    keepEnemyAboveArenaFloor(enemy);
    // Update the complete stunned pose before resolving animated anchors and
    // body-surface raycasts, eliminating the previous one-frame beam lag.
    enemy.group.updateMatrixWorld(true);
    updateCompanionRepairDrones(enemy,delta,elapsed,repairProgress);
    return;
  }
  if(enemy.tamedRepairStartedAt!=null){
    enemy.health=enemy.maxHealth;
    enemy.tamedRepairStartedAt=null;
    beginCompanionRepairDroneReturn(enemy,elapsed);
    enemy.group.rotation.z=0; enemy.group.position.y=enemy.flying?1.15:0;
    enemy.bodyMaterial.emissive.setHex(0x1677ff); enemy.bodyMaterial.emissiveIntensity=.2;
    playTamedRepairSound(enemy.group);
    speakSquadAlert(`${enemy.type.name} is repaired and back in the fight.`);
    statusEl.textContent=`${enemy.type.name} recovered and rejoined the fight`;
  }
  const nearest=nearestHostile(enemy.group.position);
  const shouldEngage=nearest.target && (squadMode==="attack" || nearest.distance<=10 || playerDistanceTo(nearest.target.group.position)<=10);
  let movementSpeed=0;
  if(shouldEngage){
    const target=nearest.target;
    enemy.abilityTarget=target;
    if(enemy.pendingStrikeAt&&elapsed>=enemy.pendingStrikeAt){
      if(combatTargetDistance(target,enemy.group.position)<3.2)damageCombatTarget(target,enemy.damage*1.25,enemy.typeId===18?"Tamed Shadow Strike":"Tamed Predator Strike",enemy);
      enemy.pendingStrikeAt=0;enemy.attackAnimation=1;
    }
    if(enemy.burstShots>0&&elapsed>=enemy.burstAt){
      const start=enemy.group.position.clone();start.y+=Math.max(.6,enemy.type.scale);
      const end=target.group.position.clone();end.y+=Math.max(.6,target.type.scale);
      createTracer(start,end,TAMED_ABILITY_COLOR);target.aggroTarget=enemy;target.aggroUntil=elapsed+6;damageEnemy(target,Math.max(4,Math.round(enemy.damage*.55)),"body");
      enemy.burstShots-=1;enemy.burstAt=elapsed+(enemy.typeId===15?.14:.25);
      if(enemy.burstShots===0&&enemy.crashAfterBurst){
        // Compatibility cleanup for an E02 spawned before Barrage was changed
        // from a false stun to a rooted firing recovery.
        enemy.rootedUntil=Math.max(enemy.rootedUntil||0,elapsed+.35);
        enemy.crashAfterBurst=false;
      }
    }
    if(elapsed>=enemy.abilityAt)activateSignatureAbility(enemy,elapsed,nearest.distance,target);
    if(enemy.typeId===1&&enemy.burrowState){updateScrapCrawlerBurrow(enemy,delta,elapsed);return;}
    const desiredRange=enemy.type.range>5?Math.min(7,enemy.type.range*.65):Math.max(.85,enemy.type.range*.8);
    movementSpeed=moveCompanionToward(enemy,target.group.position,delta,desiredRange);
    const distance=enemy.group.position.distanceTo(target.group.position);
    if(distance<=desiredRange+1&&elapsed>=enemy.tamedNextAttack&&!(enemy.burstShots>0)){
      enemy.attackAnimation=1; playEnemySound(enemy,"attack");
      const allyDamage=Math.max(5,Math.round(enemy.damage*.72));
      if(enemy.type.range>5){
        const start=enemy.group.position.clone(); start.y+=Math.max(.6,enemy.type.scale);
        const end=target.group.position.clone(); end.y+=Math.max(.6,target.type.scale);
        createTracer(start,end,TAMED_ABILITY_COLOR);
      }
      target.aggroTarget=enemy;target.aggroUntil=elapsed+6;damageEnemy(target,allyDamage,"body");
      enemy.tamedNextAttack=elapsed+Math.max(.55,enemy.type.cooldown);
    }
  }else{
    const slot=enemy.followSlot||0;
    const angle=camera.rotation.y+Math.PI+(slot-2)*.38;
    const followDistance=2.2+Math.floor(slot/2)*.7;
    const followTarget=new THREE.Vector3(camera.position.x+Math.sin(angle)*followDistance,0,camera.position.z+Math.cos(angle)*followDistance);
    movementSpeed=moveCompanionToward(enemy,followTarget,delta,1);
  }
  updateEnemyAnimation(enemy,delta,elapsed,movementSpeed);
}

function updateCapturableEnemy(enemy, delta, elapsed) {
  enemy.captureTimeRemaining=Math.max(0,(enemy.captureTimeRemaining??CAPTURABLE_LIFETIME)-delta);
  if(enemy.typeId===1||enemy.typeId===2){
    updateCrawlerStunnedSound(enemy,elapsed);
    const stunnedDuration=getEnemyDefinition(enemy.typeId).animations.stunnedDuration||2.2;
    applyEnemyPose(enemy,{elapsed,stunnedProgress:(elapsed%stunnedDuration)/stunnedDuration});
    if(enemy.typeId===1)enemy.group.rotation.z=Math.sin(elapsed*8)*.012;
  }else enemy.group.rotation.z=THREE.MathUtils.damp(enemy.group.rotation.z,.92,5,delta);
  keepEnemyAboveArenaFloor(enemy);
  if(enemy.captureMarker){
    enemy.captureMarker.rotation.z+=delta*2.2;
    const pulse=1+Math.sin(elapsed*5+enemy.seed)*.12;
    enemy.captureMarker.scale.setScalar(.72*pulse);
  }
  if(enemy.captureLabel){
    const distance=playerDistanceTo(enemy.group.position);
    enemy.captureLabel.position.copy(enemy.group.position);
    enemy.captureLabel.position.y+=Math.max(1.55,enemy.type.scale*2.05)+Math.sin(elapsed*3+enemy.seed)*.08;
    enemy.captureLabel.visible=gameplayActive()&&!isMobileDevice&&distance<=6.5;
    enemy.captureLabel.material.opacity=.82+Math.sin(elapsed*4+enemy.seed)*.16;
    if(enemy.captureArrow){
      enemy.captureArrow.position.copy(enemy.group.position);
      enemy.captureArrow.position.y+=Math.max(2.05,enemy.type.scale*2.35)+Math.sin(elapsed*4+enemy.seed)*.18;
      enemy.captureArrow.visible=gameplayActive()&&distance>6.5&&distance<24;
      const arrowPulse=.68+Math.sin(elapsed*5+enemy.seed)*.08;enemy.captureArrow.scale.set(arrowPulse,arrowPulse,1);
      enemy.captureArrow.material.opacity=.72+Math.sin(elapsed*5+enemy.seed)*.24;
    }
  }
  if(enemy.typeId!==1)enemy.parts.legs.forEach((leg,index)=>{leg.rotation.x=leg.userData.baseRotation.x+Math.sin(elapsed*7+index)*.05;});
}

function updateEnemies(delta, elapsed) {
  navRefresh -= delta;
  if (navRefresh <= 0) {
    const playerCellIndex = navIndex(worldToNav(camera.position.x), worldToNav(camera.position.z));
    if (playerCellIndex !== navTargetIndex) rebuildFlowField();
    navRefresh = .25;
  }
  const deadToRemove = [];
  for (const enemy of enemies) {
    if (gameOver || missionComplete) break;
    if (enemy.dying) {
      hideHostileTracking(enemy);
      if (updateDyingEnemy(enemy, delta)) deadToRemove.push(enemy);
      continue;
    }
    if(enemy.capturable){hideHostileTracking(enemy);updateCapturableEnemy(enemy,delta,elapsed);continue;}
    if(enemy.tamed){hideHostileTracking(enemy);updateTamedEnemy(enemy,delta,elapsed);continue;}
    if (!enemy.alive){hideHostileTracking(enemy);continue;}
    updateHostileTracking(enemy,elapsed);
    if (enemy.typeId === 1 && updateScrapCrawlerBurrow(enemy, delta, elapsed)) continue;
    const playerDistance = playerDistanceTo(enemy.group.position);
    // Hostiles choose the physically closest valid target. A companion that
    // damaged this enemy can gain aggro feedback, but never distance priority.
    let companionTarget=null,companionDistance=playerDistance;
    for(const ally of tamedEnemies){
      if(!ally.alive||elapsed<(ally.tamedStunnedUntil||0)||isScrapCrawlerUnderground(ally))continue;
      const candidateDistance=combatTargetDistance(ally,enemy.group.position);
      if(candidateDistance<companionDistance){companionTarget=ally;companionDistance=candidateDistance;}
    }
    const targetPosition=companionTarget?companionTarget.group.position:camera.position;
    const dx = targetPosition.x - enemy.group.position.x;
    const dz = targetPosition.z - enemy.group.position.z;
    const distance = Math.max(.001, Math.hypot(dx, dz));
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const style = enemy.type.style;

    if (style === "cloak") enemy.bodyMaterial.opacity = elapsed < (enemy.cloakUntil || 0) ? .1 : .3 + Math.abs(Math.sin(elapsed * 1.7 + enemy.seed)) * .28;
    if (enemy.pendingStrikeAt && elapsed >= enemy.pendingStrikeAt) {
      if(combatTargetDistance(enemy.abilityTarget,enemy.group.position)<3.2)damageCombatTarget(enemy.abilityTarget,enemy.damage*1.25,enemy.typeId===18?"Shadow Strike":"Predator Strike",enemy);
      enemy.attackAnimation = 1;
      enemy.pendingStrikeAt = 0;
    }
    if (enemy.burstShots > 0 && elapsed >= enemy.burstAt) {
      if(enemy.abilityTarget?.tamed){
        const start=enemy.group.position.clone();start.y+=Math.max(.6,enemy.type.scale);
        const end=enemy.abilityTarget.group.position.clone();end.y+=Math.max(.6,enemy.abilityTarget.type.scale);
        createTracer(start,end);damageTamedEnemy(enemy.abilityTarget,enemy.damage,enemy.type.name);
      }else fireEnemyProjectile(enemy,false);
      enemy.attackAnimation = 1;
      enemy.burstShots -= 1;
      enemy.burstAt = elapsed + (enemy.typeId === 15 ? .14 : .25);
      if (enemy.burstShots === 0 && enemy.crashAfterBurst) {
        // Do not invoke the shared stunned/knockdown pose after E02's Barrage.
        enemy.rootedUntil = Math.max(enemy.rootedUntil || 0, elapsed + .35);
        enemy.crashAfterBurst = false;
      }
    }
    if (elapsed >= enemy.abilityAt) activateSignatureAbility(enemy,elapsed,companionTarget?distance:playerDistance,companionTarget);
    if (enemy.typeId === 1 && enemy.burrowState) {
      updateScrapCrawlerBurrow(enemy, delta, elapsed);
      continue;
    }

    const ranged = enemy.type.range > 5;
    const hasSight = enemyHasLineOfSight(enemy, distance, elapsed, targetPosition);
    let moveSign = distance > enemy.type.range * (ranged ? .76 : .92) ? 1 : 0;
    if (ranged && !hasSight) moveSign = 1;
    if (moveSign > 0 && (hasSight || companionTarget)) navDirection.set(dirX, 0, dirZ);
    else if (moveSign > 0) getWaypointDirection(enemy, navDirection);
    else navDirection.set(0, 0, 0);
    const movementLocked=elapsed<(enemy.stunnedUntil||0)||elapsed<(enemy.rootedUntil||0);
    const abilitySpeed = movementLocked ? 0 : elapsed < (enemy.chargeUntil || 0) ? 2.5 : elapsed < (enemy.speedBoostUntil || 0) ? 1.45 : 1;
    const stepX = navDirection.x * enemy.speed * abilitySpeed * moveSign;
    const stepZ = navDirection.z * enemy.speed * abilitySpeed * moveSign;
    enemy.steering.x = THREE.MathUtils.damp(enemy.steering.x, stepX, 5, delta);
    enemy.steering.z = THREE.MathUtils.damp(enemy.steering.z, stepZ, 5, delta);
    const radius = .36 * enemy.type.scale;
    const previousX = enemy.group.position.x;
    const previousZ = enemy.group.position.z;
    const nextX = previousX + enemy.steering.x * delta;
    if (!enemyCollides(nextX, enemy.group.position.z, radius)) enemy.group.position.x = nextX;
    else { enemy.steering.x = 0; enemy.pathVersion = -1; }
    const nextZ = previousZ + enemy.steering.z * delta;
    if (!enemyCollides(enemy.group.position.x, nextZ, radius)) enemy.group.position.z = nextZ;
    else { enemy.steering.z = 0; enemy.pathVersion = -1; }

    const movedX = enemy.group.position.x - previousX;
    const movedZ = enemy.group.position.z - previousZ;
    const movementSpeed = Math.hypot(movedX, movedZ) / Math.max(delta, .001);
    const targetYaw = Math.atan2(dirX, dirZ);
    const yawDifference = Math.atan2(Math.sin(targetYaw - enemy.group.rotation.y), Math.cos(targetYaw - enemy.group.rotation.y));
    enemy.group.rotation.y += yawDifference * Math.min(1, delta * (style === "assassin" ? 14 : 9));
    if (distance <= enemy.type.range && hasSight && elapsed >= enemy.nextAttack && !(enemy.burstShots > 0)) {
      enemy.attackAnimation = 1;
      playEnemySound(enemy, "attack");
      if (ranged) {
        if(companionTarget){
          const start=enemy.group.position.clone();start.y+=Math.max(.6,enemy.type.scale);
          const end=companionTarget.group.position.clone();end.y+=Math.max(.6,companionTarget.type.scale);
          createTracer(start,end); damageTamedEnemy(companionTarget,enemy.damage,enemy.type.name);
        }else fireEnemyProjectile(enemy, style === "homing" || style === "boss");
        if (style === "burst" || style === "heavy") enemy.nextAttack = elapsed + enemy.type.cooldown * .62;
        else enemy.nextAttack = elapsed + enemy.type.cooldown;
      } else {
        if(companionTarget)damageTamedEnemy(companionTarget,enemy.damage,enemy.type.name);
        else damagePlayer(enemy.damage, enemy.type.name);
        if (!companionTarget && style === "leaper") {
          slowedUntil = performance.now() + 1600;
          statusEl.textContent = "Shock field - movement slowed";
        }
        if (!companionTarget && style === "flame") {
          window.setTimeout(() => damagePlayer(3, "Burn"), 350);
          window.setTimeout(() => damagePlayer(3, "Burn"), 700);
        }
        enemy.nextAttack = elapsed + enemy.type.cooldown;
      }
      if (style === "boss") {
        const phase = enemy.health / enemy.maxHealth < .34 ? .55 : enemy.health / enemy.maxHealth < .67 ? .75 : 1;
        enemy.nextAttack = elapsed + enemy.type.cooldown * phase;
      }
    }
    updateEnemyAnimation(enemy, delta, elapsed, movementSpeed);
  }
  deadToRemove.forEach((enemy) => {
    scene.remove(enemy.group);
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
    disposeEnemyResources(enemy);
  });
}

function updateOnlyEnemyDeaths(delta) {
  const expired = [];
  enemies.forEach((enemy) => {
    if (enemy.dying && updateDyingEnemy(enemy, delta)) expired.push(enemy);
  });
  expired.forEach((enemy) => {
    scene.remove(enemy.group);
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
    disposeEnemyResources(enemy);
  });
}

function removeProjectile(index) {
  scene.remove(enemyProjectiles[index].mesh);
  enemyProjectiles.splice(index, 1);
}

function updateProjectiles(delta) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = enemyProjectiles[i];
    projectile.life -= delta;
    if (projectile.homing) {
      const desired = new THREE.Vector3(camera.position.x, PLAYER.eyeHeight * .75, camera.position.z)
        .sub(projectile.mesh.position).normalize();
      projectile.direction.lerp(desired, Math.min(1, delta * 1.2)).normalize();
    }
    projectile.mesh.position.addScaledVector(projectile.direction, projectile.speed * delta);
    const dx = projectile.mesh.position.x - camera.position.x;
    const dy = projectile.mesh.position.y - camera.position.y;
    const dz = projectile.mesh.position.z - camera.position.z;
    if (dx * dx + dy * dy + dz * dz < .5) {
      damagePlayer(projectile.damage, "Projectile");
      removeProjectile(i);
    } else if (projectile.life <= 0 || enemyCollides(projectile.mesh.position.x, projectile.mesh.position.z, .08)) {
      removeProjectile(i);
    }
  }
}

function damageEnemy(enemy, amount, hitPart,playerShot=false) {
  if (!enemy?.alive||isScrapCrawlerUnderground(enemy)) return;
  let actualDamage = amount;
  if(oneHitMode&&playerShot)actualDamage=Math.max(enemy.health,enemy.maxHealth);
  else{
    if (hitPart === "head") actualDamage *= 2;
    if (enemy.type.style === "shield" && hitPart !== "head") actualDamage *= .35;
  }
  enemy.health -= actualDamage;
  enemy.bodyMaterial.emissiveIntensity = 1.4;
  window.setTimeout(() => { if (enemy.alive) enemy.bodyMaterial.emissiveIntensity = .12; }, 70);
  if (!enemy.hurtSoundAt || performance.now() > enemy.hurtSoundAt) {
    playEnemySound(enemy, "hurt");
    enemy.hurtSoundAt = performance.now() + 120;
  }
  statusEl.textContent = `${enemy.type.name} ${Math.max(0, Math.ceil(enemy.health))}/${enemy.maxHealth}`;
  if (enemy.health <= 0) killEnemy(enemy);
}

function disposeEnemyResources(enemy) {
  removeCompanionRepairDrones(enemy);
  removeCaptureLabel(enemy);
  if(enemy.hostileArrow){scene.remove(enemy.hostileArrow);enemy.hostileArrow.material.dispose();enemy.hostileArrow=null;}
  const sharedGeometries = new Set([
    enemyBodyGeometry, enemyHeadGeometry, enemyEyeGeometry, enemyShieldGeometry,
    unitBoxGeometry, unitSphereGeometry, unitCylinderGeometry, unitConeGeometry, unitTorusGeometry,
    unitCapsuleGeometry, unitDiamondGeometry,
  ]);
  const disposedMaterials = new Set();
  enemy.group.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry && !child.userData.hostileTrackingShell && !sharedGeometries.has(child.geometry)) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((entry) => {
      if (entry && !disposedMaterials.has(entry)) {
        entry.dispose();
        disposedMaterials.add(entry);
      }
    });
  });
}

function killEnemy(enemy) {
  if (!enemy.alive || enemy.tamed) return;
  runKills += 1;
  const earnedPoints=Math.round((100 + enemy.typeId * 35 + currentWave * 12) * (enemy.elite ? 2 : 1));
  runPoints += earnedPoints;
  runPointsEl.textContent=runPoints.toLocaleString();
  showPointsAward(earnedPoints);
  hideHostileTracking(enemy);
  if (enemy.typeId === 1) {
    enemy.group.visible = true;
    enemy.group.position.y = Math.max(0, enemy.group.position.y);
    enemy.group.rotation.x = 0;
    enemy.group.rotation.z = 0;
    enemy.burrowState = null;
    removeScrapBurrowMarker(enemy);
  }
  removeEnemyFromHitMeshes(enemy);
  if(Math.random()<.2)spawnNanoCell(enemy.group.position);
  if(Math.random()<.25){
    makeEnemyCapturable(enemy);
  }else{
    enemy.alive=false; enemy.dying=true; enemy.deathTime=0;
    playEnemySound(enemy,"death");
    if (enemy.explodesOnDeath) {
      createAbilityEffect("radiation-blast", enemy.group.position, { color: abilityColor[3], radius: 2.6, life: .45 });
      if (playerDistanceTo(enemy.group.position) < 2.6) damagePlayer(enemy.damage * 1.5, "Radiation Blast");
    }
  }
  updateEnemyCount();
  if (waveActive && livingHostiles().length===0 && spawnQueue.length === 0) completeWave();
}

function showPointsAward(points){
  if(!pointsPopupsEl)return;
  const popup=document.createElement("span");
  popup.textContent=`+${points.toLocaleString()} PTS`;
  popup.style.setProperty("--points-shift",`${(Math.random()-.5)*12}px`);
  popup.style.top=`${Math.min(pointsPopupsEl.childElementCount,4)*13}px`;
  pointsPopupsEl.appendChild(popup);
  window.setTimeout(()=>popup.remove(),1000);
}

function completeWave() {
  waveActive = false;
  clearAbilityEffects();
  if (currentWave >= MAX_WAVES) {
    nextWaveAt=performance.now()+30000;
    statusEl.textContent="Final wave cleared - 30 seconds to recover and process a robot";
    clearTimeout(nextWaveTimer);
    nextWaveTimer=window.setTimeout(()=>finishGame(true),30000);
    return;
  }
  let reward = "Wave cleared";
  if (currentWave % 5 === 0) {
    playerHealth = Math.min(PLAYER.maxHealth, playerHealth + 30);
    ammo = MAGAZINE_CAPACITY;
    ammoEl.textContent = String(MAGAZINE_CAPACITY);
    updateHealthHud();
    reward = "Wave cleared - health and ammo restored";
  }
  statusEl.textContent = `${reward}. Next wave in 6 seconds`;
  tone(440, .15, .08, "sine");
  tone(660, .22, .06, "sine", sfxBus, .12);
  clearTimeout(nextWaveTimer);
  nextWaveAt=performance.now()+6000;
  nextWaveTimer = window.setTimeout(() => beginWave(currentWave + 1), 6000);
}

function finishGame(won) {
  gameOver = !won;
  missionComplete = won;
  waveActive = false;
  nextWaveAt=0;
  spawnQueue = [];
  clearAbilityEffects();
  clearTimeout(nextWaveTimer);
  resultLabelEl.textContent = won ? "MISSION COMPLETE" : "SUIT FAILURE";
  resultTitleEl.innerHTML = won ? "OUTPOST<br><span>RESTORED</span>" : "WAVE<br><span>FAILED</span>";
  resultCopyEl.textContent = won
    ? `You survived all 50 waves with ${runPoints.toLocaleString()} points.`
    : `You reached wave ${currentWave} with ${runPoints.toLocaleString()} points. Recalibrate and try again.`;
  submitRunScore();
  if(!won){
    firingHeld=false;keys.clear();reloading=false;reloadHand.visible=false;
    deathAnimationActive=true;deathAnimationStartedAt=performance.now();deathStartY=camera.position.y;deathStartRotation.copy(camera.rotation);
    damageFlashEl.classList.remove("hit","shield-hit");damageFlashEl.classList.add("fatal-hit");
    playPlayerDeathSound();
  }
  window.setTimeout(() => mobilePlaying ? leaveMobileGame() : controls.unlock(), won?250:1750);
}

async function submitRunScore() {
  if (!window.neonAuth?.user || currentWave < 1 || runPoints < 1) return;
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: window.neonAuth.user.username,
        score: runPoints,
        wave: currentWave,
        kills: runKills,
      }),
    });
    if (!response.ok) throw new Error(`Score submission failed (${response.status}).`);
    window.dispatchEvent(new CustomEvent("neon-score-submitted"));
  } catch (error) {
    console.error("Unable to submit run score", error);
  }
}

function updatePlayerDeathAnimation(){
  if(!deathAnimationActive)return;
  const progress=THREE.MathUtils.clamp((performance.now()-deathAnimationStartedAt)/1500,0,1);
  const fall=1-Math.pow(1-progress,3);
  const impact=Math.sin(Math.min(1,progress/.72)*Math.PI)*.025;
  camera.position.y=THREE.MathUtils.lerp(deathStartY,.46,fall)-impact;
  camera.rotation.x=THREE.MathUtils.lerp(deathStartRotation.x,.32,fall);
  camera.rotation.y=deathStartRotation.y;
  camera.rotation.z=THREE.MathUtils.lerp(deathStartRotation.z,1.02,fall);
  gun.position.x=THREE.MathUtils.lerp(.48,.82,fall);
  gun.position.y=THREE.MathUtils.lerp(-.4,-1.28,fall);
  gun.position.z=THREE.MathUtils.lerp(-.78,-.48,fall);
  gun.rotation.x=THREE.MathUtils.lerp(0,.55,fall);
  gun.rotation.z=THREE.MathUtils.lerp(0,.72,fall);
}

function collides(x, z) {
  if (!insidePlayableArea(x,z,PLAYER.radius)) return true;
  return obstacles.some((box) =>
    camera.position.y - PLAYER.eyeHeight < box.height &&
    x + PLAYER.radius > box.minX && x - PLAYER.radius < box.maxX &&
    z + PLAYER.radius > box.minZ && z - PLAYER.radius < box.maxZ
  );
}

function movePlayer(delta) {
  const inputX = THREE.MathUtils.clamp(Number(keys.has("KeyD")) - Number(keys.has("KeyA")) + mobileMove.x, -1, 1);
  const inputZ = THREE.MathUtils.clamp(Number(keys.has("KeyW")) - Number(keys.has("KeyS")) + mobileMove.z, -1, 1);
  const sprinting = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && inputZ > 0 && performance.now() >= sprintDisabledUntil;
  const slowMultiplier = godSpeedMode?1:(performance.now() < slowedUntil ? .58 : 1);
  const testingSpeedMultiplier=godSpeedMode?3:1;
  const speed = (sprinting ? PLAYER.sprint : PLAYER.walk) * slowMultiplier * testingSpeedMultiplier;
  speedLines.classList.toggle("active", (sprinting||godSpeedMode) && gameplayActive()&&(Math.abs(inputX)+Math.abs(inputZ)>.05));

  if(noClipMode){
    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward,camera.up).normalize();
    const verticalInput=Number(keys.has("Space"))-Number(keys.has("ControlLeft")||keys.has("ControlRight"));
    moveDirection.set(0,0,0).addScaledVector(forward,inputZ).addScaledVector(right,inputX);
    moveDirection.y+=verticalInput;
    if(moveDirection.lengthSq()>0)camera.position.addScaledVector(moveDirection.normalize(),speed*delta);
    velocity.y=0;
    canJump=true;
    return;
  }

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  moveDirection.set(0, 0, 0).addScaledVector(forward, inputZ).addScaledVector(right, inputX);
  if (moveDirection.lengthSq() > 0) moveDirection.normalize().multiplyScalar(speed * delta);

  const nextX = camera.position.x + moveDirection.x;
  if (!collides(nextX, camera.position.z)) camera.position.x = nextX;
  const nextZ = camera.position.z + moveDirection.z;
  if (!collides(camera.position.x, nextZ)) camera.position.z = nextZ;

  velocity.y -= 20 * delta;
  camera.position.y += velocity.y * delta;
  if (camera.position.y <= PLAYER.eyeHeight) {
    camera.position.y = PLAYER.eyeHeight;
    velocity.y = 0;
    canJump = true;
  }
}

function resetGame() {
  clearTimeout(nextWaveTimer);
  resetMachineTransport(true);
  enemies.forEach((enemy) => {
    scene.remove(enemy.group);
    disposeEnemyResources(enemy);
  });
  enemies.length = 0;
  tamedEnemies.length = 0;
  renderSquadUI();
  enemyHitMeshes.length = 0;
  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) removeProjectile(i);
  clearAbilityEffects();
  clearNanoCells();
  spawnQueue = [];
  waveSelectEl.value = "1";
  currentWave = 0;
  runPoints = 0;
  runKills = 0;
  runPointsEl.textContent="0";
  pointsPopupsEl.replaceChildren();
  waveActive = false;
  waveStartedAt=0;
  nextWaveAt=0;
  missionComplete = false;
  gameOver = false;
  deathAnimationActive=false;damageFlashEl.classList.remove("fatal-hit");
  playerHealth = PLAYER.maxHealth;
  nanoShield=NANO_SHIELD_MAX;
  lastPlayerDamageAt=Number.NEGATIVE_INFINITY;
  scoreEl.textContent = "0";
  statusEl.textContent = "Prepare for wave 1";
  camera.position.set(0, PLAYER.eyeHeight, 18);
  camera.rotation.set(0, 0, 0);
  velocity.set(0, 0, 0);
  ammo = MAGAZINE_CAPACITY;
  ammoEl.textContent = String(MAGAZINE_CAPACITY);
  reloading = false;
  slowedUntil = 0;
  sprintDisabledUntil = 0;
  updateHealthHud();
  updateEnemyCount();
}

function clearCurrentCombat() {
  clearTimeout(nextWaveTimer);
  resetMachineTransport(false);
  nextWaveTimer = undefined;
  waveActive = false;
  spawnQueue = [];
  const retainedCompanions=enemies.filter((enemy)=>enemy.tamed);
  enemies.filter((enemy)=>!enemy.tamed).forEach((enemy) => {
    enemy.alive = false;
    scene.remove(enemy.group);
    disposeEnemyResources(enemy);
  });
  enemies.length = 0;
  enemies.push(...retainedCompanions);
  enemyHitMeshes.length = 0;
  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) removeProjectile(i);
  clearAbilityEffects();
  clearNanoCells();
  updateEnemyCount();
}

function setGodMode(enabled) {
  if (enabled && !["admin", "owner"].includes(window.neonAuth?.user?.role)) return;
  godMode = Boolean(enabled);
  updateTestingToggle(godModeButtonEl,godModeStateEl,godMode);
  if (godMode) {
    playerHealth = PLAYER.maxHealth;
    nanoShield=NANO_SHIELD_MAX;
    updateHealthHud();
  }
  updateTestingIndicator();
  statusEl.textContent = godMode ? "God Mode enabled - damage immunity active" : "God Mode disabled";
}

function testingAccessAllowed(){return ["admin","owner"].includes(window.neonAuth?.user?.role);}

function updateTestingToggle(button,state,enabled){
  button?.classList.toggle("active",enabled);
  button?.setAttribute("aria-pressed",String(enabled));
  if(state)state.textContent=enabled?"ON":"OFF";
}

function updateTestingIndicator(){
  const enabled=[];
  if(godMode)enabled.push("GOD");
  if(noClipMode)enabled.push("NO CLIP");
  if(noReloadMode)enabled.push("NO RELOAD");
  if(godSpeedMode)enabled.push("3X SPEED");
  if(oneHitMode)enabled.push("ONE HIT");
  if(tamedGodMode)enabled.push("TAMED GOD");
  godModeIndicatorEl.textContent=enabled.length?`TEST // ${enabled.join(" · ")}`:"";
  godModeIndicatorEl.classList.toggle("hidden",enabled.length===0);
}

function setNoClipMode(enabled){
  if(enabled&&!testingAccessAllowed())return;
  noClipMode=Boolean(enabled);
  velocity.y=0;canJump=true;
  if(!noClipMode){
    const overlapsObstacle=obstacles.some((box)=>camera.position.x+PLAYER.radius>box.minX&&camera.position.x-PLAYER.radius<box.maxX&&camera.position.z+PLAYER.radius>box.minZ&&camera.position.z-PLAYER.radius<box.maxZ);
    if(!insidePlayableArea(camera.position.x,camera.position.z,PLAYER.radius)||overlapsObstacle)camera.position.set(0,PLAYER.eyeHeight,18);
    else camera.position.y=Math.max(PLAYER.eyeHeight,camera.position.y);
  }
  updateTestingToggle(noClipButtonEl,noClipStateEl,noClipMode);
  updateTestingIndicator();
  statusEl.textContent=noClipMode?"No Clip enabled - WASD fly, Space up, Ctrl down":"No Clip disabled - collision restored";
}

function setNoReloadMode(enabled){
  if(enabled&&!testingAccessAllowed())return;
  noReloadMode=Boolean(enabled);
  if(noReloadMode){
    ammo=MAGAZINE_CAPACITY;ammoEl.textContent=String(ammo);reloading=false;reloadHand.visible=false;gunMagazine.visible=true;
  }
  updateTestingToggle(noReloadButtonEl,noReloadStateEl,noReloadMode);
  updateTestingIndicator();
  updateAmmoWarning();
  statusEl.textContent=noReloadMode?"No Reload enabled - magazine stays full":"No Reload disabled";
}

function setGodSpeedMode(enabled){
  if(enabled&&!testingAccessAllowed())return;
  godSpeedMode=Boolean(enabled);
  updateTestingToggle(godSpeedButtonEl,godSpeedStateEl,godSpeedMode);
  updateTestingIndicator();
  statusEl.textContent=godSpeedMode?"God Speed enabled - movement increased to 3X":"God Speed disabled";
}

function setOneHitMode(enabled){
  if(enabled&&!testingAccessAllowed())return;
  oneHitMode=Boolean(enabled);
  updateTestingToggle(oneHitButtonEl,oneHitStateEl,oneHitMode);
  updateTestingIndicator();
  statusEl.textContent=oneHitMode?"One Hit enabled - player shots eliminate targets":"One Hit disabled";
}

function setTamedGodMode(enabled){
  if(enabled&&!testingAccessAllowed())return;
  tamedGodMode=Boolean(enabled);
  if(tamedGodMode){
    tamedEnemies.forEach((enemy)=>{
      enemy.health=enemy.maxHealth;enemy.tamedStunnedUntil=0;enemy.tamedRepairStartedAt=null;
      enemy.group.rotation.z=0;enemy.group.position.y=0;enemy.steering.set(0,0,0);
      removeCompanionRepairDrones(enemy);
      applyEnemyPose(enemy,{elapsed:clock.elapsedTime});
    });
    updateSquadUI(clock.elapsedTime);
  }
  updateTestingToggle(tamedGodButtonEl,tamedGodStateEl,tamedGodMode);
  updateTestingIndicator();
  statusEl.textContent=tamedGodMode?"Tamed God Mode enabled - companions cannot be downed":"Tamed God Mode disabled";
}

function disableTestingModes(){
  setGodMode(false);setNoClipMode(false);setNoReloadMode(false);setGodSpeedMode(false);setOneHitMode(false);setTamedGodMode(false);
}

function changeWaveLevel() {
  if (!["admin", "owner"].includes(window.neonAuth?.user?.role)) return;
  const selectedWave = THREE.MathUtils.clamp(Number.parseInt(waveSelectEl.value, 10) || 1, 1, MAX_WAVES);
  initAudio();
  clearCurrentCombat();
  missionComplete = false;
  gameOver = false;
  deathAnimationActive=false;damageFlashEl.classList.remove("fatal-hit");
  playerHealth = PLAYER.maxHealth;
  nanoShield=NANO_SHIELD_MAX;
  lastPlayerDamageAt=Number.NEGATIVE_INFINITY;
  ammo = MAGAZINE_CAPACITY;
  ammoEl.textContent = String(MAGAZINE_CAPACITY);
  reloading = false;
  slowedUntil = 0;
  sprintDisabledUntil = 0;
  completeScreen.classList.add("hidden");
  updateHealthHud();
  beginWave(selectedWave);
  startGameInput();
}

for (let waveNumber = 1; waveNumber <= MAX_WAVES; waveNumber += 1) {
  const option = document.createElement("option");
  option.value = String(waveNumber);
  option.textContent = `Wave ${waveNumber}`;
  waveSelectEl.append(option);
}
waveSelectEl.value = "1";
godModeButtonEl.addEventListener("click", () => {
  if (["admin", "owner"].includes(window.neonAuth?.user?.role)) setGodMode(!godMode);
});
noClipButtonEl.addEventListener("click",()=>setNoClipMode(!noClipMode));
noReloadButtonEl.addEventListener("click",()=>setNoReloadMode(!noReloadMode));
godSpeedButtonEl.addEventListener("click",()=>setGodSpeedMode(!godSpeedMode));
oneHitButtonEl.addEventListener("click",()=>setOneHitMode(!oneHitMode));
tamedGodButtonEl.addEventListener("click",()=>setTamedGodMode(!tamedGodMode));
changeWaveButtonEl.addEventListener("click", () => {
  if (["admin", "owner"].includes(window.neonAuth?.user?.role)) changeWaveLevel();
});
volumeButtonEl.addEventListener("click",toggleMasterVolume);
volumeRangeEl.addEventListener("input",()=>{initAudio();setMasterVolume(Number(volumeRangeEl.value)/100);});
voiceButtonEl.addEventListener("click",()=>setSquadVoiceEnabled(!squadVoiceEnabled));
if("speechSynthesis" in window){chooseSquadVoice();window.speechSynthesis.addEventListener("voiceschanged",chooseSquadVoice);}
updateMasterVolumeUI();

function showGameplayUI() {
  document.body.classList.add("play-mode");
  menu.classList.add("hidden");
  completeScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  squadPanelEl.classList.remove("hidden");
  clock.getDelta();
  if (currentWave === 0 && !waveActive) {
    clearTimeout(nextWaveTimer);
    nextWaveTimer = window.setTimeout(() => beginWave(1), 1200);
  }
}

function updateMenuState(){
  const resumable=currentWave>0&&!missionComplete&&!gameOver;
  restartButtonEl.classList.toggle("hidden",!resumable);
  playButtonLabelEl.textContent=resumable?`RESUME WAVE ${currentWave}`:"ENTER THE OUTPOST";
}

function setMenuSettingsOpen(open){
  menuSecondaryEl?.classList.toggle("settings-open",open);
  settingsButtonEl?.classList.toggle("active",open);
  settingsButtonEl?.setAttribute("aria-pressed",String(open));
  if(open){
    updateNetworkEstimate();
    measureServerPing();
  }
}

settingsButtonEl?.addEventListener("click",()=>setMenuSettingsOpen(!menuSecondaryEl?.classList.contains("settings-open")));
settingsCloseButtonEl?.addEventListener("click",()=>setMenuSettingsOpen(false));
refreshPingButtonEl?.addEventListener("click",measureServerPing);

function enterMobileGame() {
  mobilePlaying = true;
  document.body.classList.add("mobile-play");
  showGameplayUI();
}

function leaveMobileGame() {
  mobilePlaying = false;
  firingHeld = false;
  joystickPointerId = null;
  lookPointerId = null;
  mobileMove.x = 0;
  mobileMove.z = 0;
  mobileJoystickThumbEl.style.transform = "translate(-50%, -50%)";
  keys.clear();
  document.body.classList.remove("play-mode", "mobile-play");
  speedLines.classList.remove("active");
  hud.classList.add("hidden");
  squadPanelEl.classList.add("hidden");
  if (missionComplete || gameOver) completeScreen.classList.remove("hidden");
  else {updateMenuState();menu.classList.remove("hidden");}
}

function startGameInput() {
  if (isMobileDevice) enterMobileGame();
  else controls.lock();
}

document.querySelector("#play-button").addEventListener("click", () => {
  initAudio();
  startGameInput();
});
restartButtonEl.addEventListener("click",()=>{
  initAudio();
  completeScreen.classList.add("hidden");
  resetGame();
  startGameInput();
});
document.querySelector("#again-button").addEventListener("click", () => {
  completeScreen.classList.add("hidden");
  resetGame();
  startGameInput();
});

controls.addEventListener("lock", () => {
  showGameplayUI();
});

controls.addEventListener("unlock", () => {
  document.body.classList.remove("play-mode");
  firingHeld=false;
  keys.clear();
  speedLines.classList.remove("active");
  hud.classList.add("hidden");
  squadPanelEl.classList.add("hidden");
  if (missionComplete || gameOver) completeScreen.classList.remove("hidden");
  else {updateMenuState();menu.classList.remove("hidden");}
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space" && canJump && gameplayActive()&&!noClipMode) {
    velocity.y = PLAYER.jump;
    canJump = false;
  }
  if (event.code === "KeyR") reload();
  if (event.code === "KeyM" && !event.repeat) toggleMusic();
  if (event.code === "KeyG" && !event.repeat && ["admin", "owner"].includes(window.neonAuth?.user?.role)) setGodMode(!godMode);
  if (event.code === "KeyE" && !event.repeat) captureNearestEnemy();
  if ((event.code === "Digit1" || event.code === "Numpad1") && !event.repeat) setSquadMode("attack");
  if ((event.code === "Digit2" || event.code === "Numpad2") && !event.repeat) setSquadMode("protect");
  if (event.code === "KeyV" && !event.repeat) toggleMasterVolume();
  if (event.code === "Minus" || event.code === "NumpadSubtract") {initAudio();setMasterVolume(masterVolume-.05);}
  if (event.code === "Equal" || event.code === "NumpadAdd") {initAudio();setMasterVolume(masterVolume+.05);}
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {keys.clear();firingHeld=false;});
window.addEventListener("neon-auth-changed", (event) => {
  if (!["admin", "owner"].includes(event.detail?.role)&&(godMode||noClipMode||noReloadMode||godSpeedMode||oneHitMode||tamedGodMode))disableTestingModes();
});
window.addEventListener("mousedown", (event) => {
  if(event.button!==0||event.target.closest?.("#squad-panel")||!controls.isLocked)return;
  firingHeld=true;shoot();
});
window.addEventListener("mouseup",(event)=>{if(event.button===0)firingHeld=false;});

function updateMobileJoystick(event) {
  const rect = mobileJoystickEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxRadius = rect.width * .32;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance > maxRadius) {
    dx = dx / distance * maxRadius;
    dy = dy / distance * maxRadius;
  }
  mobileMove.x = dx / maxRadius;
  mobileMove.z = -dy / maxRadius;
  mobileJoystickThumbEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function releaseMobileJoystick(event) {
  if (event.pointerId !== joystickPointerId) return;
  joystickPointerId = null;
  mobileMove.x = 0;
  mobileMove.z = 0;
  mobileJoystickThumbEl.style.transform = "translate(-50%, -50%)";
}

mobileJoystickEl.addEventListener("pointerdown", (event) => {
  if (!mobilePlaying || joystickPointerId !== null) return;
  event.preventDefault();
  joystickPointerId = event.pointerId;
  mobileJoystickEl.setPointerCapture(event.pointerId);
  updateMobileJoystick(event);
});
mobileJoystickEl.addEventListener("pointermove", (event) => {
  if (event.pointerId === joystickPointerId) updateMobileJoystick(event);
});
mobileJoystickEl.addEventListener("pointerup", releaseMobileJoystick);
mobileJoystickEl.addEventListener("pointercancel", releaseMobileJoystick);

mobileLookZoneEl.addEventListener("pointerdown", (event) => {
  if (!mobilePlaying || lookPointerId !== null) return;
  event.preventDefault();
  lookPointerId = event.pointerId;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  mobileLookZoneEl.setPointerCapture(event.pointerId);
});
mobileLookZoneEl.addEventListener("pointermove", (event) => {
  if (event.pointerId !== lookPointerId) return;
  event.preventDefault();
  const dx = event.clientX - lastLookX;
  const dy = event.clientY - lastLookY;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  camera.rotation.y -= dx * .0042;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * .0036, -1.32, 1.32);
});
const releaseMobileLook = (event) => {
  if (event.pointerId === lookPointerId) lookPointerId = null;
};
mobileLookZoneEl.addEventListener("pointerup", releaseMobileLook);
mobileLookZoneEl.addEventListener("pointercancel", releaseMobileLook);

mobileFireEl.addEventListener("pointerdown", (event) => {
  if (!mobilePlaying) return;
  event.preventDefault();
  event.stopPropagation();
  firingHeld = true;
  mobileFireEl.classList.add("pressed");
  shoot();
});
const releaseMobileFire = (event) => {
  event.preventDefault();
  firingHeld = false;
  mobileFireEl.classList.remove("pressed");
};
mobileFireEl.addEventListener("pointerup", releaseMobileFire);
mobileFireEl.addEventListener("pointercancel", releaseMobileFire);
mobileFireEl.addEventListener("pointerleave", releaseMobileFire);
mobileReloadEl.addEventListener("pointerdown", (event) => { event.preventDefault(); reload(); });
mobileInteractEl.addEventListener("pointerdown", (event) => { event.preventDefault(); captureNearestEnemy(); });
mobileJumpEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (mobilePlaying && canJump) { velocity.y = PLAYER.jump; canJump = false; }
});
mobileAttackEl.addEventListener("pointerdown", (event) => { event.preventDefault(); setSquadMode("attack"); });
mobileProtectEl.addEventListener("pointerdown", (event) => { event.preventDefault(); setSquadMode("protect"); });
mobilePauseEl.addEventListener("pointerdown", (event) => { event.preventDefault(); leaveMobileGame(); });
mobileControlsEl.addEventListener("contextmenu", (event) => event.preventDefault());

if (isMobileDevice) {
  const reloadHint = ammoWarningEl.querySelector("span");
  if (reloadHint) reloadHint.textContent = "TAP RELOAD";
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderScale = Math.min(window.devicePixelRatio||1,GRAPHICS_PRESETS[activeGraphicsPreset].pixelRatio);
  renderer.setPixelRatio(renderScale);
  updateGraphicsReadout();
});

function reloadPhase(value,start,end){
  const progress=THREE.MathUtils.clamp((value-start)/(end-start),0,1);
  return progress*progress*(3-2*progress);
}

function updateReloadAnimation(){
  gunMagazine.position.set(0,-.16,-.015);gunMagazine.rotation.set(.08,0,0);gunMagazine.visible=true;
  chargingHandle.position.set(.13,.12,.04);
  reloadHand.visible=false;
  if(!reloading)return {drop:0,tilt:0};

  const progress=THREE.MathUtils.clamp((performance.now()-reloadStartedAt)/(RELOAD_DURATION*1000),0,1);
  const lower=progress<.86?reloadPhase(progress,0,.13):1-reloadPhase(progress,.86,1);
  let magazineOffset=0;
  if(progress>=.15&&progress<.36)magazineOffset=reloadPhase(progress,.15,.36);
  else if(progress>=.36&&progress<.52){magazineOffset=1;gunMagazine.visible=false;}
  else if(progress>=.52&&progress<.72)magazineOffset=1-reloadPhase(progress,.52,.72);
  gunMagazine.position.x=-.12*magazineOffset;
  gunMagazine.position.y=-.16-.27*magazineOffset;
  gunMagazine.position.z=-.015+.1*magazineOffset;
  gunMagazine.rotation.set(.08,0,.38*magazineOffset);

  // Reach from the lower-left, grip and remove the old cell.
  if(progress>=.035&&progress<.39){
    reloadHand.visible=true;
    const reach=reloadPhase(progress,.035,.14);
    const remove=reloadPhase(progress,.15,.36);
    reloadHand.position.set(
      THREE.MathUtils.lerp(-.48,.34,reach)-.08*remove,
      THREE.MathUtils.lerp(-.72,-.58,reach)-.27*remove,
      THREE.MathUtils.lerp(-.58,-.73,reach)+.09*remove
    );
    reloadHand.rotation.set(-.25+.2*reach,.12,-.5+.38*reach+.18*remove);
  // Bring a fresh magazine up from below and firmly seat it.
  }else if(progress>=.45&&progress<.75){
    reloadHand.visible=true;
    const enter=reloadPhase(progress,.45,.54);
    const insert=reloadPhase(progress,.52,.72);
    reloadHand.position.set(
      THREE.MathUtils.lerp(-.05,.25,enter)+.1*insert,
      THREE.MathUtils.lerp(-.84,-.82,enter)+.24*insert,
      THREE.MathUtils.lerp(-.6,-.64,enter)-.1*insert
    );
    reloadHand.rotation.set(-.2+.14*insert,.08,-.3+.2*insert);
  // Move to the upper receiver, pull the charging handle and release it.
  }else if(progress>=.72&&progress<.96){
    reloadHand.visible=true;
    const reachHandle=reloadPhase(progress,.72,.8);
    const rack=Math.sin(reloadPhase(progress,.79,.93)*Math.PI);
    reloadHand.position.set(
      THREE.MathUtils.lerp(.35,.57,reachHandle),
      THREE.MathUtils.lerp(-.58,-.32,reachHandle),
      THREE.MathUtils.lerp(-.74,-.69,reachHandle)+.16*rack
    );
    reloadHand.rotation.set(-.5*reachHandle,-.12,-.1-.25*reachHandle);
  }
  if(progress>=.73&&progress<.9){
    const charge=Math.sin(reloadPhase(progress,.73,.9)*Math.PI);
    chargingHandle.position.z=.04+.19*charge;
  }

  if(reloadSoundStage<2&&progress>=.2){reloadSoundStage=2;playReloadSound(1);statusEl.textContent="Reloading - magazine removed";}
  if(reloadSoundStage<3&&progress>=.55){reloadSoundStage=3;playReloadSound(2);statusEl.textContent="Reloading - new power magazine";}
  if(reloadSoundStage<4&&progress>=.75){reloadSoundStage=4;playReloadSound(3);statusEl.textContent="Reloading - charging pulse rifle";}
  if(progress>=1){
    ammo=MAGAZINE_CAPACITY;ammoEl.textContent=String(MAGAZINE_CAPACITY);reloading=false;
    gunMagazine.visible=true;reloadHand.visible=false;chargingHandle.position.set(.13,.12,.04);
    playReloadSound(4);statusEl.textContent="Weapon ready";
    return {drop:0,tilt:0};
  }
  return {drop:lower,tilt:lower};
}

function updateGunDisplay(){
  const state=`${ammo}:${reloading?1:0}`;
  if(state===gunDisplayState)return;
  gunDisplayState=state;
  const context=gunDisplayCanvas.getContext("2d");
  context.clearRect(0,0,gunDisplayCanvas.width,gunDisplayCanvas.height);
  context.fillStyle="rgba(2,12,18,.94)";context.fillRect(2,2,252,92);
  context.strokeStyle=ammo<=8?"#ff4057":"#43f4d0";context.lineWidth=5;context.strokeRect(4.5,4.5,247,87);
  context.fillStyle=ammo<=8?"#ff5268":"#84ffe6";context.font="900 45px monospace";context.textAlign="left";context.fillText(String(ammo).padStart(2,"0"),18,59);
  context.font="800 14px monospace";context.textAlign="right";context.fillText(reloading?"RECHARGE":"PULSE // READY",238,34);
  context.fillStyle="rgba(220,245,245,.55)";context.font="700 12px monospace";context.fillText("32 CELL MAG",238,60);
  for(let bar=0;bar<8;bar+=1){context.fillStyle=bar<Math.ceil(ammo/4)?(ammo<=8?"#ff4057":"#43f4d0"):"#183139";context.fillRect(112+bar*16,72,11,6);}
  gunDisplayTexture.needsUpdate=true;
}

function updateWeapon(delta, elapsed) {
  recoil = THREE.MathUtils.damp(recoil, 0, 15, delta);
  const moving = keys.has("KeyW") || keys.has("KeyA") || keys.has("KeyS") || keys.has("KeyD") || Math.abs(mobileMove.x) + Math.abs(mobileMove.z) > .08;
  const bob = moving && gameplayActive() ? Math.sin(elapsed * 10) : 0;
  const reloadMotion=updateReloadAnimation();
  gun.position.x = .48 + bob * .008 - reloadMotion.drop*.1;
  gun.position.y = -.4 + Math.abs(bob) * .012 + recoil * .045 - reloadMotion.drop*.055;
  gun.position.z = -.78 + recoil * .13 + reloadMotion.drop*.055;
  gun.rotation.x = recoil * .08 - reloadMotion.tilt*.055;
  gun.rotation.z = bob * .008 + reloadMotion.tilt*.17;
  updateGunDisplay();
  const energyPulse=.82+Math.sin(elapsed*7)*.14+recoil*.3;
  gunEnergyCoreMaterial.opacity=THREE.MathUtils.clamp(energyPulse,.55,1);
  gunAmmoCells.forEach((cell,index)=>{
    const active=index<Math.ceil(ammo/(MAGAZINE_CAPACITY/gunAmmoCells.length));
    cell.visible=active;cell.material.color.setHex(ammo<=8?0xff4057:0x43f4d0);
    cell.material.opacity=.72+Math.sin(elapsed*5+index)*.2;
  });
  gunVentMaterials.forEach((ventMaterial,index)=>{
    ventMaterial.color.setHex(reloading?0xff8b3d:ammo<=8?0xff4057:0x43f4d0);
    ventMaterial.opacity=.35+Math.sin(elapsed*(reloading?11:4)+index)*.22+recoil*.25;
  });
  gunReticle.scale.setScalar(1+recoil*.5+Math.sin(elapsed*3)*.04);
  gunReticleMaterial.opacity=reloading ? .35 : .72+Math.sin(elapsed*4)*.2;
  opticGlassMaterial.opacity=.13+Math.sin(elapsed*2.5)*.035;
  firingHand.position.y=-.34+Math.abs(bob)*.008+recoil*.025;
  firingHand.rotation.x=-.18+recoil*.035;
  if(carryRig.visible){
    carryRig.position.y=-.36+Math.abs(bob)*.012;
    carryRig.rotation.z=-.04+bob*.012;
    carryFieldRing.rotation.z+=delta*1.7;
    carryField.material.opacity=.12+Math.sin(elapsed*4)*.045;
  }
}

function adaptQuality(delta) {
  if(graphicsMode!=="auto"||!gameplayActive()){
    qualityTime=0;qualityFrames=0;qualityRecoverySamples=0;qualityLowSamples=0;
    return;
  }
  qualityTime += delta;
  qualityFrames += 1;
  if (qualityTime < 3) return;
  const fps = qualityFrames / qualityTime;
  const presetIndex=GRAPHICS_ORDER.indexOf(activeGraphicsPreset);
  if(fps<44){
    qualityLowSamples+=1;qualityRecoverySamples=0;
    if(qualityLowSamples>=2&&presetIndex>0)applyGraphicsPreset(GRAPHICS_ORDER[presetIndex-1]);
  }else if(fps>58){
    qualityRecoverySamples+=1;qualityLowSamples=0;
    if(qualityRecoverySamples>=4&&presetIndex<GRAPHICS_ORDER.length-1)applyGraphicsPreset(GRAPHICS_ORDER[presetIndex+1]);
  }else{qualityRecoverySamples=0;qualityLowSamples=0;}
  updateGraphicsReadout(fps);
  qualityTime = 0;
  qualityFrames = 0;
}

let performanceSampleFrames=0;
let displayedFps=0;
let pingRequestActive=false;
let performanceSampleStarted=performance.now();

function setPerformanceLevel(element,value,warnAt,dangerAt){
  if(!element)return;
  element.classList.toggle("performance-warning",value>=warnAt&&value<dangerAt);
  element.classList.toggle("performance-danger",value>=dangerAt);
}

function updateNetworkEstimate(){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const downlink=Number(connection?.downlink);
  if(Number.isFinite(downlink)&&downlink>0){
    const value=downlink>=10?downlink.toFixed(0):downlink.toFixed(1);
    if(performanceNetworkEl)performanceNetworkEl.textContent=value;
    if(settingsNetworkEl)settingsNetworkEl.textContent=value;
    if(performanceNetworkEl)performanceNetworkEl.parentElement.title=`${String(connection.effectiveType||"network").toUpperCase()} connection // browser estimate`;
  }else{
    if(performanceNetworkEl)performanceNetworkEl.textContent="N/A";
    if(settingsNetworkEl)settingsNetworkEl.textContent="N/A";
    if(performanceNetworkEl)performanceNetworkEl.parentElement.title="Bandwidth estimate unavailable in this browser";
  }
}

async function measureServerPing(){
  if(pingRequestActive||document.hidden||!performancePingEl)return;
  pingRequestActive=true;
  const started=performance.now();
  try{
    const pingUrl=new URL("./favicon.svg",window.location.href);
    pingUrl.searchParams.set("ping",String(Date.now()));
    const response=await fetch(pingUrl,{method:"HEAD",cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw new Error(`Ping failed: ${response.status}`);
    const ping=Math.max(1,Math.round(performance.now()-started));
    performancePingEl.textContent=String(ping);
    if(settingsPingEl)settingsPingEl.textContent=String(ping);
    setPerformanceLevel(performancePingEl,ping,100,200);
    setPerformanceLevel(settingsPingEl,ping,100,200);
  }catch{
    performancePingEl.textContent="OFF";
    if(settingsPingEl)settingsPingEl.textContent="OFF";
    performancePingEl.classList.remove("performance-warning");
    performancePingEl.classList.add("performance-danger");
    settingsPingEl?.classList.remove("performance-warning");
    settingsPingEl?.classList.add("performance-danger");
  }finally{pingRequestActive=false;}
}

function updatePerformanceMonitor(){
  performanceSampleFrames+=1;
  const sampleSeconds=(performance.now()-performanceSampleStarted)/1000;
  if(sampleSeconds<.5)return;
  const instantFps=performanceSampleFrames/sampleSeconds;
  displayedFps=displayedFps?displayedFps*.65+instantFps*.35:instantFps;
  if(performanceFpsEl){
    const roundedFps=Math.max(1,Math.round(displayedFps));
    performanceFpsEl.textContent=String(roundedFps);
    if(settingsFpsEl)settingsFpsEl.textContent=String(roundedFps);
    performanceFpsEl.classList.toggle("performance-warning",roundedFps<45&&roundedFps>=30);
    performanceFpsEl.classList.toggle("performance-danger",roundedFps<30);
    settingsFpsEl?.classList.toggle("performance-warning",roundedFps<45&&roundedFps>=30);
    settingsFpsEl?.classList.toggle("performance-danger",roundedFps<30);
  }
  performanceSampleFrames=0;
  performanceSampleStarted=performance.now();
}

updateNetworkEstimate();
const browserConnection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
browserConnection?.addEventListener?.("change",updateNetworkEstimate);
window.setTimeout(measureServerPing,700);
window.setInterval(measureServerPing,10000);

function updateWaveStatusHud(){
  if(currentWave===0){statusEl.textContent="PREPARE FOR WAVE 1";return;}
  if(missionComplete){statusEl.textContent="ALL 50 WAVES CLEARED";return;}
  if(gameOver){statusEl.textContent=`WAVE ${currentWave} FAILED`;return;}
  if(waveActive){
    if(currentWave===50)statusEl.textContent="FINAL WAVE // OUTPOST CORE ACTIVE";
    else if(performance.now()-waveStartedAt<2000)statusEl.textContent=`WAVE ${currentWave} // INCOMING`;
    else statusEl.textContent=`WAVE ${currentWave} // COMBAT ACTIVE`;
    return;
  }
  if(nextWaveAt>0){
    const seconds=Math.max(0,Math.ceil((nextWaveAt-performance.now())/1000));
    statusEl.textContent=currentWave>=MAX_WAVES
      ? `WAVE 50 CLEARED // MISSION COMPLETE IN ${seconds}S`
      : `WAVE ${currentWave} CLEARED // WAVE ${currentWave+1} IN ${seconds}S`;
    return;
  }
  statusEl.textContent=`WAVE ${currentWave} // STANDBY`;
}

function animate() {
  renderFrame+=1;
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  if (gameplayActive() && !missionComplete && !gameOver) {
    if(firingHeld)shoot();
    movePlayer(delta);
    updatePlayerRegeneration(delta,elapsed);
    updateSpawning(delta);
    updateEnemies(delta, elapsed);
    expireCapturableEnemies();
    updateProjectiles(delta);
    updateAbilityEffects(delta);
    updateNanoCells(delta,elapsed);
    updateSquadUI(elapsed);
    updateCapturePrompt();
  } else {updateOnlyEnemyDeaths(delta);updateNanoCells(delta,elapsed);}
  updateSpawnGates(delta,elapsed);
  updateTamingMachines(delta,elapsed);
  updateCarryTutorial(elapsed);
  updateWeapon(delta, elapsed);
  updatePlayerDeathAnimation();
  updateMobileWorldUI(elapsed);
  updateAmmoWarning();
  updateWaveStatusHud();
  adaptQuality(delta);
  updatePerformanceMonitor();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

import {defineEnemy} from "../define-enemy.js";

function buildModel(ctx){
  const {
    add,group,parts,box,sphere,cylinder,cone,diamond,capsule,torus,
    darkMaterial,redGlow,makeMaterial,THREE,elite,
  }=ctx;

  // E03 is an irradiated tunnel rat rather than a robotic rat-shaped block.
  // Matte, uneven skin keeps it organic while the lime organs remain visibly
  // emissive in the arena's darkest areas.
  const furMaterial=makeMaterial(elite?0x665226:0x243b30,.08,.03);
  const ridgeMaterial=makeMaterial(elite?0xb58d31:0x426f43,.2,.06);
  const muzzleMaterial=makeMaterial(elite?0x9e7c3b:0x476052,.08,.015);
  const pawMaterial=makeMaterial(elite?0x3e3421:0x17251f,.025,.04);
  const tailMaterial=makeMaterial(elite?0x8a6b32:0x355f49,.14,.025);
  const acidColor=elite?0xffd35c:0x96ff18;
  const acidGlow=new THREE.MeshBasicMaterial({color:acidColor});
  const softGlow=new THREE.MeshBasicMaterial({color:acidColor,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});
  const auraGlow=new THREE.MeshBasicMaterial({color:acidColor,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide});
  const rushEchoMaterial=new THREE.MeshBasicMaterial({color:acidColor,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide});
  const explosionHot=new THREE.MeshBasicMaterial({color:0xfff2a6,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const explosionFire=new THREE.MeshBasicMaterial({color:0xff8a16,transparent:true,opacity:.94,depthWrite:false,blending:THREE.AdditiveBlending});
  const explosionEmber=new THREE.MeshBasicMaterial({color:0xf13a12,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});
  const ruptureSmoke=new THREE.MeshBasicMaterial({color:0x20272a,transparent:true,opacity:.46,depthWrite:false});
  const glowParts=[],ears=[],whiskers=[],teeth=[],eyes=[];
  const addAcid=(geometry,scale,position,rotation=[0,0,0],name="body",soft=false)=>{
    const mesh=add(geometry,soft?softGlow:acidGlow,scale,position,rotation,name);
    parts.glows.push(mesh);glowParts.push(mesh);return mesh;
  };
  const segmentDirection=new THREE.Vector3(),segmentMidpoint=new THREE.Vector3(),segmentUp=new THREE.Vector3(0,1,0);
  const addSegment=(start,end,radius,material,name="body")=>{
    segmentDirection.set(end[0]-start[0],end[1]-start[1],end[2]-start[2]);
    const length=Math.max(.001,segmentDirection.length());
    segmentMidpoint.set((start[0]+end[0])*.5,(start[1]+end[1])*.5,(start[2]+end[2])*.5);
    const mesh=add(cylinder,material,[radius,length,radius],segmentMidpoint.toArray(),[0,0,0],name);
    mesh.quaternion.setFromUnitVectors(segmentUp,segmentDirection.multiplyScalar(1/length));
    mesh.userData.baseRotation.copy(mesh.rotation);
    return mesh;
  };

  // Low, long torso with separate haunches and shoulder mass gives a readable
  // rodent posture from the front, side, and gameplay camera angles.
  parts.body=add(sphere,furMaterial,[1.18,.52,.76],[0,.43,-.12]);
  const bodyAura=add(sphere,auraGlow,[1.28,.6,.84],[0,.43,-.12]);parts.glows.push(bodyAura);
  add(sphere,ridgeMaterial,[.68,.42,.56],[0,.44,.31]);
  for(const side of [-1,1]){
    add(sphere,furMaterial,[.38,.35,.41],[side*.4,.4,-.4]);
    add(sphere,pawMaterial,[.3,.1,.42],[side*.22,.18,-.08]);
  }

  // A luminous radiation gland sits flush beneath the dorsal tissue. Keeping
  // it embedded avoids the old floating-ring/propeller silhouette.
  const dorsalCore=addAcid(diamond,[.16,.055,.23],[0,.69,-.06]);
  const dorsalHalo=addAcid(sphere,[.28,.035,.34],[0,.67,-.06],[0,0,0],"body",true);
  for(let node=0;node<5;node+=1){
    const z=-.5+node*.22,centerDistance=Math.abs(node-2);
    addAcid(cone,[.09,.18-centerDistance*.018,.09],[0,.69-centerDistance*.012,z],[0,0,0],"body",node%2===1);
  }
  const sideStripeX=[.43,.51,.3];
  for(const side of [-1,1])for(let stripe=0;stripe<3;stripe+=1){
    addAcid(box,[.035,.06,.21],[side*sideStripeX[stripe],.46,-.35+stripe*.31],[.08,0,side*.2],"body",false);
  }

  // Tapered head, cheek mass, long muzzle, nose and incisors establish the rat
  // silhouette that the old spherical head was missing.
  parts.head=add(sphere,ridgeMaterial,[.43,.34,.46],[0,.5,.67],[.1,0,0],"head");
  const headAura=add(sphere,auraGlow,[.49,.4,.52],[0,.5,.67],[.1,0,0],"head");parts.glows.push(headAura);
  add(cone,muzzleMaterial,[.28,.42,.25],[0,.42,.96],[Math.PI/2,0,0],"head");
  const nose=add(sphere,darkMaterial,[.09,.065,.07],[0,.43,1.14],[0,0,0],"head");
  addAcid(sphere,[.032,.027,.02],[0,.445,1.175],[0,0,0],"head",true);
  const mouth=add(box,darkMaterial,[.16,.018,.025],[0,.355,1.065],[.08,0,0],"head");
  for(const side of [-1,1]){
    const tooth=add(box,muzzleMaterial,[.035,.065,.03],[side*.029,.34,1.095],[.08,0,side*.04],"head");
    tooth.userData.glowRatSide=side;teeth.push(tooth);
    add(sphere,muzzleMaterial,[.14,.14,.18],[side*.105,.42,.91],[0,0,0],"head");

    // Thin, rounded organic ears with the inner glow sunk into the tissue.
    for(const ear of [
      add(sphere,ridgeMaterial,[.14,.11,.1],[side*.145,.625,.61],[0,0,side*.12],"head"),
      add(sphere,ridgeMaterial,[.17,.19,.045],[side*.17,.67,.6],[0,0,side*.14],"head"),
      add(sphere,muzzleMaterial,[.11,.13,.047],[side*.17,.67,.624],[0,0,side*.14],"head"),
      addAcid(sphere,[.058,.078,.023],[side*.17,.67,.651],[0,0,side*.14],"head",true),
    ]){ear.userData.glowRatSide=side;ears.push(ear);}

    // Bright iris plus a dark forward pupil keeps its gaze readable.
    const socket=add(sphere,darkMaterial,[.105,.075,.045],[side*.155,.53,.79],[0,0,0],"head");
    const iris=add(sphere,redGlow,[.058,.048,.029],[side*.155,.53,.818],[0,0,0],"head");
    const eyeGlow=addAcid(box,[.075,.018,.012],[side*.155,.53,.838],[0,0,side*.08],"head",true);
    for(const eye of [socket,iris,eyeGlow]){eye.userData.glowRatSide=side;eyes.push(eye);}

    // Three whiskers per cheek, spread vertically and laterally.
    for(let whisker=0;whisker<3;whisker+=1){
      const y=.44+(whisker-1)*.052;
      const feeler=addSegment([side*.1,y,.955],[side*(.34+whisker*.04),y+(whisker-1)*.03,1.105+whisker*.024],.005,muzzleMaterial,"head");
      feeler.userData.glowRatSide=side;feeler.userData.glowRatRow=whisker;whiskers.push(feeler);
    }
  }

  // Four crouched limbs with long paws and paired claws. Only the upper limb
  // is registered as animated so the existing walk cycle remains compatible.
  const legPositions=[[-.45,.25,-.39],[.45,.25,-.39],[-.4,.24,.35],[.4,.24,.35]];
  legPositions.forEach(([x,y,z],index)=>{
    const side=Math.sign(x),front=z>0;
    const limbName=`glow-rat-leg-${index}`;
    const leg=add(capsule,furMaterial,[.28,.35,.27],[x,y-.02,z],[0,0,side*(front?.38:.48)],limbName);
    parts.legs.push(leg);
    add(sphere,ridgeMaterial,[.13,.11,.15],[x,y+.025,z],[0,0,0],limbName);
    add(sphere,pawMaterial,[.2,.065,.24],[x+side*.07,.075,z+(front?.15:.06)],[0,side*.08,0],limbName);
    for(const toe of [-1,0,1])add(cone,darkMaterial,[.018,.12,.018],[x+side*(.105+toe*.026),.073,z+(front?.29:.19)],[Math.PI/2,0,side*.08],limbName);
    leg.userData.glowRatLegIndex=index;
  });

  // A long articulated, tapered tail curves sideways and upward instead of
  // ending as the previous single straight cylinder.
  const tailPoints=[
    [0,.44,-.49],[.08,.43,-.76],[.2,.39,-1.04],[.38,.36,-1.32],
    [.58,.38,-1.69],[.75,.43,-1.9],[.86,.51,-2.09],[.91,.6,-2.25],
  ];
  const tailSegments=[];
  for(let index=0;index<tailPoints.length-1;index+=1){
    const segment=addSegment(tailPoints[index],tailPoints[index+1],Math.max(.028,.075-index*.006),index%3===2?acidGlow:tailMaterial);
    if(index%3===2){parts.glows.push(segment);glowParts.push(segment);}
    segment.userData.glowRatTailIndex=index;tailSegments.push(segment);
    if(index>0&&index%2===0)addAcid(sphere,[.075-index*.004,.075-index*.004,.075-index*.004],tailPoints[index],[0,0,0],"body",true);
  }
  addAcid(sphere,[.055,.055,.055],tailPoints.at(-1),[0,0,0],"body",true);

  // The shared animation system moves parts.body, parts.head and parts.legs.
  // Use section pivots so every decorative mesh follows those animated parts
  // instead of leaving eyes, whiskers or glow nodes behind in world space.
  const makeRig=(name,pivot,members)=>{
    const rig=new THREE.Group();rig.name=name;rig.position.set(...pivot);
    rig.userData.basePosition=rig.position.clone();rig.userData.baseRotation=rig.rotation.clone();rig.userData.baseScale=rig.scale.clone();
    group.add(rig);
    members.forEach((member)=>{
      member.position.sub(rig.position);rig.add(member);
      member.userData.basePosition.copy(member.position);
      member.userData.baseRotation.copy(member.rotation);
      member.userData.baseScale.copy(member.scale);
    });
    return rig;
  };
  const headMembers=group.children.filter((child)=>child.isMesh&&child.name==="head");
  const bodyMembers=group.children.filter((child)=>child.isMesh&&child.name==="body");
  parts.head=makeRig("glow-rat-head-rig",[0,.5,.67],headMembers);
  parts.body=makeRig("glow-rat-body-rig",[0,.43,-.12],bodyMembers);
  parts.legs=legPositions.map(([x,y,z],index)=>{
    const limbName=`glow-rat-leg-${index}`;
    const members=group.children.filter((child)=>child.isMesh&&child.name===limbName);
    return makeRig(`${limbName}-rig`,[x,y,z],members);
  });

  // The death rupture is built from sharp rays, tumbling radioactive chips,
  // swelling wisps and the rat's actual anatomy. It deliberately avoids using
  // a single flat ring so the blast still reads from every camera angle.
  const explosionOrigin=new THREE.Vector3(0,.46,.05);
  const explosionShards=[],explosionFragments=[],explosionFireballs=[],explosionWisps=[];
  const explosionUp=new THREE.Vector3(0,1,0);
  for(let index=0;index<14;index+=1){
    const angle=index*Math.PI*2/14+(index%2)*.19;
    const direction=new THREE.Vector3(Math.cos(angle),-.28+(index%5)*.18,Math.sin(angle)).normalize();
    const shardMaterial=index%4===0?explosionHot:index%3===0?explosionEmber:explosionFire;
    const shard=add(cone,shardMaterial,[.025,.21+(index%4)*.04,.025],explosionOrigin.toArray(),[0,0,0],"glow-rat-explosion-fx");
    shard.quaternion.setFromUnitVectors(explosionUp,direction);
    shard.userData.baseRotation.copy(shard.rotation);
    shard.userData.glowRatExplosionDirection=direction;
    shard.userData.glowRatExplosionSpeed=1.35+(index%4)*.2;
    shard.visible=false;explosionShards.push(shard);
  }
  for(let index=0;index<16;index+=1){
    const angle=index*2.399963+(index%3)*.11;
    const direction=new THREE.Vector3(Math.cos(angle),-.14+(index%6)*.17,Math.sin(angle)).normalize();
    const fragmentMaterial=index%5===0?ridgeMaterial:index%3===0?explosionEmber:explosionFire;
    const fragment=add(index%3===0?cone:diamond,fragmentMaterial,[.035+(index%3)*.012,.045+(index%4)*.014,.035+(index%2)*.012],explosionOrigin.toArray(),[index*.31,index*.47,index*.23],"glow-rat-explosion-fx");
    fragment.userData.glowRatExplosionDirection=direction;
    fragment.userData.glowRatExplosionSpeed=.85+(index%5)*.19;
    fragment.visible=false;explosionFragments.push(fragment);
  }
  // Overlapping low-poly fire lobes form an irregular, rolling fireball. Each
  // lobe expands on a slightly different route so it never resembles one orb.
  for(let index=0;index<12;index+=1){
    const angle=index*2.399963+.31;
    const direction=new THREE.Vector3(Math.cos(angle),-.1+(index%5)*.17,Math.sin(angle)).normalize();
    const fireball=add(sphere,index%4===0?explosionHot:index%3===0?explosionEmber:explosionFire,[.12+(index%4)*.025,.1+(index%3)*.026,.12+(index%5)*.018],explosionOrigin.toArray(),[index*.17,index*.29,index*.13],"glow-rat-explosion-fx");
    fireball.userData.glowRatExplosionDirection=direction;
    fireball.userData.glowRatExplosionSpeed=.18+(index%5)*.045;
    fireball.userData.glowRatExplosionPhase=index*.71;
    fireball.visible=false;explosionFireballs.push(fireball);
  }
  for(let index=0;index<7;index+=1){
    const angle=index*Math.PI*2/7+.27;
    const direction=new THREE.Vector3(Math.cos(angle)*.72,.18+(index%3)*.18,Math.sin(angle)*.72).normalize();
    const wisp=add(sphere,ruptureSmoke,[.16+(index%3)*.035,.12+(index%2)*.035,.16+(index%4)*.025],explosionOrigin.toArray(),[0,0,0],"glow-rat-explosion-fx");
    wisp.userData.glowRatExplosionDirection=direction;
    wisp.userData.glowRatExplosionSpeed=.38+(index%4)*.1;
    wisp.visible=false;explosionWisps.push(wisp);
  }
  const explosionCore=add(sphere,explosionHot,[.28,.24,.28],explosionOrigin.toArray(),[0,0,0],"glow-rat-explosion-fx");
  explosionCore.visible=false;

  // Radiation Rush owns a lightweight set of reusable meshes. Nothing is
  // allocated while the game is running, avoiding a garbage-collection hitch
  // when multiple rats activate together.
  const rushMotes=[],rushStreaks=[],rushRings=[],rushEchoes=[];
  for(let index=0;index<10;index+=1){
    const mote=add(diamond,index%3===0?softGlow:acidGlow,[.025,.025,.025],[0,.48,.05],[0,0,0],"glow-rat-rush-fx");
    mote.userData.glowRatRushPhase=index/10;
    mote.visible=false;rushMotes.push(mote);
  }
  for(let index=0;index<8;index+=1){
    const side=index%2===0?-1:1,row=Math.floor(index/2);
    const streak=add(box,index%3===0?softGlow:acidGlow,[.018,.012,.22+row*.055],[side*(.12+row*.045),.25+row*.09,-.45-row*.18],[0,0,side*.08],"glow-rat-rush-fx");
    streak.userData.glowRatRushSide=side;streak.userData.glowRatRushRow=row;
    streak.visible=false;rushStreaks.push(streak);
  }
  for(let index=0;index<3;index+=1){
    const ring=add(torus,softGlow,[.62+index*.14,.62+index*.14,.62+index*.14],[0,.28,-.15],[Math.PI/2,0,0],"glow-rat-rush-fx");
    ring.userData.glowRatRushPhase=index/3;ring.visible=false;rushRings.push(ring);
  }
  for(let index=0;index<3;index+=1){
    const echo=add(sphere,rushEchoMaterial.clone(),[1.05,.45,.66],[0,.43,-.35-index*.34],[0,0,0],"glow-rat-rush-fx");
    echo.userData.glowRatRushPhase=index/3;echo.visible=false;rushEchoes.push(echo);
  }
  for(const effect of [
    explosionCore,...explosionShards,...explosionFragments,...explosionFireballs,...explosionWisps,
    ...rushMotes,...rushStreaks,...rushRings,...rushEchoes,
  ])effect.userData.enemyVisualFx=true;

  group.updateMatrixWorld(true);
  const excludedExplosionMeshes=new Set([
    bodyAura,headAura,explosionCore,...explosionShards,...explosionFragments,...explosionFireballs,...explosionWisps,
    ...rushMotes,...rushStreaks,...rushRings,...rushEchoes,
  ]);
  const explosionPieces=[],pieceWorldPosition=new THREE.Vector3();
  group.traverse((piece)=>{
    if(!piece.isMesh||excludedExplosionMeshes.has(piece))return;
    piece.getWorldPosition(pieceWorldPosition);
    const index=explosionPieces.length,angle=index*2.399963+(index%5)*.07;
    const direction=pieceWorldPosition.clone().sub(explosionOrigin);
    direction.x+=Math.cos(angle)*.28;
    direction.y+=.1+(index%7)*.035;
    direction.z+=Math.sin(angle)*.28;
    if(direction.lengthSq()<.001)direction.set(Math.cos(angle),.35,Math.sin(angle));
    piece.userData.glowRatExplosionDirection=direction.normalize();
    piece.userData.glowRatExplosionSpeed=.45+(index%9)*.055;
    piece.userData.glowRatExplosionSpin=new THREE.Vector3(.8+(index%5)*.31,1.1+(index%7)*.27,.65+(index%6)*.33);
    explosionPieces.push(piece);
  });

  parts.glowRat={
    dorsalCore,dorsalHalo,glowParts,tailSegments,ears,whiskers,teeth,eyes,nose,mouth,
    bodyAura,headAura,explosionOrigin,explosionPieces,explosionShards,explosionFragments,
    explosionFireballs,explosionWisps,explosionCore,rushMotes,rushStreaks,rushRings,rushEchoes,
  };
}

function signature({level,base,tone}){
  tone(base*2.2,.09,level,"triangle",1.75);
  tone(base*3.1,.045,level*.55,"sine",.8,.055);
}

const ruptureBass={filterType:"lowpass",filterFrequency:220,q:1.1,attack:.002};
const ruptureBody={filterType:"lowpass",filterFrequency:560,q:.72,attack:.001};
const ruptureCrack={filterType:"highpass",filterFrequency:1850,q:.8,attack:.001};
function deathExplosion(volume,{tone,noise}){
  // Noise carries the impact while two rapidly dropping sub layers provide
  // pressure. Short filtered bursts trail behind as fragments hit the floor.
  noise(.065,volume*1.7,0,ruptureCrack);
  noise(.78,volume*1.42,0,ruptureBody);
  noise(.42,volume*.88,.012,{filterType:"bandpass",filterFrequency:920,q:.85,attack:.001});
  tone(48,.86,volume*1.38,"sawtooth",.16,0,ruptureBass);
  tone(82,.48,volume*.72,"triangle",.24,.008,ruptureBass);
  [[.12,.085,.52,780],[.21,.07,.42,620],[.34,.06,.34,510],[.5,.05,.27,430]].forEach(([delay,duration,gain,frequency])=>{
    noise(duration,volume*gain,delay,{filterType:"bandpass",filterFrequency:frequency,q:1.35,attack:.001});
  });
}

function radiationRushSound(volume,{tone,noise}){
  const charge={filterType:"bandpass",filterFrequency:980,q:1.6,attack:.006,vibratoRate:18,vibratoDepth:13};
  tone(118,.62,volume*.74,"sawtooth",3.6,0,charge);
  tone(410,.48,volume*.5,"triangle",1.8,.08,{...charge,filterFrequency:1750});
  noise(.34,volume*.4,.04,{filterType:"highpass",filterFrequency:1350,q:.8,attack:.01});
  tone(72,.28,volume*1.05,"sawtooth",.32,.43,{filterType:"lowpass",filterFrequency:360,q:1.2,attack:.002});
  noise(.21,volume*.92,.43,{filterType:"bandpass",filterFrequency:720,q:.75,attack:.001});
  [0,.055,.11,.17].forEach((offset,index)=>tone(680+index*210,.045,volume*(.48-index*.055),"square",.38,.48+offset,{filterType:"highpass",filterFrequency:1500,q:1.1,attack:.001}));
}

export default defineEnemy({
  id:3,name:"Glow Rat",slug:"glow-rat",
  stats:{health:35,damage:8,speed:4.3,range:1.2,cooldown:1.4,color:0x82d957,scale:0.6,style:"skirmisher"},
  model:{build:buildModel,builder:"glow-rat",flying:false,surface:"organic",hazardArmor:false},
  sound:{base:330,wave:"triangle",attack:1.35,recipe:"squeak",signature,events:{death:deathExplosion,explosion:deathExplosion,skill:radiationRushSound}},
  animations:{idleDuration:3,locomotion:"walk",locomotionDuration:2.4,attackDuration:3.2,skillDuration:2.6,skillMotion:"radiationRush",stunnedDuration:2.2,deathDuration:2.4},
  skill:{name:"Radiation Rush",handler:"glowRatRush",cooldown:9,color:0xb7ff4a,targetDistance:0,projectile:false,indicator:{type:"buff",radius:4,anchor:"self"}},
});

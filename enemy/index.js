import enemy1 from "./enemies/scrap-crawler.js";
import enemy2 from "./enemies/broken-drone.js";
import enemy3 from "./enemies/glow-rat.js";
import enemy4 from "./enemies/patrol-bot.js";
import enemy5 from "./enemies/rust-guard.js";
import enemy6 from "./enemies/pulse-drone.js";
import enemy7 from "./enemies/shock-spider.js";
import enemy8 from "./enemies/riot-unit.js";
import enemy9 from "./enemies/toxic-walker.js";
import enemy10 from "./enemies/outpost-sniper.js";
import enemy11 from "./enemies/cloaked-hunter.js";
import enemy12 from "./enemies/repair-engineer.js";
import enemy13 from "./enemies/flame-trooper.js";
import enemy14 from "./enemies/phantom-drone.js";
import enemy15 from "./enemies/heavy-enforcer.js";
import enemy16 from "./enemies/plasma-witch.js";
import enemy17 from "./enemies/siege-walker.js";
import enemy18 from "./enemies/void-assassin.js";
import enemy19 from "./enemies/titan-guardian.js";
import enemy20 from "./enemies/the-outpost-core.js";
import {createModelContext,finishModel} from "./model-utils.js";
import {playEnemyAudio} from "./audio-utils.js";

export {
  setEnemyModelAnisotropy,alignCrawlerSegment,
  unitBoxGeometry,unitSphereGeometry,unitCylinderGeometry,unitConeGeometry,
  unitTorusGeometry,unitCapsuleGeometry,unitDiamondGeometry,
  crawlerAnimatedHip,crawlerAnimatedKnee,crawlerAnimatedAnkle,
} from "./model-utils.js";

export const ENEMY_DEFINITIONS=Object.freeze([null,enemy1,enemy2,enemy3,enemy4,enemy5,enemy6,enemy7,enemy8,enemy9,enemy10,enemy11,enemy12,enemy13,enemy14,enemy15,enemy16,enemy17,enemy18,enemy19,enemy20]);
export const ENEMY_TYPES=Object.freeze(ENEMY_DEFINITIONS.map((definition)=>definition?Object.freeze({name:definition.name,...definition.stats}):null));
export const ENEMY_SOUND_PROFILES=Object.freeze(ENEMY_DEFINITIONS.map((definition)=>definition?.sound||null));

export function getEnemyDefinition(typeId){
  const definition=ENEMY_DEFINITIONS[typeId];
  if(!definition)throw new RangeError("Unknown enemy type: "+typeId);
  return definition;
}

export function buildEnemyModel(typeId,type=ENEMY_TYPES[typeId],elite=false){
  const definition=getEnemyDefinition(typeId),context=createModelContext(definition,elite);
  definition.model.build(context,type,elite);
  return finishModel(context);
}

export function emitEnemySoundRecipe(typeId,event,volume,output){
  playEnemyAudio(getEnemyDefinition(typeId),event,volume,output);
}

export function emitScrapBurrowRecipe(phase,volume,output){
  const burrow=getEnemyDefinition(1).sound.burrow;
  if(burrow)burrow(phase,volume,output);
}

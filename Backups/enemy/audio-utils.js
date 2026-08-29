export function playEnemyAudio(definition,event,volume,output){
  const {base,wave}=definition.sound,{tone}=output;
  const eventRecipe=definition.sound.events?.[event];
  if(eventRecipe){eventRecipe(volume,output);return;}
  if(event==="step"){tone(Math.max(32,base*.35),.065,volume*.68,"triangle",.72);return;}
  if(event==="move"){tone(base*.52,.12,volume*.4,wave,1.08);if(definition.model.flying)tone(base*1.04,.09,volume*.24,"sine",.94,.035);return;}
  if(event==="hurt"){tone(base*.82,.075,volume*.8,"sawtooth",.58);return;}
  const attack=event==="attack",death=event==="death",idle=event==="idle";
  const level=volume*(death?1.45:attack?1.15:idle?.48:.8);
  definition.sound.signature({event,attack,death,idle,level,base,wave,...output});
}

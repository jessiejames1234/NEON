export function defineEnemy(definition){
  const required=["id","name","slug","stats","model","sound","animations","skill"];
  for(const key of required)if(definition[key]===undefined)throw new Error("Enemy definition missing "+key);
  return Object.freeze({
    ...definition,
    stats:Object.freeze({...definition.stats}),
    model:Object.freeze({...definition.model}),
    sound:Object.freeze({...definition.sound}),
    animations:Object.freeze({...definition.animations}),
    skill:Object.freeze({...definition.skill}),
  });
}


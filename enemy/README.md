# Enemy modules

Every enemy has one definition file inside `enemy/enemies/`. Both `index.html` (through `game.js`) and `flex.html` (through `flex.js`) load the same registry from `enemy/index.js`.

Each definition owns these editable sections and implementations:

- `stats`: health, damage, speed, range, normal attack cooldown, color, scale and combat style.
- `model`: flying state, armor surface and its complete `buildModel()` implementation.
- `sound`: base frequency, waveform and its own signature sound function. Scrap Crawler also owns its Burrow sound sequence.
- `animations`: idle, locomotion, attack, skill, stunned and death timing plus signature motion.
- `skill`: display name, combat handler, cooldown, color, showroom target distance and projectile behavior.

Ability visuals are configured with `skill.indicator`. Gameplay and the showroom both use that definition with `ability-visuals.js`: damage and debuff areas are red, buffs are blue, and healing or repair effects are green. Skills without a gameplay indicator omit this property and show no unrelated marker.

Only neutral runtime helpers remain shared: `model-utils.js` supplies reusable geometry, materials and construction context, `audio-utils.js` routes common step, movement and hurt events, `animation-runtime.js` applies the same idle/walk/attack/stunned/death poses, `skill-presentation.js` applies signature motion and phase timing, and `ability-visuals.js` creates the same disks, warning zones, orbs and beams. Gameplay provides real AI, targeting and damage while the showroom provides a harmless preview target; both render from the same enemy definition and presentation functions.

| ID | Definition file |
|---:|---|
| 1 | `enemies/scrap-crawler.js` |
| 2 | `enemies/broken-drone.js` |
| 3 | `enemies/glow-rat.js` |
| 4 | `enemies/patrol-bot.js` |
| 5 | `enemies/rust-guard.js` |
| 6 | `enemies/pulse-drone.js` |
| 7 | `enemies/shock-spider.js` |
| 8 | `enemies/riot-unit.js` |
| 9 | `enemies/toxic-walker.js` |
| 10 | `enemies/outpost-sniper.js` |
| 11 | `enemies/cloaked-hunter.js` |
| 12 | `enemies/repair-engineer.js` |
| 13 | `enemies/flame-trooper.js` |
| 14 | `enemies/phantom-drone.js` |
| 15 | `enemies/heavy-enforcer.js` |
| 16 | `enemies/plasma-witch.js` |
| 17 | `enemies/siege-walker.js` |
| 18 | `enemies/void-assassin.js` |
| 19 | `enemies/titan-guardian.js` |
| 20 | `enemies/the-outpost-core.js` |

When adding another enemy, create its definition in `enemy/enemies/`, then import it in `enemy/index.js`.

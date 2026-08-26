# Neon Outpost: 50 Wave Survival

## Main and pause menu

- The menu uses a responsive two-column command layout: mission identity, Enter/Resume, Restart, and run information are grouped on the left; controls, audio, and testing tools are grouped on the right. Narrow screens stack the two sections vertically.
- After a run begins, **Enter the Outpost** changes to **Resume Wave X** and a **Restart From Wave 1** button appears. Restart clears the current run, enemies, pending spawns, carried robots, machine processing, and active effects before beginning wave 1 again.

## Hostile visibility tracking

- A directly visible hostile keeps all of its original model colors and displays a pulsing red **HOSTILE** arrow above its body.
- A hostile blocked by arena geometry receives a pulsing full-body red silhouette visible through the obstruction. The tracking effect does not overwrite or permanently alter enemy materials.
- Tracking indicators switch off for dying, capturable, carried, tamed, or intentionally underground enemies.

## Mobile controls

- Mobile play uses a left-side virtual joystick for movement and right-side dragging for first-person aiming.
- Hold **FIRE** for automatic shooting. Dedicated **RELOAD**, **USE**, **JUMP**, **ATTACK**, **PROTECT**, and pause buttons remain available during combat.
- Phones and tablets use a landscape-only combat layout. Portrait orientation displays a rotate-device prompt.
- Desktop keyboard, mouse, and pointer-lock controls remain unchanged.

### Robot recovery guidance

- The first robot picked up in a run displays a green dashed route to the nearest available taming machine and a red dashed route to the demolition chute.
- Taming machines show **Press E - Install Robot / Tames After 5 Seconds** while carrying. The chute shows **Press E - Demolish Robot / Permanently Destroys Unit**. Mobile labels use **Tap USE** instead.
- The demolition destination is an industrial dismantling station with an armored intake hopper, counter-rotating crusher drums, hydraulic teeth, pistons, hazard markings, exhaust stacks, a control terminal, and alternating warning beacons. Demolished robots remain visibly present during a complete sequence: the rollers pull the model inside, hydraulic jaws compress and shake it, sparks and smoke burst from the chamber, and staged machinery sounds follow each impact. The station remains busy until the 2.25-second cycle finishes.
- Recoverable-robot labels are half-sized. Nearby robots show the pickup label, while robots slightly farther away display an animated gold recovery arrow.

A single-player browser FPS built with HTML, CSS, JavaScript, Web Audio, and Three.js.

## Run locally

1. Start Apache in XAMPP.
2. Open `http://localhost/3D%20game/`.
3. Click **Enter the Outpost** to capture the mouse and start wave 1.

An internet connection is currently required for Three.js and the Google Fonts interface font loaded from their CDNs.

## Controls

- `WASD`: move
- `Mouse`: look
- Hold `Left click`: automatic fire; release to stop
- `E`: pick up a nearby recoverable enemy, then place it in a highlighted machine or demolition chute
- `1`: set captured squad to Attack mode
- `2`: set captured squad to Protect mode
- `Space`: jump
- `Shift`: sprint
- `R`: reload
- `M`: toggle procedural music
- `V`: toggle all game audio on or off
- `-` / `+`: lower or raise overall volume by 5%
- `G`: toggle God Mode
- `Escape`: pause and release the mouse

## Testing console

Press `Escape` to open the pause menu and use the testing console.

- **God Mode** can be turned on or off from the menu or with `G`. While enabled, player health is restored to 100 and all incoming damage is blocked.
- **Wave Level** contains waves 1 through 50. Choose a wave and press **Change Wave Level** to remove all current enemies, enemy projectiles, queued spawns, and next-wave timers, then immediately start the selected wave.
- Changing the wave also restores health and ammunition so each test begins from a clean combat state.

## Combat

- The player starts with 100 health and a 32-round automatic pulse rifle.
- The first-person pulse rifle uses a layered armored receiver, rear power housing, exposed animated energy chamber, focusing coils, reinforced barrel shroud, split muzzle brake, holographic optic, illuminated cooling vents, detailed magazine, firing glove, and an updating rear digital ammunition display. Side power cells visibly drain and turn red at critical ammunition.
- Reloading uses a staged first-person animation: the rifle stays visible and rotates inward while a separate support arm reaches into view, removes the old power magazine, inserts a replacement, and cycles the charging handle. Mechanical release, removal, insertion, charging, and ready sounds are synchronized with the sequence.
- A **500-point Nano Shield** protects suit integrity first. Incoming damage drains the shield before it can damage the player's primary health; damage that exceeds the remaining shield carries through to suit integrity.
- The Nano Shield never auto-repairs. Every defeated hostile has a **20% chance** to drop a floating blue Nano Cell. Walking over a Nano Cell while the shield is damaged restores **75 shield points**, equal to 15% of its maximum capacity.
- Nano Shield condition is blue above 250, yellow from 250 through 101 with a small shake and `!`, and red at 100 or below with a stronger shake and `!!`. Entering either danger tier plays its own warning tone.
- Damage that passes through the Nano Shield triggers a separate suit-integrity hurt sound, red visor flash and health-panel impact shake. Reaching zero integrity plays a suit shutdown sound and a first-person collapse animation before showing the failure screen.
- The helmet HUD displays the Nano Shield in a blue pentagonal gauge. Shield hits briefly flash an interconnected **50-cell blue pentagon lattice curved and stretched around the visor perimeter**; the cells follow the helmet's elliptical POV, fade inward and leave a large, completely unobstructed center for aiming. Damage that reaches primary health retains the red hurt effect.
- Body shots deal 25 damage and headshots deal 50 damage.
- Riot Unit shields reduce non-headshot damage.
- Enemy projectiles can be dodged or blocked by arena cover.
- Every fifth completed wave restores 30 health and refills the rifle.
- If health reaches zero, the run ends and can be restarted from wave 1.
- Player damage triggers a severity-scaled hurt/grunt sound, filtered breath noise, and a red edge-impact flash.

## Enemy capture and companion squad

- Every hostile rolls once when reduced to zero health: **75% permanent death** or **25% stunned and capturable**.
- Pressing `E` near an eligible enemy picks it up instead of taming it immediately. The robot remains visible in the player's free hand while being transported.
- The free hand can hold exactly one robot. Another recoverable unit cannot be picked up until the held robot is deposited into an empty machine or destroyed in the demolition chute.
- A capturable enemy lies stunned with a visible animated marker instead of playing its death animation. It remains available for 60 seconds of active gameplay, then permanently shuts down if ignored.
- Recoverable enemies display a world-space **PRESS E TO PICK UP** label directing the player to the Auxiliary Platform.
- Five numbered glass taming machines on the Auxiliary Platform are the five permanent squad slots. Empty chambers glow green while carrying a robot; the red demolition chute is highlighted as the discard destination.
- Press `E` near an empty highlighted chamber to deposit the carried robot. It remains visible behind the glass during the five-second process, then deploys automatically as a full-health companion. Its complete 3D model remains displayed inside the linked glass machine until the player clicks that machine's physical red `×`.
- Machine 1 owns companion slot 1 through Machine 5 and slot 5. An occupied machine cannot process another robot until its linked companion is removed.
- The player can keep up to five captured enemies. Each companion appears in the squad panel with its machine number, illustrated silhouette, live health bar and current state. Squad cards no longer contain removal buttons.
- Aim at an occupied machine's physical red `×` and click to permanently remove only that machine's linked companion and free the slot.
- Press `E` near the highlighted demolition chute to permanently destroy the robot currently carried in the free hand.
- Squad behavior remains keyboard controlled: press `1` for Attack or `2` for Protect.
- Captured enemies always keep a blue team tint. When cover hides them, a full-body animated blue silhouette, rotating ring and orbiting particles render through the obstruction; the extra highlight switches off when they are directly visible.
- Every companion signature ability, warning zone, impact and projectile tracer uses team blue instead of its former hostile class color.
- Capture and recovery share an ascending mechanical synchronization/repair sound. Robotic voice alerts announce when a companion is downed and when repairs return it to battle.
- Player auto-repair starts after two seconds without taking damage and continuously restores two health per second until reaching full health. Any new hit immediately interrupts repair and restarts the two-second delay.
- Companions cannot die permanently. At zero health they become downed for twenty seconds; their health visibly rebuilds from 0% to 100% throughout the repair timer, then they resume fighting at full health.
- Captured companions retain and use their original class signature abilities. Ability hazards, telegraphs, teleports and projectiles target the hostile they are fighting.
- Hostile signature abilities respect combat aggro. When a companion has drawn an enemy's attention, that enemy aims its ability at the companion instead of automatically targeting the player.
- The final wave includes a thirty-second recovery window before the victory screen, allowing time to pick up and process an eligible final-wave robot.

| Squad mode | Behavior |
|---|---|
| `1` **Attack** | Companions hunt the nearest hostile anywhere in the arena. When no hostile remains, they return to formation behind the player. |
| `2` **Protect** | Companions remain near the player, engage enemies detected within ten units, and return when a target leaves their protection range. |

## Enemy intelligence and presentation

- Enemies share a lightweight grid flow-field that is rebuilt around the player's current position twice per second.
- The navigation grid expands arena cover into blocked cells, allowing enemies to choose routes around walls, crates, towers, and structures instead of pushing directly into them.
- Enemies convert the navigation field into stable corner waypoints and follow one waypoint at a time, avoiding frame-to-frame grid direction changes.
- Navigation velocity and turning are smoothed so route changes do not produce snapping or zigzag motion.
- Ranged enemies test line of sight and navigate around blocked shots, while melee enemies follow the same stable routes into attack range.
- Enemies continuously face the player. They move straight toward the player when unobstructed and switch to navigation waypoints only while cover blocks the direct route.
- Every class has a layered name-specific procedural 3D model built from shared beveled armor, capsule, diamond, cylinder, cone, sphere and torus geometry. Rounded armor edges replace the previous sharp box-heavy appearance without loading external model files.
- Humanoid enemies have layered torsos, necks, helmets, jaw guards, articulated-looking shoulder/hip joints, forearm armor, shin plates, boots, pouches, chest plates and readable glowing faces.
- Creatures, drones, casters and bosses receive a second high-detail identity layer with claws, fangs, compound eyes, rotor housings, armored shells, energy crystals, tank fittings, weapon muzzles, rocket tips, cockpit visors, fins and core spines.
- Emissive model parts pulse independently and react more strongly during attacks, making enemy faces, weapons and power sources readable while moving through the dark arena.
- Class silhouettes include crawler jaws and scrap plating, damaged drone fins, rat whiskers, drone emitters, eight spider legs, framed shields, toxin plumbing, scoped rifles, repair packs, flame tanks and hoses, orbiting phantom crystals, a minigun drum, witch staff, rocket ports, assassin mask, Titan armor and the Core's orbital cage.
- Enemy bodies use generated 128px surface materials instead of flat colors. Mechanical classes receive panel seams, scratches, wear, hazard strips and class markings; organic/caster classes receive veins and mottled surface variation.
- Ground enemies animate their legs and arms while moving. Flying enemies bob, rotate their rings or spin their rotors.
- Every enemy class has a visible attack action. Creatures lunge with their body and head, humanoids gesture and recoil their weapons, shields slam forward, flying units kick upward, and caster/boss rings accelerate during attacks.
- Dead enemies fall, spin when airborne, fade, and collapse before their resources are removed.
- All 20 classes have genuinely separate sound recipes rather than one effect at different pitches. Every completed enemy attack triggers its class recipe. Moving ground units produce footsteps, flying units produce recurring movement tones, and all active enemies emit periodic class-specific idle sounds. Spawn, hurt and death cues are also distance-adjusted and stereo-positioned with Web Audio.

## Enemy roster

| ID | Enemy | Base HP | Damage | Main ability |
|---:|---|---:|---:|---|
| E1 | Scrap Crawler | 55 | 5 | Fast close-range bite |
| E2 | Broken Drone | 30 | 6 | Floating ranged fire |
| E3 | Glow Rat | 35 | 8 | Rushes in and retreats |
| E4 | Patrol Bot | 50 | 8 | Mid-range energy shots |
| E5 | Rust Guard | 65 | 10 | Close-range pursuit |
| E6 | Pulse Drone | 60 | 12 | Rapid pulse bursts |
| E7 | Shock Spider | 75 | 10 | Leap attack that slows movement |
| E8 | Riot Unit | 110 | 12 | Frontal damage-reducing shield |
| E9 | Toxic Walker | 120 | 8 | Repeated toxic damage at short range |
| E10 | Outpost Sniper | 80 | 25 | Slow, high-speed sniper projectile |
| E11 | Cloaked Hunter | 130 | 18 | Pulsing camouflage and melee pursuit |
| E12 | Repair Engineer | 150 | 10 | Heals nearby enemies every five seconds |
| E13 | Flame Trooper | 180 | 15 | Short-range attack with burn damage |
| E14 | Phantom Drone | 160 | 20 | Teleports and fires from range |
| E15 | Heavy Enforcer | 300 | 22 | Rapid heavy weapon fire |
| E16 | Plasma Witch | 260 | 28 | Homing plasma projectiles |
| E17 | Siege Walker | 450 | 35 | Slow, powerful rocket projectiles |
| E18 | Void Assassin | 350 | 40 | Fast pursuit and combat teleport |
| E19 | Titan Guardian | 700 | 45 | Heavy armor and ranged attacks |
| E20 | The Outpost Core | 1200 | 60 | Homing attacks that accelerate through three health phases |

## Signature abilities and counterplay

Every enemy has a cooldown-driven signature ability with its own visual effect and sound cue. Red or class-colored floor markers warn about delayed attacks. Glowing deployed devices can be destroyed with the pulse rifle.

| ID | Enemy | Signature ability | What it does | Counterplay |
|---:|---|---|---|---|
| E1 | Scrap Crawler | Scrap Burrow | Spends one second digging down, travels underground toward the player for two seconds, then spends one second climbing out inside a small warning circle | Track the underground scrape and leave the small orange emergence circle |
| E2 | Broken Drone | Malfunction Barrage | Fires four erratic rapid shots, then crashes and stops moving briefly | Use cover during the burst, then attack while it is stunned |
| E3 | Glow Rat | Radiation Pack | Boosts nearby Glow Rats and becomes explosive when killed | Separate the pack and avoid the death blast |
| E4 | Patrol Bot | Scanning Lock | Marks the player's position before an accurate high-damage strike | Move out of the scanning marker |
| E5 | Rust Guard | Rust Charge | Gains a major temporary movement-speed boost | Sidestep and put solid cover between you and the charge |
| E6 | Pulse Drone | EMP Pulse | Emits a seven-meter pulse that disables sprinting temporarily | Leave its pulse radius before activation |
| E7 | Shock Spider | Electric Web | Deploys a damaging web that slows movement | Shoot the web or walk around it |
| E8 | Riot Unit | Shield Bash | Damages and knocks back nearby players, or charges from farther away | Keep distance and target its head |
| E9 | Toxic Walker | Toxic Cloud | Leaves a persistent damaging poison zone | Force it away from useful space and leave the cloud |
| E10 | Outpost Sniper | Laser Mark | Telegraphs a powerful double-damage sniper strike | Break position immediately when the marker appears |
| E11 | Cloaked Hunter | Predator Cloak | Cloaks, teleports behind the player and performs a delayed strike | Turn around and move away when its cloak cue plays |
| E12 | Repair Engineer | Repair Station | Deploys a device that repeatedly heals nearby enemies | Shoot the glowing station before fighting its allies |
| E13 | Flame Trooper | Flame Wall | Places three persistent burning zones across the player's path | Move around the ends or cross between separated zones |
| E14 | Phantom Drone | Phantom Copies | Teleports and creates three shootable holographic decoys | Identify the detailed moving original or destroy the decoys |
| E15 | Heavy Enforcer | Suppression Mode | Stops advancing and fires a sustained twelve-shot barrage | Get behind cover and punish it after the burst |
| E16 | Plasma Witch | Gravity Orb | Creates a shootable orb that pulls the player inward and damages at its center | Destroy the orb while moving away from it |
| E17 | Siege Walker | Targeted Bombardment | Places three delayed explosive markers around the player | Keep moving until every marker detonates |
| E18 | Void Assassin | Shadow Strike | Teleports behind the player and attacks after a short delay | Sprint forward, turn and engage before it escapes |
| E19 | Titan Guardian | Titan Stomp | Sends a large expanding ground shockwave across the arena | Jump over the visible shockwave ring |
| E20 | The Outpost Core | Core Protocols | Phase 1 uses rotating lasers, phase 2 uses bombardment, and phase 3 creates gravity orbs and summons reinforcements | Read each phase, use cover, destroy orbs and control summoned enemies |

### Scrap Crawler detail

- The crawler is a low six-legged scrap machine with a capsule chassis, segmented legs, articulated-looking joints, layered salvaged back plates, paired red eyes, jaw plates, mandibles, armor spikes and an exhaust stack.
- Scrap Burrow is a timed four-second animation: one second digging at its current position, two seconds visibly tracking underground toward the player, and one second climbing back above ground.
- Burrow has an exact five-second cooldown after the crawler finishes surfacing. It will not begin burrowing while the player is within its 1.2-unit melee range; it continues biting and waits until the player creates distance.
- Digging, underground travel and emergence have separate sound sequences. The underground movement repeats a spatial rumble roughly every third of a second.
- Normal walking produces repeating metal footfalls, standing produces regular servo-and-jaw idle sounds, and death has its own falling metal, impact and shutdown sequence.

## Wave system

- There are exactly 50 waves defined in `WAVE_PLAN` inside `game.js`.
- Low-tier enemies remain in high waves as swarm, pursuit and crossfire pressure while advanced enemies control space and deal heavy damage.
- Every fifth wave before wave 50 contains one elite final-tier enemy with 50% more health, 20% more damage, 20% larger size and slightly higher speed.
- Enemy roles are shuffled before spawning so melee, ranged, support and specialist units overlap instead of arriving in predictable type blocks. E20 always deploys first on wave 50.
- Enemy health increases by 10% every five waves.
- Enemy damage increases by 8% every ten waves.
- Six seconds of preparation are provided between waves.
- Enemies spawn progressively with a cap of 11 living enemies. On persistently slow devices, adaptive performance mode temporarily limits future simultaneous spawns to 9 without removing existing enemies or changing wave totals.

| Wave | Enemy composition | Total | Special |
|---:|---|---:|---|
| 1 | E1×6 | 6 | Introduction |
| 2 | E1×6, E2×2 | 8 | First ranged units |
| 3 | E1×5, E2×3, E3×2 | 10 | Mixed pressure |
| 4 | E1×4, E2×3, E3×3 | 10 | Fast swarm |
| 5 | E1×4, E2×4, E3×3 | 11 | Elite E3 |
| 6 | E1×3, E2×4, E3×4, E4×1 | 12 | Patrol Bot introduced |
| 7 | E1×3, E2×3, E3×4, E4×3 | 13 | Crossfire |
| 8 | E1×3, E2×3, E3×4, E4×4 | 14 | Larger crossfire |
| 9 | E1×3, E2×3, E3×4, E4×4, E5×1 | 15 | Rust Guard introduced |
| 10 | E1×3, E2×3, E3×4, E4×4, E5×2 | 16 | Elite E5 |
| 11 | E1×3, E3×3, E4×3, E5×3, E6×2 | 14 | Pulse Drone introduced |
| 12 | E1×3, E2×2, E4×3, E5×3, E6×3 | 14 | Air support |
| 13 | E2×3, E3×3, E4×3, E5×3, E6×3 | 15 | Mixed formation |
| 14 | E1×2, E3×3, E5×3, E6×4, E7×3 | 15 | Shock Spider introduced |
| 15 | E2×3, E4×3, E5×3, E6×4, E7×3 | 16 | Elite E7 |
| 16 | E1×3, E3×3, E5×3, E6×4, E7×4 | 17 | Swarm and EMP |
| 17 | E2×3, E4×3, E6×4, E7×4, E8×3 | 17 | Riot Unit introduced |
| 18 | E1×3, E3×3, E5×3, E7×4, E8×4 | 17 | Shield formation |
| 19 | E2×3, E4×3, E6×4, E7×4, E8×3, E9×2 | 19 | Toxic Walker introduced |
| 20 | E1×3, E3×3, E5×3, E7×3, E8×3, E9×2, E10×2 | 19 | Elite E10 |
| 21 | E1×3, E4×3, E6×3, E8×3, E9×3, E10×2, E11×2 | 19 | Cloaked Hunter introduced |
| 22 | E2×3, E3×3, E5×3, E7×3, E9×3, E10×2, E11×3 | 20 | Toxic ambush |
| 23 | E1×3, E4×3, E6×3, E8×3, E10×3, E11×3, E12×2 | 20 | Repair Engineer introduced |
| 24 | E2×3, E5×3, E7×3, E9×3, E10×3, E11×3, E12×3 | 21 | Protected repair squad |
| 25 | E1×3, E3×3, E6×3, E8×3, E10×3, E11×3, E12×3, E13×2 | 23 | Elite E13 |
| 26 | E2×3, E4×3, E7×3, E9×3, E11×4, E12×3, E13×3 | 22 | Fire and repair |
| 27 | E1×3, E5×3, E8×3, E10×3, E11×4, E12×3, E13×3 | 22 | Shielded hunters |
| 28 | E2×3, E3×3, E7×3, E9×3, E11×4, E12×3, E13×3 | 22 | Hazard swarm |
| 29 | E1×3, E4×3, E6×3, E8×3, E10×3, E12×3, E13×3, E14×2 | 23 | Phantom Drone introduced |
| 30 | E2×3, E5×3, E7×3, E9×3, E11×3, E12×3, E13×3, E14×3 | 24 | Elite E14 |
| 31 | E1×3, E4×3, E6×3, E9×3, E11×3, E13×3, E14×3, E15×2 | 23 | Heavy Enforcer introduced |
| 32 | E2×3, E5×3, E7×3, E10×3, E12×3, E13×3, E14×3, E15×3 | 24 | Suppression squad |
| 33 | E1×3, E6×3, E8×3, E11×3, E13×3, E14×3, E15×3, E16×2 | 23 | Plasma Witch introduced |
| 34 | E2×3, E4×3, E7×3, E9×3, E12×3, E14×3, E15×3, E16×3 | 24 | Gravity and repair |
| 35 | E1×3, E5×3, E8×3, E10×3, E13×3, E15×3, E16×3 | 21 | Elite E16 |
| 36 | E2×3, E7×3, E9×3, E12×3, E15×3, E16×3, E17×2 | 20 | Siege Walker introduced |
| 37 | E1×3, E6×3, E8×3, E11×3, E15×3, E16×3, E17×3 | 21 | Bombardment support |
| 38 | E2×3, E7×3, E10×3, E12×3, E15×3, E16×3, E17×3 | 21 | Heavy siege |
| 39 | E1×3, E6×3, E9×3, E11×3, E16×3, E17×3, E18×2 | 20 | Void Assassin introduced |
| 40 | E2×3, E7×3, E10×3, E12×3, E15×3, E17×3, E18×3 | 21 | Elite E18 |
| 41 | E1×4, E4×3, E7×3, E10×3, E12×3, E14×3, E16×3, E18×2 | 24 | Full-tier assault |
| 42 | E2×4, E5×3, E6×3, E9×3, E11×3, E13×3, E17×3, E18×2 | 24 | Chase and siege |
| 43 | E1×3, E3×3, E7×3, E8×3, E10×2, E12×3, E14×3, E16×3, E18×3 | 26 | Teleport crossfire |
| 44 | E2×3, E4×3, E5×2, E6×3, E9×3, E11×3, E13×3, E15×3, E17×3, E18×2 | 28 | Suppression wall |
| 45 | E1×3, E3×3, E7×3, E10×3, E12×3, E14×3, E16×3, E18×3, E19×1 | 25 | Elite E19 |
| 46 | E2×3, E4×3, E8×3, E9×2, E11×3, E13×3, E17×3, E18×3, E19×2 | 25 | Double Titan formation |
| 47 | E1×3, E5×3, E7×3, E10×3, E12×3, E16×3, E17×3, E18×3, E19×2 | 26 | Armor and assassins |
| 48 | E2×3, E3×3, E6×3, E8×3, E9×2, E11×3, E14×3, E17×3, E18×3, E19×2 | 28 | Triple-layer siege |
| 49 | E1×3, E4×3, E7×3, E10×3, E12×3, E14×3, E16×3, E17×3, E18×3, E19×3 | 30 | Final defense |
| 50 | E20×1, E1×3, E3×3, E6×3, E8×3, E12×3, E14×3, E16×3, E17×3, E18×3, E19×2 | 30 | Final boss and reinforcements |

## Performance

The game caps pixel density, uses emissive lighting instead of costly dynamic shadows and decorative point lights, caches static materials, geometry and procedural enemy-noise buffers, throttles overlapping ambient enemy sounds, shares model geometry and navigation data, and automatically lowers internal render resolution if frame rate drops. Adaptive performance mode reduces only distant cosmetic animation and extra companion aura particles; AI, collision, aiming, damage and abilities continue updating at full rate.

## Arena and spawn gates

- The Outpost arena uses a generated industrial floor material with metal panels, bolts, wear variation, navigation axes and hazard boundaries.
- Four neon movement lanes, a layered central command seal, colored district beacons and reinforced cover make arena locations readable during combat.
- Perimeter walls have layered armor panels, service lighting, corner towers, overhead crossbeams and an exterior industrial skyline beneath a gradient night sky and moon halo.
- Two walkable, illuminated bridges pass through separate north-wall entrances and connect the main arena to a smaller **AUXILIARY PLATFORM** map. The second combat space has its own armored perimeter, grid floor, cover blocks, power relay, lane markings and colored navigation beacons.
- Player collision, enemy flow-field navigation and companion transit routing include both bridges and both combat maps.
- Sixteen physical enemy spawn gates are aligned directly with the spawn selection system. Each gate has a solid frame, illuminated columns, a rotating floor ring and a portal surface that flashes when an enemy arrives.
- Spawn gates do not use particles. Ambient sky dust is generated with a five-unit exclusion radius around every spawn gate.
- All new decorative pieces near travel lanes are non-collidable, preserving the navigation grid and keeping enemies from becoming stuck on visual detail.

## Music system

- Music starts after **Enter the Outpost** is clicked, as browsers require a user gesture before audio playback.
- The procedural soundtrack includes an atmospheric drone, four-root chord progression, minor-scale lead, bass sequence, synthesized kick, filtered percussion and milestone-wave tension notes.
- Music intensity reacts to the current wave and number of living hostiles.
- Press `M` to mute or enable the soundtrack.
- Overall game volume defaults to **100%** and controls music, weapons, enemies and interface sounds together.
- Press `V` to turn overall audio on or off. Press `-` or `+` to adjust it in 5% steps.
- The pause menu includes an overall-volume slider and toggle; volume information is intentionally omitted from the first-person HUD.
- **SQUAD VOICE defaults to OFF.** Its separate menu toggle enables or disables natural system-voice companion announcements without muting combat sounds. Announcements use normal speech pitch and rate with a short radio cue.

## Interface design

- The HUD uses a layered command-interface treatment with glass panels, corner brackets, scanlines, a subtle visor vignette and a circular illuminated crosshair.
- Wave, hostile, health, Nano Shield, ammunition, status and God Mode information have dedicated readable regions without blocking the center of the arena. Volume remains adjustable from the pause menu without occupying the first-person HUD.
- Spending the final round displays a pulsing red center-screen **MAGAZINE EMPTY // PRESS R TO RELOAD** warning until reloading begins or ammunition is restored.
- During active first-person play, a curved glass helmet visor, armored rim, reflections and perspective-bent HUD panels frame the view. The helmet presentation switches off automatically in menus, pause and result screens.
- The bottom-center visor message is reserved exclusively for wave information: preparation, incoming wave, active combat, wave-cleared countdown, final wave, victory, or failure. Combat interactions and settings can no longer replace this wave text.
- The pause menu groups movement controls, master audio, testing tools and squad management into separate color-coded sections.

## Main files

- `index.html`: menus, HUD, and Three.js import map
- `styles.css`: full-screen game interface
- `game.js`: rendering, movement, weapon, audio, enemies, combat, and all 50 waves

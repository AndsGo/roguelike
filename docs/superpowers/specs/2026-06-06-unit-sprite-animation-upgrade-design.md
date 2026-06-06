# Unit Sprite Animation Upgrade Design

## Goal

Upgrade all hero and enemy battle visuals from generated chibi fallbacks to authored spritesheet animations, starting with a controlled first batch of eight units.

## Current State

The game already supports authored unit sprites through `spriteKey` and `UnitSpriteAssets.ts`. The runtime animation format is a single spritesheet per unit with five rows and four columns:

- Row 1: `idle`
- Row 2: `attack`
- Row 3: `cast`
- Row 4: `hurt`
- Row 5: `death`

Each frame is `320 x 256`. The current authored prototype coverage is limited to:

- `hero_warrior`
- `enemy_slime`

The data set contains 26 heroes and 28 enemies, for 54 unique `spriteKey` values.

## Strategy

Use a staged production pipeline rather than generating all 54 units at once. Each batch must produce usable game assets, update the sprite manifest, pass automated checks, and be visually reviewed in battle before moving on.

The first batch validates the style and workflow across core gameplay archetypes:

- `hero_archer`: ranged physical hero
- `hero_mage`: ranged fire caster hero
- `hero_priest`: holy healer hero
- `hero_rogue`: fast melee assassin hero
- `enemy_goblin`: fast melee enemy
- `enemy_skeleton_archer`: ranged undead enemy
- `enemy_dark_mage`: dark caster enemy
- `enemy_dragon`: boss-scale dragon enemy

## Asset Specification

Every authored unit must use the same runtime contract:

- File format: PNG
- Runtime path: `public/assets/units/<group>/<spriteKey>_spritesheet.png`
- Source path: `assets-src/ai-sprites/<group>/<spriteKey>_spritesheet_source.png`
- Frame size: `320 x 256`
- Grid: 4 columns x 5 rows
- Frame count: 20 total
- Background: flat chroma-key source for removal, final runtime PNG with alpha
- Facing: heroes face right by default; enemies face left by runtime flip or asset convention decided during implementation
- Camera: side-view battle pose, centered in each frame
- Padding: enough room for weapon swings, spells, and death collapse without clipping
- Style: readable stylized fantasy battle sprites, consistent with current prototype scale and silhouette clarity

## First Batch Visual Direction

### hero_archer

Readable elf or ranger silhouette with bow as the primary identifier. Idle should show a steady ready stance. Attack should clearly draw and release an arrow. Cast can be a focused volley or empowered shot. Hurt should recoil backward. Death should drop the bow or collapse without excessive rotation.

### hero_mage

Fire caster silhouette with robe, staff or glowing hands, and warm red-orange accents. Idle should show a magical aura or staff hold. Attack can be a small wand/staff strike or fire bolt gesture. Cast should be the strongest row, with clear fire gathering. Hurt should interrupt the casting posture. Death should dissipate the flame and fall.

### hero_priest

Holy healer silhouette with white-gold visual identity, staff or holy book. Idle should feel calm and upright. Attack can be a small smite gesture. Cast should show healing or holy light energy. Hurt should preserve dignity without looking too aggressive. Death should fade or kneel before disappearing.

### hero_rogue

Dark assassin silhouette with dual daggers or short blade. Idle should look low and ready. Attack should be a quick slash or lunge. Cast can be a shadow technique, not a mage-like spell. Hurt should snap backward. Death should collapse quickly and cleanly.

### enemy_goblin

Small hostile humanoid, hunched and scrappy, with dagger or crude weapon. Idle should twitch or bounce subtly. Attack should be a quick stab or rush. Cast can be a taunt or dirty trick. Hurt should squash back. Death should be readable at small size.

### enemy_skeleton_archer

Undead archer with bow and bony silhouette. Idle should rattle slightly. Attack should clearly nock and fire. Cast can be a dark arrow charge. Hurt should show bones jolt apart without losing the silhouette. Death can collapse into bones.

### enemy_dark_mage

Dark robed caster with purple or black-blue magic. Idle should hover or sway. Attack should be a small dark bolt gesture. Cast should show a larger dark spell wind-up. Hurt should break the spell posture. Death should dissipate into shadow.

### enemy_dragon

Boss-scale dragon, larger and more imposing than normal enemies. Idle should breathe or flex wings without excessive motion. Attack should be claw, bite, or tail motion. Cast should read as fire breath or boss magic. Hurt should flinch but remain massive. Death should be slower and heavier than other units.

## Generation Workflow

Use the built-in Codex image generation tool for project-bound bitmap assets. Generate one unit at a time with a structured prompt. Request a flat chroma-key background in the source image, then remove the key locally and save final alpha PNGs in the workspace.

For each unit:

1. Generate a complete 4 x 5 spritesheet with the shared layout.
2. Save the original source under `assets-src/ai-sprites/units/`.
3. Remove chroma-key background and validate alpha.
4. Save runtime PNG under `public/assets/units/`.
5. Register the unit in `UnitSpriteAssets.ts`.
6. Run targeted tests for preload and animation manifest behavior.
7. Review in battle or a dedicated preview scene.

## Runtime Design

The existing animation system remains the runtime contract:

- `UnitSpriteAssets.ts` owns spritesheet metadata.
- `BootScene` preloads every registered authored spritesheet.
- `Unit` chooses authored sprite if its `spriteKey` is registered and loaded.
- `UnitAnimationSystem` triggers `idle`, `attack`, and `cast`.
- `Unit` triggers `hurt` and `death`.
- Generated chibi rendering remains the fallback for missing or unfinished sprites.

Do not remove the fallback until all 54 units have reviewed authored sprites.

## Testing

Add or maintain tests for:

- Every first-batch `spriteKey` is registered in `UnitSpriteAssets.ts`.
- Registered spritesheets use 20 frames and the expected row mapping.
- Missing assets do not break fallback rendering.
- Authored units continue using sprite animation rows for attack, cast, hurt, and death.
- Build and full test suite pass after each batch.

## Acceptance Criteria

The first batch is accepted when:

- All 8 spritesheets exist in source and runtime folders.
- All 8 `spriteKey` values resolve through the manifest.
- Each unit visibly plays `idle`, `attack`, `cast`, `hurt`, and `death`.
- No frame row is static by mistake.
- No character is clipped inside its frame.
- Heroes and enemies remain visually distinguishable at battle scale.
- Boss scale is readable but does not cover UI or adjacent units.
- `npm run build` and `npm test` pass.

## Rollout Plan

1. First batch: 4 heroes and 4 enemies listed above.
2. Second batch: remaining early-game and frequently seen units.
3. Third batch: remaining heroes grouped by class and element.
4. Fourth batch: remaining enemies grouped by monster type and element.
5. Final batch: bosses and any high-risk units that need custom treatment.

Each batch should be small enough to visually review and regenerate failed assets without blocking the whole upgrade.

import Phaser from 'phaser';

export type UnitSpriteAnim = 'idle' | 'attack' | 'cast' | 'hurt' | 'death';

export interface UnitSpriteSheetConfig {
  spriteKey: string;
  textureKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  displayHeight: number;
  frameRate: number;
  frames: Record<UnitSpriteAnim, { start: number; end: number; repeat: number }>;
}

function createUnitSpriteSheetConfig(
  spriteKey: string,
  path: string,
  displayWidth: number,
  displayHeight: number,
  frameRate = 8,
): UnitSpriteSheetConfig {
  return {
    spriteKey,
    textureKey: `ai_unit_${spriteKey}`,
    path,
    frameWidth: 320,
    frameHeight: 256,
    displayWidth,
    displayHeight,
    frameRate,
    frames: {
      idle: { start: 0, end: 3, repeat: -1 },
      attack: { start: 4, end: 7, repeat: 0 },
      cast: { start: 8, end: 11, repeat: 0 },
      hurt: { start: 12, end: 15, repeat: 0 },
      death: { start: 16, end: 19, repeat: 0 },
    },
  };
}

const AI_UNIT_SPRITES: Record<string, UnitSpriteSheetConfig> = {
  hero_warrior: createUnitSpriteSheetConfig(
    'hero_warrior',
    'assets/units/prototypes/hero_warrior_spritesheet.png',
    64,
    64,
  ),
  enemy_slime: createUnitSpriteSheetConfig(
    'enemy_slime',
    'assets/units/prototypes/enemy_slime_spritesheet.png',
    58,
    58,
  ),
  hero_archer: createUnitSpriteSheetConfig(
    'hero_archer',
    'assets/units/first-batch/hero_archer_spritesheet.png',
    64,
    64,
  ),
  hero_mage: createUnitSpriteSheetConfig(
    'hero_mage',
    'assets/units/first-batch/hero_mage_spritesheet.png',
    64,
    64,
  ),
  hero_priest: createUnitSpriteSheetConfig(
    'hero_priest',
    'assets/units/first-batch/hero_priest_spritesheet.png',
    64,
    64,
  ),
  hero_rogue: createUnitSpriteSheetConfig(
    'hero_rogue',
    'assets/units/first-batch/hero_rogue_spritesheet.png',
    64,
    64,
  ),
  enemy_goblin: createUnitSpriteSheetConfig(
    'enemy_goblin',
    'assets/units/first-batch/enemy_goblin_spritesheet.png',
    58,
    58,
  ),
  enemy_skeleton_archer: createUnitSpriteSheetConfig(
    'enemy_skeleton_archer',
    'assets/units/first-batch/enemy_skeleton_archer_spritesheet.png',
    58,
    58,
  ),
  enemy_dark_mage: createUnitSpriteSheetConfig(
    'enemy_dark_mage',
    'assets/units/first-batch/enemy_dark_mage_spritesheet.png',
    58,
    58,
  ),
  enemy_dragon: createUnitSpriteSheetConfig(
    'enemy_dragon',
    'assets/units/first-batch/enemy_dragon_spritesheet.png',
    92,
    92,
    7,
  ),
  hero_knight: createUnitSpriteSheetConfig(
    'hero_knight',
    'assets/units/second-batch/hero_knight_spritesheet.png',
    66,
    66,
  ),
  hero_shadow_assassin: createUnitSpriteSheetConfig(
    'hero_shadow_assassin',
    'assets/units/second-batch/hero_shadow_assassin_spritesheet.png',
    64,
    64,
  ),
  hero_elementalist: createUnitSpriteSheetConfig(
    'hero_elementalist',
    'assets/units/second-batch/hero_elementalist_spritesheet.png',
    64,
    64,
  ),
  hero_druid: createUnitSpriteSheetConfig(
    'hero_druid',
    'assets/units/second-batch/hero_druid_spritesheet.png',
    64,
    64,
  ),
  enemy_orc_warrior: createUnitSpriteSheetConfig(
    'enemy_orc_warrior',
    'assets/units/second-batch/enemy_orc_warrior_spritesheet.png',
    62,
    62,
  ),
  enemy_fire_lizard: createUnitSpriteSheetConfig(
    'enemy_fire_lizard',
    'assets/units/second-batch/enemy_fire_lizard_spritesheet.png',
    58,
    58,
  ),
  enemy_fire_elemental: createUnitSpriteSheetConfig(
    'enemy_fire_elemental',
    'assets/units/second-batch/enemy_fire_elemental_spritesheet.png',
    60,
    60,
  ),
  enemy_flame_knight: createUnitSpriteSheetConfig(
    'enemy_flame_knight',
    'assets/units/second-batch/enemy_flame_knight_spritesheet.png',
    62,
    62,
  ),
  hero_necromancer: createUnitSpriteSheetConfig(
    'hero_necromancer',
    'assets/units/third-batch/hero_necromancer_spritesheet.png',
    64,
    64,
  ),
  hero_berserker: createUnitSpriteSheetConfig(
    'hero_berserker',
    'assets/units/third-batch/hero_berserker_spritesheet.png',
    66,
    66,
  ),
  hero_frost_ranger: createUnitSpriteSheetConfig(
    'hero_frost_ranger',
    'assets/units/third-batch/hero_frost_ranger_spritesheet.png',
    64,
    64,
  ),
  hero_beast_warden: createUnitSpriteSheetConfig(
    'hero_beast_warden',
    'assets/units/third-batch/hero_beast_warden_spritesheet.png',
    70,
    70,
  ),
  enemy_ice_wolf: createUnitSpriteSheetConfig(
    'enemy_ice_wolf',
    'assets/units/third-batch/enemy_ice_wolf_spritesheet.png',
    58,
    58,
  ),
  enemy_frost_giant: createUnitSpriteSheetConfig(
    'enemy_frost_giant',
    'assets/units/third-batch/enemy_frost_giant_spritesheet.png',
    72,
    72,
  ),
  enemy_ice_mage: createUnitSpriteSheetConfig(
    'enemy_ice_mage',
    'assets/units/third-batch/enemy_ice_mage_spritesheet.png',
    58,
    58,
  ),
  enemy_storm_hawk: createUnitSpriteSheetConfig(
    'enemy_storm_hawk',
    'assets/units/third-batch/enemy_storm_hawk_spritesheet.png',
    58,
    58,
  ),
};

export function getUnitSpriteSheet(spriteKey?: string): UnitSpriteSheetConfig | undefined {
  return spriteKey ? AI_UNIT_SPRITES[spriteKey] : undefined;
}

export function getAllUnitSpriteSheets(): UnitSpriteSheetConfig[] {
  return Object.values(AI_UNIT_SPRITES);
}

export function preloadUnitSpriteSheets(scene: Phaser.Scene): void {
  for (const config of Object.values(AI_UNIT_SPRITES)) {
    if (!scene.textures.exists(config.textureKey)) {
      scene.load.spritesheet(config.textureKey, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    }
  }
}

export function ensureUnitSpriteAnimations(scene: Phaser.Scene, config: UnitSpriteSheetConfig): void {
  for (const [anim, frameRange] of Object.entries(config.frames)) {
    const key = `${config.textureKey}_${anim}`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(config.textureKey, {
        start: frameRange.start,
        end: frameRange.end,
      }),
      frameRate: config.frameRate,
      repeat: frameRange.repeat,
    });
  }
}

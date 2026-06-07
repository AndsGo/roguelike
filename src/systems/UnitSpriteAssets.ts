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
  hero_dragon_knight: createUnitSpriteSheetConfig(
    'hero_dragon_knight',
    'assets/units/fourth-batch/hero_dragon_knight_spritesheet.png',
    70,
    70,
  ),
  hero_shadow_weaver: createUnitSpriteSheetConfig(
    'hero_shadow_weaver',
    'assets/units/fourth-batch/hero_shadow_weaver_spritesheet.png',
    64,
    64,
  ),
  hero_storm_caller: createUnitSpriteSheetConfig(
    'hero_storm_caller',
    'assets/units/fourth-batch/hero_storm_caller_spritesheet.png',
    64,
    64,
  ),
  hero_holy_sentinel: createUnitSpriteSheetConfig(
    'hero_holy_sentinel',
    'assets/units/fourth-batch/hero_holy_sentinel_spritesheet.png',
    66,
    66,
  ),
  enemy_thunder_golem: createUnitSpriteSheetConfig(
    'enemy_thunder_golem',
    'assets/units/fourth-batch/enemy_thunder_golem_spritesheet.png',
    72,
    72,
  ),
  enemy_shadow_wraith: createUnitSpriteSheetConfig(
    'enemy_shadow_wraith',
    'assets/units/fourth-batch/enemy_shadow_wraith_spritesheet.png',
    58,
    58,
  ),
  enemy_dark_cultist: createUnitSpriteSheetConfig(
    'enemy_dark_cultist',
    'assets/units/fourth-batch/enemy_dark_cultist_spritesheet.png',
    58,
    58,
  ),
  enemy_holy_guardian: createUnitSpriteSheetConfig(
    'enemy_holy_guardian',
    'assets/units/fourth-batch/enemy_holy_guardian_spritesheet.png',
    64,
    64,
  ),
  hero_ice_mage: createUnitSpriteSheetConfig(
    'hero_ice_mage',
    'assets/units/fifth-batch/hero_ice_mage_spritesheet.png',
    64,
    64,
  ),
  hero_thunder_monk: createUnitSpriteSheetConfig(
    'hero_thunder_monk',
    'assets/units/fifth-batch/hero_thunder_monk_spritesheet.png',
    66,
    66,
  ),
  hero_elemental_weaver: createUnitSpriteSheetConfig(
    'hero_elemental_weaver',
    'assets/units/fifth-batch/hero_elemental_weaver_spritesheet.png',
    64,
    64,
  ),
  hero_forest_stalker: createUnitSpriteSheetConfig(
    'hero_forest_stalker',
    'assets/units/fifth-batch/hero_forest_stalker_spritesheet.png',
    64,
    64,
  ),
  enemy_light_sprite: createUnitSpriteSheetConfig(
    'enemy_light_sprite',
    'assets/units/fifth-batch/enemy_light_sprite_spritesheet.png',
    54,
    54,
  ),
  enemy_frost_queen: createUnitSpriteSheetConfig(
    'enemy_frost_queen',
    'assets/units/fifth-batch/enemy_frost_queen_spritesheet.png',
    82,
    82,
    7,
  ),
  enemy_thunder_titan: createUnitSpriteSheetConfig(
    'enemy_thunder_titan',
    'assets/units/fifth-batch/enemy_thunder_titan_spritesheet.png',
    92,
    92,
    7,
  ),
  enemy_shadow_lord: createUnitSpriteSheetConfig(
    'enemy_shadow_lord',
    'assets/units/fifth-batch/enemy_shadow_lord_spritesheet.png',
    86,
    86,
    7,
  ),
  hero_magma_warden: createUnitSpriteSheetConfig(
    'hero_magma_warden',
    'assets/units/sixth-batch/hero_magma_warden_spritesheet.png',
    74,
    74,
  ),
  hero_storm_falcon: createUnitSpriteSheetConfig(
    'hero_storm_falcon',
    'assets/units/sixth-batch/hero_storm_falcon_spritesheet.png',
    64,
    64,
  ),
  hero_frost_whisperer: createUnitSpriteSheetConfig(
    'hero_frost_whisperer',
    'assets/units/sixth-batch/hero_frost_whisperer_spritesheet.png',
    64,
    64,
  ),
  hero_holy_emissary: createUnitSpriteSheetConfig(
    'hero_holy_emissary',
    'assets/units/sixth-batch/hero_holy_emissary_spritesheet.png',
    66,
    66,
  ),
  enemy_flame_construct: createUnitSpriteSheetConfig(
    'enemy_flame_construct',
    'assets/units/sixth-batch/enemy_flame_construct_spritesheet.png',
    66,
    66,
  ),
  enemy_frost_sentinel: createUnitSpriteSheetConfig(
    'enemy_frost_sentinel',
    'assets/units/sixth-batch/enemy_frost_sentinel_spritesheet.png',
    72,
    72,
  ),
  enemy_lightning_strider: createUnitSpriteSheetConfig(
    'enemy_lightning_strider',
    'assets/units/sixth-batch/enemy_lightning_strider_spritesheet.png',
    60,
    60,
  ),
  enemy_holy_smith: createUnitSpriteSheetConfig(
    'enemy_holy_smith',
    'assets/units/sixth-batch/enemy_holy_smith_spritesheet.png',
    62,
    62,
  ),
  hero_ice_dragon_hunter: createUnitSpriteSheetConfig(
    'hero_ice_dragon_hunter',
    'assets/units/final-batch/hero_ice_dragon_hunter_spritesheet.png',
    64,
    64,
  ),
  enemy_void_weaver: createUnitSpriteSheetConfig(
    'enemy_void_weaver',
    'assets/units/final-batch/enemy_void_weaver_spritesheet.png',
    60,
    60,
  ),
  enemy_elemental_chimera: createUnitSpriteSheetConfig(
    'enemy_elemental_chimera',
    'assets/units/final-batch/enemy_elemental_chimera_spritesheet.png',
    82,
    82,
    7,
  ),
  enemy_heart_of_the_forge: createUnitSpriteSheetConfig(
    'enemy_heart_of_the_forge',
    'assets/units/final-batch/enemy_heart_of_the_forge_spritesheet.png',
    96,
    96,
    7,
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

import Phaser from 'phaser';

export type VisualSpriteSheetKey =
  | 'skill_fx'
  | 'map_nodes'
  | 'item_icons'
  | 'status_icons'
  | 'hud_fx';

export interface VisualSpriteFrame {
  name: string;
  index: number;
}

export interface VisualSpriteSheetConfig {
  key: VisualSpriteSheetKey;
  textureKey: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  frames: VisualSpriteFrame[];
}

function createVisualSpriteSheetConfig(
  key: VisualSpriteSheetKey,
  path: string,
  frameWidth: number,
  frameHeight: number,
  frameNames: string[],
): VisualSpriteSheetConfig {
  return {
    key,
    textureKey: `visual_${key}`,
    path,
    frameWidth,
    frameHeight,
    frames: frameNames.map((name, index) => ({ name, index })),
  };
}

const VISUAL_SPRITE_SHEETS: Record<VisualSpriteSheetKey, VisualSpriteSheetConfig> = {
  skill_fx: createVisualSpriteSheetConfig(
    'skill_fx',
    'assets/visual/skill_fx_spritesheet.png',
    32,
    32,
    ['projectile', 'aoe_blast', 'ignite', 'freeze', 'shock', 'annihilate'],
  ),
  map_nodes: createVisualSpriteSheetConfig(
    'map_nodes',
    'assets/visual/map_nodes_spritesheet.png',
    32,
    32,
    ['battle', 'elite', 'boss', 'shop', 'event', 'rest', 'gauntlet'],
  ),
  item_icons: createVisualSpriteSheetConfig(
    'item_icons',
    'assets/visual/item_icons_spritesheet.png',
    32,
    32,
    ['weapon', 'armor', 'accessory', 'relic', 'common', 'uncommon', 'rare', 'epic', 'legendary'],
  ),
  status_icons: createVisualSpriteSheetConfig(
    'status_icons',
    'assets/visual/status_icons_spritesheet.png',
    24,
    24,
    ['dot', 'hot', 'stun', 'buff', 'debuff', 'taunt', 'counter_aura'],
  ),
  hud_fx: createVisualSpriteSheetConfig(
    'hud_fx',
    'assets/visual/hud_fx_spritesheet.png',
    32,
    32,
    ['skill_ready', 'ultimate_ready', 'cooldown_done', 'target_lock'],
  ),
};

export function getVisualSpriteSheet(key: VisualSpriteSheetKey): VisualSpriteSheetConfig | undefined {
  return VISUAL_SPRITE_SHEETS[key];
}

export function getVisualSpriteFrame(sheetKey: VisualSpriteSheetKey, frameName: string): number | undefined {
  return VISUAL_SPRITE_SHEETS[sheetKey]?.frames.find(frame => frame.name === frameName)?.index;
}

export function getAllVisualSpriteSheets(): VisualSpriteSheetConfig[] {
  return Object.values(VISUAL_SPRITE_SHEETS);
}

export function preloadVisualSpriteSheets(scene: Phaser.Scene): void {
  for (const sheet of getAllVisualSpriteSheets()) {
    if (!scene.textures.exists(sheet.textureKey)) {
      scene.load.spritesheet(sheet.textureKey, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }
}

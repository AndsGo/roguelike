import { describe, expect, it, vi } from 'vitest';
import {
  getAllVisualSpriteSheets,
  getVisualSpriteSheet,
  preloadVisualSpriteSheets,
} from '../../src/systems/VisualSpriteAssets';

describe('VisualSpriteAssets registry', () => {
  it('registers the five lightweight visual sprite sheets', () => {
    expect(getVisualSpriteSheet('skill_fx')?.path).toBe('assets/visual/skill_fx_spritesheet.png');
    expect(getVisualSpriteSheet('map_nodes')?.path).toBe('assets/visual/map_nodes_spritesheet.png');
    expect(getVisualSpriteSheet('item_icons')?.path).toBe('assets/visual/item_icons_spritesheet.png');
    expect(getVisualSpriteSheet('status_icons')?.path).toBe('assets/visual/status_icons_spritesheet.png');
    expect(getVisualSpriteSheet('hud_fx')?.path).toBe('assets/visual/hud_fx_spritesheet.png');
  });

  it('exposes frame names needed by current UI surfaces', () => {
    expect(getVisualSpriteSheet('skill_fx')?.frames.map(f => f.name)).toEqual([
      'projectile',
      'aoe_blast',
      'ignite',
      'freeze',
      'shock',
      'annihilate',
    ]);
    expect(getVisualSpriteSheet('map_nodes')?.frames.map(f => f.name)).toEqual([
      'battle',
      'elite',
      'boss',
      'shop',
      'event',
      'rest',
      'gauntlet',
    ]);
    expect(getVisualSpriteSheet('item_icons')?.frames.map(f => f.name)).toEqual([
      'weapon',
      'armor',
      'accessory',
      'relic',
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ]);
    expect(getVisualSpriteSheet('status_icons')?.frames.map(f => f.name)).toEqual([
      'dot',
      'hot',
      'stun',
      'buff',
      'debuff',
      'taunt',
      'counter_aura',
    ]);
    expect(getVisualSpriteSheet('hud_fx')?.frames.map(f => f.name)).toEqual([
      'skill_ready',
      'ultimate_ready',
      'cooldown_done',
      'target_lock',
    ]);
  });

  it('uses compact fixed frame dimensions for each sheet', () => {
    for (const sheet of getAllVisualSpriteSheets()) {
      expect(sheet.textureKey).toBe(`visual_${sheet.key}`);
      expect(sheet.frameWidth).toBeGreaterThan(0);
      expect(sheet.frameHeight).toBeGreaterThan(0);
      expect(sheet.frames.every(frame => frame.index >= 0)).toBe(true);
    }
  });

  it('preloads sheets that are not already present', () => {
    const spritesheet = vi.fn();
    const scene = {
      textures: { exists: vi.fn((key: string) => key === 'visual_map_nodes') },
      load: { spritesheet },
    };

    preloadVisualSpriteSheets(scene as any);

    expect(spritesheet).toHaveBeenCalledTimes(4);
    expect(spritesheet).not.toHaveBeenCalledWith(
      'visual_map_nodes',
      expect.any(String),
      expect.any(Object),
    );
    expect(spritesheet).toHaveBeenCalledWith('visual_skill_fx', 'assets/visual/skill_fx_spritesheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  });
});

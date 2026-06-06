import { describe, expect, it } from 'vitest';
import { getAllUnitSpriteSheets, getUnitSpriteSheet } from '../../src/systems/UnitSpriteAssets';

const EXPECTED_FIRST_BATCH = [
  'hero_archer',
  'hero_mage',
  'hero_priest',
  'hero_rogue',
  'enemy_goblin',
  'enemy_skeleton_archer',
  'enemy_dark_mage',
  'enemy_dragon',
] as const;

describe('UnitSpriteAssets registry', () => {
  it('registers the first batch sprite keys', () => {
    for (const key of EXPECTED_FIRST_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('uses the expected 4x5 row mapping for every registered sheet', () => {
    for (const config of getAllUnitSpriteSheets()) {
      expect(config.frameWidth).toBe(320);
      expect(config.frameHeight).toBe(256);
      expect(config.frames.idle).toEqual({ start: 0, end: 3, repeat: -1 });
      expect(config.frames.attack).toEqual({ start: 4, end: 7, repeat: 0 });
      expect(config.frames.cast).toEqual({ start: 8, end: 11, repeat: 0 });
      expect(config.frames.hurt).toEqual({ start: 12, end: 15, repeat: 0 });
      expect(config.frames.death).toEqual({ start: 16, end: 19, repeat: 0 });
    }
  });
});

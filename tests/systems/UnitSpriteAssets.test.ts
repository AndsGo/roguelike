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

const EXPECTED_SECOND_BATCH = [
  'hero_knight',
  'hero_shadow_assassin',
  'hero_elementalist',
  'hero_druid',
  'enemy_orc_warrior',
  'enemy_fire_lizard',
  'enemy_fire_elemental',
  'enemy_flame_knight',
] as const;

const EXPECTED_THIRD_BATCH = [
  'hero_necromancer',
  'hero_berserker',
  'hero_frost_ranger',
  'hero_beast_warden',
  'enemy_ice_wolf',
  'enemy_frost_giant',
  'enemy_ice_mage',
  'enemy_storm_hawk',
] as const;

const EXPECTED_FOURTH_BATCH = [
  'hero_dragon_knight',
  'hero_shadow_weaver',
  'hero_storm_caller',
  'hero_holy_sentinel',
  'enemy_thunder_golem',
  'enemy_shadow_wraith',
  'enemy_dark_cultist',
  'enemy_holy_guardian',
] as const;

const EXPECTED_FIFTH_BATCH = [
  'hero_ice_mage',
  'hero_thunder_monk',
  'hero_elemental_weaver',
  'hero_forest_stalker',
  'enemy_light_sprite',
  'enemy_frost_queen',
  'enemy_thunder_titan',
  'enemy_shadow_lord',
] as const;

describe('UnitSpriteAssets registry', () => {
  it('registers the first batch sprite keys', () => {
    for (const key of EXPECTED_FIRST_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('registers the second batch sprite keys', () => {
    for (const key of EXPECTED_SECOND_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('registers the third batch sprite keys', () => {
    for (const key of EXPECTED_THIRD_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('registers the fourth batch sprite keys', () => {
    for (const key of EXPECTED_FOURTH_BATCH) {
      expect(getUnitSpriteSheet(key), `${key} should be registered`).toBeDefined();
    }
  });

  it('registers the fifth batch sprite keys', () => {
    for (const key of EXPECTED_FIFTH_BATCH) {
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

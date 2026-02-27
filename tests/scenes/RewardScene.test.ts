import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { RewardScene } from '../../src/scenes/RewardScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';
import { BattleResult } from '../../src/types';

describe('RewardScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function createResult(): BattleResult {
    const heroes = rm.getHeroes();
    return {
      victory: true,
      goldEarned: 25,
      expEarned: 50,
      survivors: heroes.map(h => h.id),
    };
  }

  function createRewardScene(result?: BattleResult): RewardScene {
    return SceneTestHarness.createScene(RewardScene, { result: result ?? createResult() });
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createRewardScene();
      expect(scene).toBeDefined();
    });

    it('init stores the battle result', () => {
      const result = createResult();
      const scene = createRewardScene(result);
      expect((scene as any).result).toBe(result);
    });

    it('shutdown kills all tweens', () => {
      const scene = createRewardScene();
      let killed = false;
      (scene as any).tweens = { killAll: () => { killed = true; }, add: () => ({}) };
      scene.shutdown();
      expect(killed).toBe(true);
    });
  });

  describe('UI content', () => {
    it('renders victory title', () => {
      const scene = createRewardScene();
      const titles = SceneTestHarness.findText(scene, '胜利');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('displays gold earned', () => {
      const result = createResult();
      result.goldEarned = 42;
      const scene = createRewardScene(result);
      const goldTexts = SceneTestHarness.findText(scene, '42');
      expect(goldTexts.length).toBeGreaterThan(0);
    });

    it('displays exp earned', () => {
      const result = createResult();
      result.expEarned = 100;
      const scene = createRewardScene(result);
      const expTexts = SceneTestHarness.findText(scene, '100');
      expect(expTexts.length).toBeGreaterThan(0);
    });

    it('displays survivor count', () => {
      const scene = createRewardScene();
      const heroes = rm.getHeroes();
      const survivorTexts = SceneTestHarness.findText(scene, `${heroes.length}`);
      expect(survivorTexts.length).toBeGreaterThan(0);
    });

    it('displays total gold', () => {
      const scene = createRewardScene();
      const gold = rm.getGold();
      const goldTexts = SceneTestHarness.findText(scene, `${gold}`);
      expect(goldTexts.length).toBeGreaterThan(0);
    });
  });
});

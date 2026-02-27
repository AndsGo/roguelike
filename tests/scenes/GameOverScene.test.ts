import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { GameOverScene } from '../../src/scenes/GameOverScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('GameOverScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function createScene(): GameOverScene {
    return SceneTestHarness.createScene(GameOverScene);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createScene();
      expect(scene).toBeDefined();
    });

    it('init resets rewardsApplied', () => {
      const scene = createScene();
      // After create, rewards should have been applied
      expect((scene as any).rewardsApplied).toBe(true);
    });

    it('shutdown kills all tweens', () => {
      const scene = createScene();
      let killed = false;
      (scene as any).tweens = { killAll: () => { killed = true; }, add: () => ({}) };
      scene.shutdown();
      expect(killed).toBe(true);
    });
  });

  describe('re-entry guard', () => {
    it('settleRewards only applies once', () => {
      const scene = createScene();
      // Already applied during create
      expect((scene as any).rewardsApplied).toBe(true);

      // Second call should return zero
      const result = (scene as any).settleRewards(false, 1);
      expect(result.metaReward).toBe(0);
      expect(result.newAchievements).toEqual([]);
    });
  });

  describe('UI content', () => {
    it('renders game over title', () => {
      const scene = createScene();
      const titles = SceneTestHarness.findText(scene, '游戏结束');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('renders reached stage', () => {
      const scene = createScene();
      const nodeTexts = SceneTestHarness.findText(scene, '到达');
      expect(nodeTexts.length).toBeGreaterThan(0);
    });
  });
});

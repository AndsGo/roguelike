import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { VictoryScene } from '../../src/scenes/VictoryScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('VictoryScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function createScene(): VictoryScene {
    return SceneTestHarness.createScene(VictoryScene);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createScene();
      expect(scene).toBeDefined();
    });

    it('init resets rewardsApplied', () => {
      const scene = createScene();
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
      expect((scene as any).rewardsApplied).toBe(true);

      const result = (scene as any).settleRewards(true, 1);
      expect(result.metaReward).toBe(0);
      expect(result.newAchievements).toEqual([]);
    });
  });

  describe('UI content', () => {
    it('renders victory title', () => {
      const scene = createScene();
      const titles = SceneTestHarness.findText(scene, '胜利');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('renders final team section', () => {
      const scene = createScene();
      const teamTexts = SceneTestHarness.findText(scene, '最终队伍');
      expect(teamTexts.length).toBeGreaterThan(0);
    });

    it('displays hero names', () => {
      const scene = createScene();
      const heroes = rm.getHeroes();
      if (heroes.length > 0) {
        const heroData = rm.getHeroData(heroes[0].id);
        const heroTexts = SceneTestHarness.findText(scene, heroData.name);
        expect(heroTexts.length).toBeGreaterThan(0);
      }
    });
  });
});

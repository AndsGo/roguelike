import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { RestScene } from '../../src/scenes/RestScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('RestScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function findRestNodeIndex(): number {
    const map = rm.getMap();
    const idx = map.findIndex(n => n.type === 'rest');
    // If no rest node, return 0 as fallback
    return idx >= 0 ? idx : 0;
  }

  function createRestScene(nodeIndex?: number): RestScene {
    const idx = nodeIndex ?? findRestNodeIndex();
    return SceneTestHarness.createScene(RestScene, { nodeIndex: idx });
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createRestScene();
      expect(scene).toBeDefined();
    });

    it('init captures nodeIndex', () => {
      const scene = createRestScene(5);
      expect((scene as any).nodeIndex).toBe(5);
    });

    it('init defaults nodeIndex to 0', () => {
      const scene = SceneTestHarness.createScene(RestScene);
      expect((scene as any).nodeIndex).toBe(0);
    });

    it('shutdown kills all tweens', () => {
      const scene = createRestScene();
      let killed = false;
      (scene as any).tweens = { killAll: () => { killed = true; }, add: () => ({}) };
      scene.shutdown();
      expect(killed).toBe(true);
    });
  });

  describe('UI content', () => {
    it('renders rest title', () => {
      const scene = createRestScene();
      const titles = SceneTestHarness.findText(scene, '休息');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('displays hero HP status', () => {
      const scene = createRestScene();
      const heroes = rm.getHeroes();
      if (heroes.length > 0) {
        const firstHero = rm.getHeroData(heroes[0].id);
        const hpTexts = SceneTestHarness.findText(scene, firstHero.name);
        expect(hpTexts.length).toBeGreaterThan(0);
      }
    });
  });
});

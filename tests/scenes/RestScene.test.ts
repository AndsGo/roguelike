import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';
import { REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX, INTEREST_CAP } from '../../src/constants';

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

  describe('3-choice overhaul', () => {
    it('displays train and scavenge buttons alongside rest', () => {
      const scene = createRestScene();
      const trainTexts = SceneTestHarness.findText(scene, '训练');
      const scavengeTexts = SceneTestHarness.findText(scene, '搜索');
      expect(trainTexts.length).toBeGreaterThan(0);
      expect(scavengeTexts.length).toBeGreaterThan(0);
    });

    it('REST_TRAIN_EXP is 120', () => {
      expect(REST_TRAIN_EXP).toBe(120);
    });

    it('REST_SCAVENGE_GOLD range is 40-60', () => {
      expect(REST_SCAVENGE_GOLD_MIN).toBe(40);
      expect(REST_SCAVENGE_GOLD_MAX).toBe(60);
    });

    it('train choice awards exp to all heroes', () => {
      const heroes = rm.getHeroes();
      const expBefore = heroes.map(h => h.exp);
      const scene = createRestScene();
      (scene as any).executeChoice('train', rm);
      for (let i = 0; i < heroes.length; i++) {
        expect(heroes[i].exp !== expBefore[i] || heroes[i].level > 1).toBe(true);
      }
    });

    it('scavenge choice adds gold plus interest', () => {
      const goldBefore = rm.getGold();
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      const goldAfter = rm.getGold();
      expect(goldAfter).toBeGreaterThan(goldBefore);
      // With 80G start, after scavenge (120-140G), interest is always capped at 5
      expect(goldAfter - goldBefore).toBeGreaterThanOrEqual(REST_SCAVENGE_GOLD_MIN + INTEREST_CAP);
      expect(goldAfter - goldBefore).toBeLessThanOrEqual(REST_SCAVENGE_GOLD_MAX + INTEREST_CAP);
    });

    it('rest choice heals heroes', () => {
      rm.damageAllHeroes(0.5);
      const hpBefore = rm.getHeroes().map(h => h.currentHp);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      const hpAfter = rm.getHeroes().map(h => h.currentHp);
      for (let i = 0; i < hpAfter.length; i++) {
        expect(hpAfter[i]).toBeGreaterThanOrEqual(hpBefore[i]);
      }
    });

    it('choice can only be made once', () => {
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      const goldAfterFirst = rm.getGold();
      (scene as any).executeChoice('scavenge', rm);
      expect(rm.getGold()).toBe(goldAfterFirst);
    });
  });

  describe('interest mechanism', () => {
    it('awards 0 interest when gold is 0', () => {
      rm.spendGold(rm.getGold());
      const goldBefore = rm.getGold();
      expect(goldBefore).toBe(0);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(0);
    });

    it('awards 1 interest for 10G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(10);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(11);
    });

    it('awards 4 interest for 49G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(49);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(53);
    });

    it('caps interest at INTEREST_CAP for 50G+', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(50);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(55);
    });

    it('caps interest at INTEREST_CAP for 100G', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(100);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      expect(rm.getGold()).toBe(105);
    });

    it('interest calculated after scavenge gold is added', () => {
      rm.spendGold(rm.getGold());
      rm.addGold(45);
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      // After scavenge: 45 + (40-60) = 85-105G → interest = 5 (cap)
      expect(rm.getGold()).toBeGreaterThanOrEqual(90);
      expect(rm.getGold()).toBeLessThanOrEqual(110);
    });
  });
});

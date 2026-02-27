import { describe, it, expect, beforeEach } from 'vitest';
import { EventScene } from '../../src/scenes/EventScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';
import { MapNode } from '../../src/types';

describe('EventScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
  });

  /**
   * Ensure the map has an event node at the given index.
   * Patches the map if needed so EventScene.create() can read it.
   */
  function ensureEventNode(nodeIndex: number, eventId?: string): void {
    const map = rm.getMap();
    if (map.length <= nodeIndex) {
      // Extend map with dummy nodes
      while (map.length <= nodeIndex) {
        map.push({
          index: map.length,
          type: 'battle',
          completed: false,
          connections: [],
        });
      }
    }
    map[nodeIndex] = {
      index: nodeIndex,
      type: 'event',
      completed: false,
      connections: [],
      data: eventId ? { eventId } : undefined,
    };
    rm.setMap(map);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });
      expect(scene).toBeDefined();
    });

    it('init sets nodeIndex', () => {
      ensureEventNode(3, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 3 });
      expect((scene as any).nodeIndex).toBe(3);
    });

    it('defaults nodeIndex to 0', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, {});
      expect((scene as any).nodeIndex).toBe(0);
    });
  });

  describe('event selection', () => {
    it('uses the event assigned by MapGenerator when eventId is present', () => {
      ensureEventNode(0, 'mysterious_fountain');
      // Scene creates without error — event was found
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });
      expect(scene).toBeDefined();
    });

    it('falls back to random event when eventId is missing', () => {
      ensureEventNode(0);
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });
      expect(scene).toBeDefined();
    });

    it('falls back to random event when eventId is invalid', () => {
      ensureEventNode(0, 'nonexistent_event_id_xyz');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });
      expect(scene).toBeDefined();
    });
  });

  describe('makeChoice', () => {
    it('gold effect adds gold to RunManager', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const initialGold = rm.getGold();

      // Directly call makeChoice with a mock choice that gives gold
      const mockChoice = {
        text: 'Test',
        outcomes: [{
          probability: 1.0,
          description: 'You found gold',
          effects: [{ type: 'gold' as const, value: 50 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      expect(rm.getGold()).toBe(initialGold + 50);
    });

    it('heal effect heals all heroes', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      // Damage heroes first
      rm.damageAllHeroes(20);
      const damagedHp = rm.getHeroes().map(h => h.currentHp);

      const mockChoice = {
        text: 'Heal',
        outcomes: [{
          probability: 1.0,
          description: 'Healed',
          effects: [{ type: 'heal' as const, value: 10 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      // Heroes should have more HP now
      rm.getHeroes().forEach((h, i) => {
        expect(h.currentHp).toBeGreaterThanOrEqual(damagedHp[i]);
      });
    });

    it('damage effect damages all heroes', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const beforeHps = rm.getHeroes().map(h => h.currentHp);

      const mockChoice = {
        text: 'Risk',
        outcomes: [{
          probability: 1.0,
          description: 'Ouch',
          effects: [{ type: 'damage' as const, value: 15 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      rm.getHeroes().forEach((h, i) => {
        expect(h.currentHp).toBeLessThanOrEqual(beforeHps[i]);
      });
    });

    it('transform effect sets temporary element', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const mockChoice = {
        text: 'Transform',
        outcomes: [{
          probability: 1.0,
          description: 'Transformed',
          effects: [{ type: 'transform' as const, value: 0, element: 'dark' }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      // At least one hero should have temporaryElement set
      const hasTemp = rm.getHeroes().some(h => (h as any).temporaryElement != null);
      expect(hasTemp).toBe(true);
    });

    it('sacrifice effect removes a hero when more than 1', () => {
      ensureEventNode(0, 'mysterious_fountain');

      // Add extra hero so we have >1
      rm.addHero('mage');
      const heroesBefore = rm.getHeroes().length;

      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const mockChoice = {
        text: 'Sacrifice',
        outcomes: [{
          probability: 1.0,
          description: 'Sacrificed',
          effects: [{ type: 'sacrifice' as const, value: 0 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      expect(rm.getHeroes().length).toBe(heroesBefore - 1);
    });

    it('sacrifice effect does not remove last hero', () => {
      ensureEventNode(0, 'mysterious_fountain');

      // Ensure only 1 hero
      while (rm.getHeroes().length > 1) {
        rm.removeHero(rm.getHeroes()[rm.getHeroes().length - 1].id);
      }
      expect(rm.getHeroes().length).toBe(1);

      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const mockChoice = {
        text: 'Sacrifice',
        outcomes: [{
          probability: 1.0,
          description: 'Sacrificed',
          effects: [{ type: 'sacrifice' as const, value: 0 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      // Still have at least 1 hero
      expect(rm.getHeroes().length).toBe(1);
    });

    it('recruit effect adds a hero', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const heroesBefore = rm.getHeroes().length;

      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const mockChoice = {
        text: 'Recruit',
        outcomes: [{
          probability: 1.0,
          description: 'Recruited',
          effects: [{ type: 'recruit' as const, value: 0, heroId: 'mage' }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      expect(rm.getHeroes().length).toBe(heroesBefore + 1);
    });

    it('marks node as completed after choice', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      const mockChoice = {
        text: 'Test',
        outcomes: [{
          probability: 1.0,
          description: 'Done',
          effects: [{ type: 'gold' as const, value: 10 }],
        }],
      };
      (scene as any).makeChoice(mockChoice, rm.getRng(), rm);

      expect(rm.getMap()[0].completed).toBe(true);
    });
  });

  describe('showOutcome', () => {
    it('renders outcome description text', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      (scene as any).showOutcome({
        description: '测试结果描述',
        effects: [{ type: 'gold', value: 50 }],
      });
      // No errors thrown
    });

    it('handles empty effects list', () => {
      ensureEventNode(0, 'mysterious_fountain');
      const scene = SceneTestHarness.createScene(EventScene, { nodeIndex: 0 });

      (scene as any).showOutcome({
        description: 'Nothing happened',
        effects: [],
      });
    });
  });
});

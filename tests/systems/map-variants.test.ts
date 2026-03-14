import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SeededRNG } from '../../src/utils/rng';
import { MapNode } from '../../src/types';
import { MAP_HIDDEN_NODE_COST } from '../../src/constants';

describe('Map Variants', () => {
  function generateMapWithSeed(seed: number): MapNode[] {
    const rng = new SeededRNG(seed);
    return MapGenerator.generate(rng, 1);
  }

  describe('shortcuts', () => {
    it('shortcut connections are stored in shortcutConnections field', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hasShortcut = map.some(n => (n.shortcutConnections?.length ?? 0) > 0);
        if (hasShortcut) {
          const node = map.find(n => (n.shortcutConnections?.length ?? 0) > 0)!;
          expect(node.shortcutConnections!.length).toBeGreaterThan(0);
          for (const targetIdx of node.shortcutConnections!) {
            expect(targetIdx).toBeLessThan(map.length);
            expect(targetIdx).toBeGreaterThanOrEqual(0);
          }
          return;
        }
      }
      expect.fail('No shortcut found in 200 seeds');
    });

    it('shortcuts do not target boss nodes', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        for (const node of map) {
          if (!node.shortcutConnections?.length) continue;
          for (const targetIdx of node.shortcutConnections) {
            expect(map[targetIdx].type, `Seed ${seed}: shortcut targets boss`).not.toBe('boss');
          }
        }
      }
    });

    it('shortcuts are not in regular connections', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        for (const node of map) {
          if (!node.shortcutConnections?.length) continue;
          for (const sc of node.shortcutConnections) {
            expect(node.connections).not.toContain(sc);
          }
        }
      }
    });
  });

  describe('hidden nodes', () => {
    it('hidden nodes have hidden=true and revealCost', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          expect(hiddenNode.revealCost).toBe(MAP_HIDDEN_NODE_COST);
          expect(['event', 'shop']).toContain(hiddenNode.type);
          expect(hiddenNode.completed).toBe(false);
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('hidden nodes have forward connections (not dead ends)', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          expect(hiddenNode.connections.length).toBeGreaterThan(0);
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('hidden nodes are reachable from a parent node', () => {
      for (let seed = 1; seed <= 200; seed++) {
        const map = generateMapWithSeed(seed);
        const hiddenNode = map.find(n => n.hidden === true);
        if (hiddenNode) {
          const parent = map.find(n => !n.hidden && n.connections.includes(hiddenNode.index));
          expect(parent, 'Hidden node has no parent').toBeDefined();
          return;
        }
      }
      expect.fail('No hidden node found in 200 seeds');
    });

    it('same seed produces same map (deterministic)', () => {
      const map1 = generateMapWithSeed(42);
      const map2 = generateMapWithSeed(42);
      expect(map1.length).toBe(map2.length);
      for (let i = 0; i < map1.length; i++) {
        expect(map1[i].type).toBe(map2[i].type);
        expect(map1[i].hidden).toBe(map2[i].hidden);
        expect(map1[i].connections).toEqual(map2[i].connections);
        expect(map1[i].shortcutConnections).toEqual(map2[i].shortcutConnections);
      }
    });
  });
});

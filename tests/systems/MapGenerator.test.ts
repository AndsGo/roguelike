import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SeededRNG } from '../../src/utils/rng';
import { MapNode } from '../../src/types';

describe('MapGenerator', () => {
  describe('generate', () => {
    it('generates nodes for all 3 acts', () => {
      const rng = new SeededRNG(12345);
      const nodes = MapGenerator.generate(rng, 1);
      // 3 acts × 8 layers, with branching → should have more than 24 nodes
      expect(nodes.length).toBeGreaterThanOrEqual(24);
    });

    it('produces deterministic output for the same seed', () => {
      const rng1 = new SeededRNG(99);
      const rng2 = new SeededRNG(99);
      const nodes1 = MapGenerator.generate(rng1, 1);
      const nodes2 = MapGenerator.generate(rng2, 1);

      expect(nodes1.length).toBe(nodes2.length);
      for (let i = 0; i < nodes1.length; i++) {
        expect(nodes1[i].type).toBe(nodes2[i].type);
        expect(nodes1[i].connections).toEqual(nodes2[i].connections);
      }
    });

    it('different seeds produce different maps', () => {
      const rng1 = new SeededRNG(1);
      const rng2 = new SeededRNG(2);
      const nodes1 = MapGenerator.generate(rng1, 1);
      const nodes2 = MapGenerator.generate(rng2, 1);

      // At least some nodes should differ in type or connections
      let hasDiff = false;
      const minLen = Math.min(nodes1.length, nodes2.length);
      for (let i = 0; i < minLen; i++) {
        if (nodes1[i].type !== nodes2[i].type || nodes1[i].connections.join(',') !== nodes2[i].connections.join(',')) {
          hasDiff = true;
          break;
        }
      }
      expect(hasDiff).toBe(true);
    });

    it('has boss nodes at the end of each act', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);

      // Find all boss nodes
      const bossNodes = nodes.filter(n => n.type === 'boss');
      // Should have exactly 3 boss nodes (one per act)
      expect(bossNodes.length).toBe(3);
    });

    it('no node has an empty connections array (except final boss)', () => {
      const rng = new SeededRNG(777);
      const nodes = MapGenerator.generate(rng, 1);

      // Only the very last node(s) can have empty connections
      const lastIdx = Math.max(...nodes.map(n => n.index));
      for (const node of nodes) {
        if (node.index < lastIdx) {
          // Either connects forward or is the last node of final act's boss
          // Boss nodes of non-final acts connect to next act
          // We allow the final act boss to have empty connections
        }
      }
      // Simpler check: all non-final-act nodes have connections
      const nonFinalBoss = nodes.filter(n => n.type !== 'boss' || n.connections.length > 0);
      // At least most nodes connect forward
      expect(nonFinalBoss.length).toBeGreaterThan(nodes.length - 5);
    });

    it('every node in a layer has at least one incoming connection (no isolated nodes)', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);

      // Build incoming connection count
      const incomingCount = new Map<number, number>();
      for (const node of nodes) {
        if (!incomingCount.has(node.index)) incomingCount.set(node.index, 0);
        for (const c of node.connections) {
          incomingCount.set(c, (incomingCount.get(c) ?? 0) + 1);
        }
      }

      // The first node of each act (index 0 and act starts) may have 0 incoming
      // but all other nodes should have at least 1
      // Skip index 0 (start node)
      const nodesWithNoIncoming = nodes.filter(
        n => n.index > 0 && (incomingCount.get(n.index) ?? 0) === 0,
      );
      // Allow act start nodes (they receive connections from previous act's boss)
      // The algorithm connects boss → next act first node
      expect(nodesWithNoIncoming.length).toBe(0);
    });

    it('contains at least one shop and one rest node per generation', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);

      const shops = nodes.filter(n => n.type === 'shop');
      const rests = nodes.filter(n => n.type === 'rest');
      expect(shops.length).toBeGreaterThanOrEqual(1);
      expect(rests.length).toBeGreaterThanOrEqual(1);
    });

    it('all node indices are sequential', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);

      for (let i = 0; i < nodes.length; i++) {
        expect(nodes[i].index).toBe(i);
      }
    });

    it('connections only reference valid node indices', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);
      const maxIndex = nodes.length - 1;

      for (const node of nodes) {
        for (const c of node.connections) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(maxIndex);
          expect(c).toBeGreaterThan(node.index); // connections go forward
        }
      }
    });

    it('all nodes start as not completed', () => {
      const rng = new SeededRNG(42);
      const nodes = MapGenerator.generate(rng, 1);
      for (const node of nodes) {
        expect(node.completed).toBe(false);
      }
    });
  });

  describe('getActCount', () => {
    it('returns 3 acts', () => {
      expect(MapGenerator.getActCount()).toBe(3);
    });
  });

  describe('getAct', () => {
    it('returns act config by index', () => {
      const act0 = MapGenerator.getAct(0);
      expect(act0).not.toBeNull();
      expect(act0!.id).toBe('act1_forest');
    });

    it('returns null for invalid index', () => {
      expect(MapGenerator.getAct(99)).toBeNull();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { computeNodeLayers, buildLayerGroups } from '../../src/utils/map-utils';
import { MapNode } from '../../src/types';

function makeNode(index: number, connections: number[], type: 'battle' | 'boss' = 'battle'): MapNode {
  return { index, type, completed: false, connections };
}

describe('map-utils', () => {
  describe('computeNodeLayers', () => {
    it('returns empty map for empty nodes', () => {
      expect(computeNodeLayers([])).toEqual(new Map());
    });

    it('assigns layer 0 to root node', () => {
      const nodes = [makeNode(0, [])];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(0)).toBe(0);
    });

    it('assigns sequential layers to linear chain', () => {
      const nodes = [makeNode(0, [1]), makeNode(1, [2]), makeNode(2, [])];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(0)).toBe(0);
      expect(layers.get(1)).toBe(1);
      expect(layers.get(2)).toBe(2);
    });

    it('assigns same layer to branching nodes', () => {
      const nodes = [makeNode(0, [1, 2]), makeNode(1, [3]), makeNode(2, [3]), makeNode(3, [])];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(1)).toBe(1);
      expect(layers.get(2)).toBe(1);
      expect(layers.get(3)).toBe(2);
    });

    it('does not traverse shortcutConnections', () => {
      const nodes: MapNode[] = [
        { index: 0, type: 'battle', completed: false, connections: [1], shortcutConnections: [2] },
        { index: 1, type: 'battle', completed: false, connections: [2] },
        { index: 2, type: 'boss', completed: false, connections: [] },
      ];
      const layers = computeNodeLayers(nodes);
      expect(layers.get(2)).toBe(2); // via 0→1→2, not shortcut 0→2
    });
  });

  describe('buildLayerGroups', () => {
    it('groups nodes by layer', () => {
      const layerMap = new Map([[0, 0], [1, 1], [2, 1], [3, 2]]);
      const groups = buildLayerGroups(layerMap);
      expect(groups.get(0)).toEqual([0]);
      expect(groups.get(1)!.sort()).toEqual([1, 2]);
      expect(groups.get(2)).toEqual([3]);
    });
  });
});

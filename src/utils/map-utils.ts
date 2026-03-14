import { MapNode } from '../types';

/**
 * BFS layer computation. Only traverses `connections`, not `shortcutConnections`.
 * Returns nodeIndex → layerIndex mapping.
 */
export function computeNodeLayers(nodes: MapNode[]): Map<number, number> {
  const layerMap = new Map<number, number>();
  if (nodes.length === 0) return layerMap;

  layerMap.set(0, 0);
  const queue = [0];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layerMap.get(current)!;

    for (const nextIdx of nodes[current].connections) {
      if (nextIdx < nodes.length && !layerMap.has(nextIdx)) {
        layerMap.set(nextIdx, currentLayer + 1);
        queue.push(nextIdx);
      }
    }
  }

  return layerMap;
}

/**
 * Invert layerMap: returns layerIndex → nodeIndex[] mapping.
 */
export function buildLayerGroups(layerMap: Map<number, number>): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  for (const [nodeIdx, layerIdx] of layerMap) {
    if (!groups.has(layerIdx)) groups.set(layerIdx, []);
    groups.get(layerIdx)!.push(nodeIdx);
  }
  return groups;
}

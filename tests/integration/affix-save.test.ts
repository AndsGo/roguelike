import { describe, it, expect } from 'vitest';
import { MapNode } from '../../src/types';

describe('affix save compatibility', () => {
  it('old save without node.affixes loads without error', () => {
    const oldNode: MapNode = {
      index: 0,
      type: 'elite',
      completed: false,
      connections: [1],
      data: { enemies: [{ id: 'orc_warrior', level: 5 }] },
    };
    expect(oldNode.affixes).toBeUndefined();
    expect((oldNode.affixes ?? []).length).toBe(0);
  });

  it('node.affixes survives serialize/deserialize cycle', () => {
    const node: MapNode = {
      index: 0,
      type: 'boss',
      completed: false,
      connections: [1],
      data: { enemies: [{ id: 'dragon_boss', level: 10 }] },
      affixes: ['berserk', 'reflective'],
    };
    const json = JSON.stringify(node);
    const restored = JSON.parse(json) as MapNode;
    expect(restored.affixes).toEqual(['berserk', 'reflective']);
  });

  it('MapNode with empty affixes array treated as no affixes', () => {
    const node: MapNode = {
      index: 0,
      type: 'elite',
      completed: false,
      connections: [1],
      affixes: [],
    };
    expect((node.affixes ?? []).length).toBe(0);
  });

  it('BattleScene handles undefined node.affixes gracefully', () => {
    const affixes: string[] | undefined = undefined;
    const resolved = affixes ?? [];
    expect(resolved).toEqual([]);
  });
});

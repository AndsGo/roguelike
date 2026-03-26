import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SeededRNG } from '../../src/utils/rng';

describe('MapGenerator affix assignment', () => {
  it('normal difficulty: elite gets 0 affixes, boss gets 1', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'normal');
    const elites = nodes.filter(n => n.type === 'elite');
    const bosses = nodes.filter(n => n.type === 'boss');
    for (const elite of elites) {
      expect((elite.affixes ?? []).length).toBe(0);
    }
    for (const boss of bosses) {
      expect((boss.affixes ?? []).length).toBe(1);
    }
  });

  it('hell difficulty: elite gets 2 affixes, boss gets 2', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');
    const elites = nodes.filter(n => n.type === 'elite');
    const bosses = nodes.filter(n => n.type === 'boss');
    for (const elite of elites) {
      expect((elite.affixes ?? []).length).toBe(2);
    }
    for (const boss of bosses) {
      expect((boss.affixes ?? []).length).toBe(2);
    }
  });

  it('battle nodes never receive affixes', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');
    const battles = nodes.filter(n => n.type === 'battle');
    for (const battle of battles) {
      expect(battle.affixes).toBeUndefined();
    }
  });

  it('same seed produces same affix assignment', () => {
    const nodes1 = MapGenerator.generate(new SeededRNG(123), 1, 'hard');
    const nodes2 = MapGenerator.generate(new SeededRNG(123), 1, 'hard');
    const elites1 = nodes1.filter(n => n.type === 'elite').map(n => n.affixes);
    const elites2 = nodes2.filter(n => n.type === 'elite').map(n => n.affixes);
    expect(elites1).toEqual(elites2);
  });

  it('no duplicate affixes on same node', () => {
    const rng = new SeededRNG(42);
    const nodes = MapGenerator.generate(rng, 1, 'hell');
    const affixedNodes = nodes.filter(n => n.affixes && n.affixes.length > 1);
    for (const node of affixedNodes) {
      const unique = new Set(node.affixes);
      expect(unique.size).toBe(node.affixes!.length);
    }
  });
});

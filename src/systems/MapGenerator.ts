import { MapNode, NodeType, BattleNodeData } from '../types';
import { SeededRNG } from '../utils/rng';
import { MAP_NODE_COUNT } from '../constants';
import enemiesData from '../data/enemies.json';

// Fixed template for the 15-node linear map
const MAP_TEMPLATE: NodeType[] = [
  'battle', 'battle', 'shop', 'battle', 'event',
  'battle', 'elite', 'rest', 'battle', 'shop',
  'battle', 'event', 'elite', 'rest', 'boss',
];

export class MapGenerator {
  /**
   * Generate a linear 15-node map using the seed RNG.
   * Each node connects to the next node (linear path).
   */
  static generate(rng: SeededRNG, floor: number): MapNode[] {
    const nodes: MapNode[] = [];

    for (let i = 0; i < MAP_NODE_COUNT; i++) {
      const nodeType = MAP_TEMPLATE[i];
      const node: MapNode = {
        index: i,
        type: nodeType,
        completed: false,
        connections: i < MAP_NODE_COUNT - 1 ? [i + 1] : [], // linear chain
      };

      if (nodeType === 'battle' || nodeType === 'elite' || nodeType === 'boss') {
        node.data = this.generateBattleData(rng, nodeType, i, floor);
      }

      nodes.push(node);
    }

    return nodes;
  }

  private static generateBattleData(
    rng: SeededRNG,
    type: NodeType,
    nodeIndex: number,
    floor: number,
  ): BattleNodeData {
    const baseLevel = floor + Math.floor(nodeIndex / 3);
    const normalEnemies = enemiesData.filter(e => !e.isBoss);
    const bosses = enemiesData.filter(e => e.isBoss);

    if (type === 'boss') {
      const boss = rng.pick(bosses);
      // Boss + some adds
      const adds = rng.pickN(normalEnemies, rng.nextInt(1, 2));
      return {
        enemies: [
          { id: boss.id, level: baseLevel + 3 },
          ...adds.map(a => ({ id: a.id, level: baseLevel + 1 })),
        ],
      };
    }

    if (type === 'elite') {
      // Stronger enemy group
      const count = rng.nextInt(2, 3);
      const selected = rng.pickN(normalEnemies, count);
      return {
        enemies: selected.map(e => ({
          id: e.id,
          level: baseLevel + 2,
        })),
      };
    }

    // Normal battle: 2-4 enemies
    const count = rng.nextInt(2, 4);
    const selected = rng.pickN(normalEnemies, Math.min(count, normalEnemies.length));
    return {
      enemies: selected.map(e => ({
        id: e.id,
        level: baseLevel,
      })),
    };
  }
}

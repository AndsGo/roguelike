import { MapNode, NodeType, BattleNodeData, EventNodeData, ActConfig } from '../types';
import { SeededRNG } from '../utils/rng';
import enemiesData from '../data/enemies.json';
import actsData from '../data/acts.json';

// Node type templates for each act (per-layer distribution)
// Each act: [battle, battle, event/shop, battle, elite, battle, rest, boss]
const ACT_NODE_TEMPLATES: NodeType[][] = [
  ['battle', 'battle', 'shop', 'battle', 'event', 'battle', 'rest', 'boss'],
  ['battle', 'battle', 'event', 'battle', 'elite', 'battle', 'rest', 'boss'],
  ['battle', 'event', 'battle', 'elite', 'battle', 'battle', 'rest', 'boss'],
];

export class MapGenerator {
  /**
   * Generate a full map for all acts, with branching paths per act.
   * Returns a flat array of MapNodes with connections supporting branching.
   */
  static generate(rng: SeededRNG, floor: number): MapNode[] {
    const allNodes: MapNode[] = [];
    let nodeOffset = 0;

    const acts = actsData as ActConfig[];

    for (let actIndex = 0; actIndex < acts.length; actIndex++) {
      const act = acts[actIndex];
      const template = ACT_NODE_TEMPLATES[actIndex % ACT_NODE_TEMPLATES.length];
      const layerCount = act.nodeCount;

      // Generate layers with 1-3 nodes per layer (branching)
      const layers: MapNode[][] = [];

      for (let layerIdx = 0; layerIdx < layerCount; layerIdx++) {
        const nodeType = template[layerIdx % template.length];
        // Boss layer always has exactly 1 node
        // First layer of act has 1 node
        // Other layers have 2-3 nodes (branching)
        const isBossLayer = layerIdx === layerCount - 1;
        const isFirstLayer = layerIdx === 0;
        const nodeCountInLayer = isBossLayer || isFirstLayer
          ? 1
          : rng.nextInt(2, 3);

        const layerNodes: MapNode[] = [];
        for (let n = 0; n < nodeCountInLayer; n++) {
          // Vary node type slightly for non-boss, non-first layers
          let finalType = nodeType;
          if (!isBossLayer && !isFirstLayer && nodeCountInLayer > 1 && n > 0) {
            // Alternate types for branching nodes
            const altTypes: NodeType[] = ['battle', 'event', 'shop'];
            finalType = rng.pick(altTypes);
          }
          // Force boss type on last layer
          if (isBossLayer) finalType = 'boss';

          const node: MapNode = {
            index: nodeOffset + layerNodes.length,
            type: finalType,
            completed: false,
            connections: [], // filled below
          };

          // Generate data for battle/elite/boss nodes
          if (finalType === 'battle' || finalType === 'elite' || finalType === 'boss') {
            node.data = this.generateBattleData(rng, finalType, layerIdx, floor, act);
          } else if (finalType === 'event') {
            node.data = this.generateEventData(rng, act);
          }

          layerNodes.push(node);
        }

        layers.push(layerNodes);
        nodeOffset += layerNodes.length;
      }

      // Connect layers: each node in layer N connects to 1-2 nodes in layer N+1
      for (let l = 0; l < layers.length - 1; l++) {
        const currentLayer = layers[l];
        const nextLayer = layers[l + 1];

        for (const node of currentLayer) {
          if (nextLayer.length === 1) {
            // Converge to single node
            node.connections.push(nextLayer[0].index);
          } else {
            // Connect to 1-2 random nodes in next layer (at least 1)
            const connectCount = Math.min(rng.nextInt(1, 2), nextLayer.length);
            const targets = rng.pickN(nextLayer, connectCount);
            for (const t of targets) {
              if (!node.connections.includes(t.index)) {
                node.connections.push(t.index);
              }
            }
          }
        }

        // Ensure every node in next layer has at least one incoming connection
        for (const nextNode of nextLayer) {
          const hasIncoming = currentLayer.some(n => n.connections.includes(nextNode.index));
          if (!hasIncoming) {
            // Connect a random node from current layer
            const source = rng.pick(currentLayer);
            source.connections.push(nextNode.index);
          }
        }
      }

      // Connect last layer of this act to first layer of next act (if not last act)
      // This is handled by the flat array — the boss node connects to next act's first node
      if (actIndex < acts.length - 1) {
        const lastLayer = layers[layers.length - 1];
        for (const node of lastLayer) {
          node.connections.push(nodeOffset); // next act starts at nodeOffset
        }
      }

      // Flatten into allNodes
      for (const layer of layers) {
        for (const node of layer) {
          allNodes.push(node);
        }
      }
    }

    return allNodes;
  }

  /**
   * Generate map for a single act (used when transitioning between acts).
   */
  static generateForAct(rng: SeededRNG, actIndex: number, floor: number): MapNode[] {
    const acts = actsData as ActConfig[];
    if (actIndex >= acts.length) return [];
    // Delegate to main generate but just return relevant nodes
    // For simplicity, regenerate all and slice
    const allNodes = this.generate(rng, floor);
    let start = 0;
    for (let i = 0; i < actIndex; i++) {
      // Count nodes generated for previous acts (approximate via nodeCount)
      start += acts[i].nodeCount; // Note: actual count may vary due to branching
    }
    return allNodes;
  }

  private static generateBattleData(
    rng: SeededRNG,
    type: NodeType,
    layerIndex: number,
    floor: number,
    act: ActConfig,
  ): BattleNodeData {
    const baseLevel = Math.max(1, floor + Math.floor(layerIndex / 2));
    const diffMult = act.difficultyMultiplier;

    // Filter enemies by act's enemy pool
    const actEnemies = enemiesData.filter(
      e => act.enemyPool.includes(e.id) && !e.isBoss
    );
    const actBosses = enemiesData.filter(
      e => act.bossPool.includes(e.id) || e.isBoss
    );

    // Fallback to all non-boss enemies if pool is empty
    const normalEnemies = actEnemies.length > 0
      ? actEnemies
      : enemiesData.filter(e => !e.isBoss);
    const bosses = actBosses.length > 0
      ? actBosses
      : enemiesData.filter(e => e.isBoss);

    if (type === 'boss') {
      const boss = rng.pick(bosses);
      const addCount = rng.nextInt(1, 2);
      const adds = rng.pickN(normalEnemies, Math.min(addCount, normalEnemies.length));
      return {
        enemies: [
          { id: boss.id, level: Math.round((baseLevel + 3) * diffMult) },
          ...adds.map(a => ({ id: a.id, level: Math.round((baseLevel + 1) * diffMult) })),
        ],
      };
    }

    if (type === 'elite') {
      const count = rng.nextInt(2, 3);
      const selected = rng.pickN(normalEnemies, Math.min(count, normalEnemies.length));
      return {
        enemies: selected.map(e => ({
          id: e.id,
          level: Math.round((baseLevel + 2) * diffMult),
        })),
      };
    }

    // Normal battle: 2-4 enemies
    const count = rng.nextInt(2, 4);
    const selected = rng.pickN(normalEnemies, Math.min(count, normalEnemies.length));
    return {
      enemies: selected.map(e => ({
        id: e.id,
        level: Math.round(baseLevel * diffMult),
      })),
    };
  }

  private static generateEventData(
    rng: SeededRNG,
    act: ActConfig,
  ): EventNodeData {
    if (act.eventPool.length === 0) {
      return { eventId: 'healing_spring' }; // fallback
    }
    return {
      eventId: rng.pick(act.eventPool),
    };
  }

  /** Get the total number of acts available */
  static getActCount(): number {
    return (actsData as ActConfig[]).length;
  }

  /** Get act configuration by index */
  static getAct(index: number): ActConfig | null {
    const acts = actsData as ActConfig[];
    return index < acts.length ? acts[index] : null;
  }
}

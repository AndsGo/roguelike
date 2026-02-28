import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { MapNode, NodeType, ActConfig, HeroState, HeroData } from '../types';
import { Theme, colorToString } from './Theme';
import { UI, SLOT_LABELS } from '../i18n';

export const NODE_COLORS: Record<NodeType, number> = Theme.colors.node as Record<NodeType, number>;

export const NODE_LABELS: Record<NodeType, string> = {
  battle: '\u2694',
  elite: '\u2605',
  boss: '\u2620',
  shop: '\u2666',
  event: '?',
  rest: '\u2665',
};

export const ACT_COLORS: number[] = [0x1a2a1e, 0x2a1a1a, 0x1a1a2a];

export interface LayerInfo {
  layerIndex: number;
  actIndex: number;
  nodes: MapNode[];
}

/**
 * Extracted rendering helpers for MapScene.
 * Handles pure drawing of map elements without scene interaction logic.
 */
export class MapRenderer {
  /** Build layer structure from node graph via BFS. */
  static buildLayers(map: MapNode[], acts: ActConfig[]): LayerInfo[] {
    const layers: LayerInfo[] = [];
    const nodeLayer = new Map<number, number>();
    const nodeAct = new Map<number, number>();
    const queue: { idx: number; layer: number; act: number }[] = [{ idx: 0, layer: 0, act: 0 }];
    nodeLayer.set(0, 0);
    nodeAct.set(0, 0);

    while (queue.length > 0) {
      const { idx, layer, act } = queue.shift()!;
      const node = map[idx];

      for (const connIdx of node.connections) {
        if (connIdx < map.length && !nodeLayer.has(connIdx)) {
          let nextAct = act;
          if (node.type === 'boss') {
            nextAct = act + 1;
          }
          nodeLayer.set(connIdx, layer + 1);
          nodeAct.set(connIdx, Math.min(nextAct, acts.length - 1));
          queue.push({ idx: connIdx, layer: layer + 1, act: nextAct });
        }
      }
    }

    for (let i = 0; i < map.length; i++) {
      if (!nodeLayer.has(i)) {
        nodeLayer.set(i, i);
        nodeAct.set(i, 0);
      }
    }

    const layerMap = new Map<number, MapNode[]>();
    for (const node of map) {
      const l = nodeLayer.get(node.index) ?? 0;
      if (!layerMap.has(l)) layerMap.set(l, []);
      layerMap.get(l)!.push(node);
    }

    const sortedLayers = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [layerIdx, nodes] of sortedLayers) {
      const actIndex = nodeAct.get(nodes[0].index) ?? 0;
      layers.push({ layerIndex: layerIdx, actIndex, nodes });
    }

    return layers;
  }

  /** Draw a curved connection line between two points. */
  static drawCurvedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    if (Math.abs(y1 - y2) < 2) {
      g.lineBetween(x1, y1, x2, y2);
    } else {
      g.beginPath();
      g.moveTo(x1, y1);
      const cp1x = x1 + (x2 - x1) * 0.4;
      const cp2x = x1 + (x2 - x1) * 0.6;
      // Manual bezier curve (Phaser Graphics doesn't have bezierCurveTo)
      const steps = 8;
      for (let t = 1; t <= steps; t++) {
        const p = t / steps;
        const ip = 1 - p;
        const px = ip * ip * ip * x1 + 3 * ip * ip * p * cp1x + 3 * ip * p * p * cp2x + p * p * p * x2;
        const py = ip * ip * ip * y1 + 3 * ip * ip * p * y1 + 3 * ip * p * p * y2 + p * p * p * y2;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /** Draw act background panels. */
  static drawActBackgrounds(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    layers: LayerInfo[],
    acts: ActConfig[],
    layerSpacing: number,
    startX: number,
    headerHeight: number,
    mapAreaHeight: number,
  ): void {
    for (let actIdx = 0; actIdx < acts.length; actIdx++) {
      const actLayers = layers.filter(l => l.actIndex === actIdx);
      if (actLayers.length === 0) continue;

      const firstLayerX = startX + actLayers[0].layerIndex * layerSpacing - layerSpacing / 2;
      const lastLayerX = startX + actLayers[actLayers.length - 1].layerIndex * layerSpacing + layerSpacing / 2;
      const actWidth = lastLayerX - firstLayerX;

      const actBg = scene.add.graphics();
      actBg.fillStyle(ACT_COLORS[actIdx % ACT_COLORS.length], 0.45);
      actBg.fillRoundedRect(firstLayerX, headerHeight, actWidth, mapAreaHeight, 4);

      const stripeG = scene.add.graphics();
      stripeG.lineStyle(1, ACT_COLORS[actIdx % ACT_COLORS.length], 0.15);
      for (let sy = headerHeight + 20; sy < headerHeight + mapAreaHeight - 10; sy += 12) {
        stripeG.lineBetween(firstLayerX + 4, sy, firstLayerX + actWidth - 4, sy);
      }
      container.add(stripeG);

      actBg.lineStyle(1, ACT_COLORS[actIdx % ACT_COLORS.length], 0.6);
      actBg.strokeRoundedRect(firstLayerX, headerHeight, actWidth, mapAreaHeight, 4);
      container.add(actBg);

      const actLabelX = firstLayerX + actWidth / 2;
      const actLabel = scene.add.text(actLabelX, headerHeight + 8, UI.map.actLabel(actIdx + 1, acts[actIdx].name), {
        fontSize: '11px',
        color: '#8899bb',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(actLabel);
    }
  }

  /** Draw hero summary panel at the bottom of the scene. */
  static drawHeroSummary(
    scene: Phaser.Scene,
    heroes: HeroState[],
    getHeroData: (id: string) => HeroData,
    getMaxHp: (hero: HeroState, data: HeroData) => number,
  ): void {
    const totalWidth = heroes.length * 80;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const panelY = GAME_HEIGHT - 70;

    const panelBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    panelBg.fillStyle(Theme.colors.panel, 0.85);
    panelBg.fillRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);
    panelBg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    panelBg.strokeRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);

    heroes.forEach((hero, i) => {
      const data = getHeroData(hero.id);
      const x = startX + i * 80 + 40;
      const y = panelY + 12;

      const roleColor = Theme.colors.role[data.role] ?? 0x888888;
      const bar = scene.add.graphics().setScrollFactor(0).setDepth(101);
      bar.fillStyle(roleColor, 0.6);
      bar.fillRoundedRect(x - 30, y, 60, 3, 2);

      scene.add.text(x, y + 10, data.name, {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      scene.add.text(x, y + 22, `Lv.${hero.level}`, {
        fontSize: '9px', color: colorToString(Theme.colors.secondary), fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      const maxHp = getMaxHp(hero, data);
      const hpRatio = hero.currentHp / maxHp;
      const hpBarWidth = 54;
      const hpG = scene.add.graphics().setScrollFactor(0).setDepth(101);
      hpG.fillStyle(0x333333, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth, 4, 2);
      const hpColor = hpRatio > 0.6 ? 0x44ff44 : hpRatio > 0.3 ? 0xffaa00 : 0xff4444;
      hpG.fillStyle(hpColor, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth * hpRatio, 4, 2);

      scene.add.text(x, y + 43, `${hero.currentHp}/${maxHp}`, {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    });
  }

  /** Draw interactive hero panel at the bottom. Returns hit zones for scene management. */
  static drawInteractiveHeroPanel(
    scene: Phaser.Scene,
    heroes: HeroState[],
    getHeroData: (id: string) => HeroData,
    getMaxHp: (hero: HeroState, data: HeroData) => number,
    onHeroClick: (heroState: HeroState, heroData: HeroData) => void,
  ): Phaser.GameObjects.GameObject[] {
    const interactiveObjects: Phaser.GameObjects.GameObject[] = [];
    const totalWidth = heroes.length * 80;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const panelY = GAME_HEIGHT - 70;

    const panelBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    panelBg.fillStyle(Theme.colors.panel, 0.85);
    panelBg.fillRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);
    panelBg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    panelBg.strokeRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);
    interactiveObjects.push(panelBg);

    heroes.forEach((hero, i) => {
      const data = getHeroData(hero.id);
      const x = startX + i * 80 + 40;
      const y = panelY + 12;

      // Role color bar
      const roleColor = Theme.colors.role[data.role] ?? 0x888888;
      const bar = scene.add.graphics().setScrollFactor(0).setDepth(101);
      bar.fillStyle(roleColor, 0.6);
      bar.fillRoundedRect(x - 30, y, 60, 3, 2);
      interactiveObjects.push(bar);

      // Name
      scene.add.text(x, y + 10, data.name, {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      // Level
      scene.add.text(x, y + 22, `Lv.${hero.level}`, {
        fontSize: '9px', color: colorToString(Theme.colors.secondary), fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      // HP bar
      const maxHp = getMaxHp(hero, data);
      const hpRatio = hero.currentHp / maxHp;
      const hpBarWidth = 54;
      const hpG = scene.add.graphics().setScrollFactor(0).setDepth(101);
      hpG.fillStyle(0x333333, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth, 4, 2);
      const hpColor = hpRatio > 0.6 ? 0x44ff44 : hpRatio > 0.3 ? 0xffaa00 : 0xff4444;
      hpG.fillStyle(hpColor, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth * hpRatio, 4, 2);

      // Equipment indicators (3 small squares with Chinese labels)
      const slots = ['weapon', 'armor', 'accessory'] as const;
      const slotLabels = slots.map(s => (SLOT_LABELS[s] ?? s).charAt(0));
      for (let s = 0; s < slots.length; s++) {
        const sx = x - 20 + s * 14;
        const sy = y + 42;
        const hasEquip = hero.equipment[slots[s]] !== null;
        const eqG = scene.add.graphics().setScrollFactor(0).setDepth(101);
        eqG.fillStyle(hasEquip ? 0x44aa44 : 0x333333, hasEquip ? 0.8 : 0.5);
        eqG.fillRoundedRect(sx, sy, 10, 10, 1);
        const eqLabel = scene.add.text(sx + 5, sy + 5, slotLabels[s], {
          fontSize: '7px', color: hasEquip ? '#ffffff' : '#666666', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
        interactiveObjects.push(eqG, eqLabel);
      }

      // Clickable hit zone
      const hitZone = scene.add.rectangle(x, panelY + 32, 76, 60, 0x000000, 0)
        .setScrollFactor(0).setDepth(103)
        .setInteractive({ useHandCursor: true });
      interactiveObjects.push(hitZone);

      // Hover highlight
      const highlight = scene.add.graphics().setScrollFactor(0).setDepth(100).setAlpha(0);
      highlight.fillStyle(0xffffff, 0.08);
      highlight.fillRoundedRect(x - 38, panelY + 2, 76, 61, 4);
      interactiveObjects.push(highlight);

      hitZone.on('pointerover', () => highlight.setAlpha(1));
      hitZone.on('pointerout', () => highlight.setAlpha(0));
      hitZone.on('pointerup', () => onHeroClick(hero, data));
    });

    return interactiveObjects;
  }
}

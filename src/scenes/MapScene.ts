import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { MapGenerator } from '../systems/MapGenerator';
import { NodeType, MapNode, ActConfig } from '../types';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { Button } from '../ui/Button';
import actsData from '../data/acts.json';

const NODE_COLORS: Record<NodeType, number> = {
  battle: 0xcc4444,
  elite: 0xff8844,
  boss: 0xff2222,
  shop: 0x44cc44,
  event: 0x8844cc,
  rest: 0x4488cc,
};

const NODE_LABELS: Record<NodeType, string> = {
  battle: '\u2694',
  elite: '\u2605',
  boss: '\u2620',
  shop: '\u2666',
  event: '?',
  rest: '\u2665',
};

const ACT_COLORS: number[] = [0x1a2a1e, 0x2a1a1a, 0x1a1a2a];

interface LayerInfo {
  layerIndex: number;
  actIndex: number;
  nodes: MapNode[];
}

export class MapScene extends Phaser.Scene {
  private mapContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private dragStartX = 0;
  private scrollX = 0;
  private totalMapWidth = 0;
  private pendingActTransition: number | null = null;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data?: { showActTransition?: number }): void {
    this.pendingActTransition = data?.showActTransition ?? null;
  }

  create(): void {
    const rm = RunManager.getInstance();

    if (rm.getMap().length === 0) {
      const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
      rm.setMap(map);
    }

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background)
      .setScrollFactor(0)
      .setDepth(0);

    // Build layer structure from node graph
    const map = rm.getMap();
    const layers = this.buildLayers(map);
    const acts = actsData as ActConfig[];

    // Layout constants
    const layerSpacing = 100;
    const startX = 60;
    const headerHeight = 55;
    const heroPanelHeight = 75;
    const mapAreaHeight = GAME_HEIGHT - headerHeight - heroPanelHeight;
    const mapCenterY = headerHeight + mapAreaHeight / 2;

    // Calculate total width
    this.totalMapWidth = startX * 2 + (layers.length - 1) * layerSpacing;
    const needsScroll = this.totalMapWidth > GAME_WIDTH;

    // Create scrollable container for the map
    this.mapContainer = this.add.container(0, 0);

    // Draw act backgrounds
    for (let actIdx = 0; actIdx < acts.length; actIdx++) {
      const actLayers = layers.filter(l => l.actIndex === actIdx);
      if (actLayers.length === 0) continue;

      const firstLayerX = startX + actLayers[0].layerIndex * layerSpacing - layerSpacing / 2;
      const lastLayerX = startX + actLayers[actLayers.length - 1].layerIndex * layerSpacing + layerSpacing / 2;
      const actWidth = lastLayerX - firstLayerX;

      const actBg = this.add.graphics();
      actBg.fillStyle(ACT_COLORS[actIdx % ACT_COLORS.length], 0.3);
      actBg.fillRoundedRect(firstLayerX, headerHeight, actWidth, mapAreaHeight, 4);

      // Act border
      actBg.lineStyle(1, ACT_COLORS[actIdx % ACT_COLORS.length], 0.4);
      actBg.strokeRoundedRect(firstLayerX, headerHeight, actWidth, mapAreaHeight, 4);
      this.mapContainer.add(actBg);

      // Act label at top
      const actLabelX = firstLayerX + actWidth / 2;
      const actLabel = this.add.text(actLabelX, headerHeight + 8, `Act ${actIdx + 1}: ${acts[actIdx].name}`, {
        fontSize: '8px',
        color: '#667788',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.mapContainer.add(actLabel);
    }

    // Draw connections first (behind nodes)
    const connGraphics = this.add.graphics();
    this.mapContainer.add(connGraphics);

    const accessibleNodes = rm.getAccessibleNodes();
    const nodePositions = new Map<number, { x: number; y: number }>();

    // Calculate all node positions
    for (const layer of layers) {
      const x = startX + layer.layerIndex * layerSpacing;
      const nodeCount = layer.nodes.length;
      const spacing = Math.min(60, mapAreaHeight / (nodeCount + 1));

      for (let n = 0; n < nodeCount; n++) {
        const y = mapCenterY + (n - (nodeCount - 1) / 2) * spacing;
        nodePositions.set(layer.nodes[n].index, { x, y });
      }
    }

    // Draw connection lines
    for (const node of map) {
      const fromPos = nodePositions.get(node.index);
      if (!fromPos) continue;

      for (const connIdx of node.connections) {
        const toPos = nodePositions.get(connIdx);
        if (!toPos) continue;

        const isCompleted = node.completed;
        const isAccessiblePath = node.completed && accessibleNodes.includes(connIdx);

        if (isAccessiblePath) {
          // Glowing path to accessible nodes
          connGraphics.lineStyle(3, 0xffffff, 0.15);
          this.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
          connGraphics.lineStyle(2, 0x88aaff, 0.5);
          this.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        } else if (isCompleted) {
          connGraphics.lineStyle(2, 0x444466, 0.4);
          this.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        } else {
          connGraphics.lineStyle(1, 0x222244, 0.25);
          this.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        }
      }
    }

    // Draw nodes
    for (const node of map) {
      const pos = nodePositions.get(node.index);
      if (!pos) continue;

      const isAccessible = accessibleNodes.includes(node.index);
      const isCompleted = node.completed;
      const radius = node.type === 'boss' ? 16 : node.type === 'elite' ? 14 : 12;
      const color = NODE_COLORS[node.type];

      const g = this.add.graphics();

      if (isCompleted) {
        g.fillStyle(0x444455, 0.5);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(1, 0x555566, 0.5);
        g.strokeCircle(pos.x, pos.y, radius);
        // Checkmark
        g.lineStyle(2, 0x66ff66, 0.5);
        g.lineBetween(pos.x - 4, pos.y, pos.x - 1, pos.y + 3);
        g.lineBetween(pos.x - 1, pos.y + 3, pos.x + 5, pos.y - 4);
      } else if (isAccessible) {
        // Glow ring
        g.lineStyle(3, color, 0.3);
        g.strokeCircle(pos.x, pos.y, radius + 5);
        g.fillStyle(color, 1);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeCircle(pos.x, pos.y, radius);

        // Pulse animation
        this.tweens.add({
          targets: g,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        g.fillStyle(color, 0.25);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(1, color, 0.15);
        g.strokeCircle(pos.x, pos.y, radius);
      }

      this.mapContainer.add(g);

      // Node icon
      const labelAlpha = isCompleted ? 0.4 : isAccessible ? 1 : 0.25;
      const label = this.add.text(pos.x, pos.y, NODE_LABELS[node.type], {
        fontSize: node.type === 'boss' ? '12px' : '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);
      this.mapContainer.add(label);

      // Type name below
      const typeName = this.getNodeTypeName(node.type);
      const typeLabel = this.add.text(pos.x, pos.y + radius + 6, typeName, {
        fontSize: '7px',
        color: '#556677',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);
      this.mapContainer.add(typeLabel);

      // Make accessible nodes clickable
      if (isAccessible) {
        const hitArea = this.add.circle(pos.x, pos.y, radius + 6)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.01);
        this.mapContainer.add(hitArea);
        hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          // Only handle click if not dragging
          if (!this.isDragging) {
            this.selectNode(node.index);
          }
        });
      }
    }

    // Fixed UI elements (not in scrollable container)

    // Header background
    const headerBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    headerBg.fillStyle(Theme.colors.background, 0.95);
    headerBg.fillRect(0, 0, GAME_WIDTH, headerHeight);
    headerBg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    headerBg.lineBetween(0, headerHeight, GAME_WIDTH, headerHeight);

    // Title
    this.add.text(GAME_WIDTH / 2, 16, 'ADVENTURE MAP', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Act + Floor indicator
    const currentAct = rm.getCurrentAct();
    this.add.text(GAME_WIDTH / 2, 34, `Act ${currentAct + 1}: ${acts[currentAct]?.name ?? ''} - Floor ${rm.getFloor()}`, {
      fontSize: '9px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Gold display
    this.add.text(GAME_WIDTH - 15, 8, `${rm.getGold()}G`, {
      fontSize: '11px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // Hero summary at bottom
    this.drawHeroSummary(rm);

    // Set up camera scrolling if map is wider than screen
    if (needsScroll) {
      this.setupDragScroll();
      // Auto-scroll to show accessible nodes or current progress
      this.scrollToAccessible(accessibleNodes, nodePositions);
    }

    // Auto-detect act transition: if the last completed node was a boss
    // and accessible nodes are in a new act, show transition
    if (this.pendingActTransition === null) {
      const currentNodeIdx = rm.getCurrentNode();
      if (currentNodeIdx >= 0 && currentNodeIdx < map.length) {
        const currentNode = map[currentNodeIdx];
        if (currentNode.type === 'boss' && currentNode.completed && accessibleNodes.length > 0) {
          const bossAct = rm.getNodeAct(currentNodeIdx);
          const nextAct = rm.getNodeAct(accessibleNodes[0]);
          if (nextAct > bossAct) {
            this.pendingActTransition = nextAct;
            rm.setCurrentAct(nextAct);
          }
        }
      }
    }

    // Show act transition overlay if requested
    if (this.pendingActTransition !== null) {
      this.showActTransition(this.pendingActTransition);
      this.pendingActTransition = null;
    }
  }

  private buildLayers(map: MapNode[]): LayerInfo[] {
    if (map.length === 0) return [];

    const acts = actsData as ActConfig[];
    const layers: LayerInfo[] = [];

    // Assign layers via BFS from node 0
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
          // Detect act boundary: boss connecting forward
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

    // Handle any unvisited nodes (shouldn't happen with valid graph)
    for (let i = 0; i < map.length; i++) {
      if (!nodeLayer.has(i)) {
        nodeLayer.set(i, i);
        nodeAct.set(i, 0);
      }
    }

    // Group nodes by layer
    const layerMap = new Map<number, MapNode[]>();
    for (const node of map) {
      const l = nodeLayer.get(node.index) ?? 0;
      if (!layerMap.has(l)) layerMap.set(l, []);
      layerMap.get(l)!.push(node);
    }

    // Sort layers and create LayerInfo
    const sortedLayers = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [layerIdx, nodes] of sortedLayers) {
      const actIndex = nodeAct.get(nodes[0].index) ?? 0;
      layers.push({ layerIndex: layerIdx, actIndex, nodes });
    }

    return layers;
  }

  private drawCurvedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    if (Math.abs(y1 - y2) < 2) {
      // Straight horizontal line
      g.lineBetween(x1, y1, x2, y2);
    } else {
      // Bezier curve
      g.beginPath();
      g.moveTo(x1, y1);
      // Use quadratic bezier for gentle curve
      const cp1x = x1 + (x2 - x1) * 0.4;
      const cp2x = x1 + (x2 - x1) * 0.6;
      // @ts-ignore - Phaser Graphics has lineTo/bezierCurveTo but types may be incomplete
      if (typeof g['bezierCurveTo'] === 'function') {
        (g as any).bezierCurveTo(cp1x, y1, cp2x, y2, x2, y2);
      } else {
        // Fallback: approximate with line segments
        const steps = 8;
        for (let t = 1; t <= steps; t++) {
          const p = t / steps;
          const px = (1 - p) * (1 - p) * (1 - p) * x1 + 3 * (1 - p) * (1 - p) * p * cp1x + 3 * (1 - p) * p * p * cp2x + p * p * p * x2;
          const py = (1 - p) * (1 - p) * (1 - p) * y1 + 3 * (1 - p) * (1 - p) * p * y1 + 3 * (1 - p) * p * p * y2 + p * p * p * y2;
          g.lineTo(px, py);
        }
      }
      g.strokePath();
    }
  }

  private setupDragScroll(): void {
    const maxScroll = Math.max(0, this.totalMapWidth - GAME_WIDTH);
    let pointerStartX = 0;
    let scrollStartX = 0;
    let hasMoved = false;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only start drag in map area (not header/hero panel)
      if (pointer.y > 55 && pointer.y < GAME_HEIGHT - 75) {
        this.isDragging = false;
        hasMoved = false;
        pointerStartX = pointer.x;
        scrollStartX = this.scrollX;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.y > 55 && pointer.y < GAME_HEIGHT - 75) {
        const dx = pointer.x - pointerStartX;
        if (Math.abs(dx) > 5) {
          hasMoved = true;
          this.isDragging = true;
        }
        if (hasMoved) {
          this.scrollX = Phaser.Math.Clamp(scrollStartX - dx, 0, maxScroll);
          this.mapContainer.x = -this.scrollX;
        }
      }
    });

    this.input.on('pointerup', () => {
      // Delay resetting isDragging to prevent click-through
      if (this.isDragging) {
        this.time.delayedCall(50, () => { this.isDragging = false; });
      }
    });
  }

  private scrollToAccessible(accessibleNodes: number[], nodePositions: Map<number, { x: number; y: number }>): void {
    if (accessibleNodes.length === 0) return;

    // Find the average X of accessible nodes
    let sumX = 0;
    let count = 0;
    for (const idx of accessibleNodes) {
      const pos = nodePositions.get(idx);
      if (pos) {
        sumX += pos.x;
        count++;
      }
    }
    if (count === 0) return;

    const avgX = sumX / count;
    const maxScroll = Math.max(0, this.totalMapWidth - GAME_WIDTH);
    this.scrollX = Phaser.Math.Clamp(avgX - GAME_WIDTH / 2, 0, maxScroll);
    this.mapContainer.x = -this.scrollX;
  }

  private showActTransition(actIndex: number): void {
    const acts = actsData as ActConfig[];
    if (actIndex < 0 || actIndex >= acts.length) return;
    const act = acts[actIndex];

    // Full-screen overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    // Fade in overlay
    this.tweens.add({
      targets: overlay,
      alpha: 0.8,
      duration: 400,
      ease: 'Sine.easeIn',
    });

    // "Entering Act X" title
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `Entering Act ${actIndex + 1}`, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    // Act name
    const name = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15, act.name, {
      fontSize: '16px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    // Description
    const desc = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, act.description, {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    // Fade in text
    this.tweens.add({
      targets: [title, name, desc],
      alpha: 1,
      duration: 500,
      delay: 300,
      ease: 'Sine.easeOut',
    });

    // Continue button (after text appears)
    this.time.delayedCall(600, () => {
      const btn = new Button(
        this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65,
        'Continue', 140, 36,
        () => {
          // Fade out everything
          this.tweens.add({
            targets: [overlay, title, name, desc, btn],
            alpha: 0,
            duration: 300,
            ease: 'Sine.easeIn',
            onComplete: () => {
              overlay.destroy();
              title.destroy();
              name.destroy();
              desc.destroy();
              btn.destroy();
            },
          });
        },
        Theme.colors.primary,
      );
      btn.setScrollFactor(0);
      btn.setDepth(202);
      btn.setAlpha(0);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 300,
        ease: 'Sine.easeOut',
      });
    });
  }

  private getNodeTypeName(type: NodeType): string {
    switch (type) {
      case 'battle': return 'Battle';
      case 'elite': return 'Elite';
      case 'boss': return 'Boss';
      case 'shop': return 'Shop';
      case 'event': return 'Event';
      case 'rest': return 'Rest';
    }
  }

  private drawHeroSummary(rm: RunManager): void {
    const heroes = rm.getHeroes();
    const totalWidth = heroes.length * 80;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;
    const panelY = GAME_HEIGHT - 70;

    // Panel background
    const panelBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    panelBg.fillStyle(Theme.colors.panel, 0.85);
    panelBg.fillRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);
    panelBg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    panelBg.strokeRoundedRect(startX - 8, panelY, totalWidth + 16, 65, 6);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const x = startX + i * 80 + 40;
      const y = panelY + 12;

      // Role color bar
      const roleColor = this.getRoleColor(data.role);
      const bar = this.add.graphics().setScrollFactor(0).setDepth(101);
      bar.fillStyle(roleColor, 0.6);
      bar.fillRoundedRect(x - 30, y, 60, 3, 2);

      // Name
      this.add.text(x, y + 10, data.name, {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      // Level
      this.add.text(x, y + 22, `Lv.${hero.level}`, {
        fontSize: '7px',
        color: colorToString(Theme.colors.secondary),
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

      // HP bar
      const maxHp = rm.getMaxHp(hero, data);
      const hpRatio = hero.currentHp / maxHp;
      const hpBarWidth = 54;
      const hpG = this.add.graphics().setScrollFactor(0).setDepth(101);
      hpG.fillStyle(0x333333, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth, 4, 2);
      const hpColor = hpRatio > 0.6 ? 0x44ff44 : hpRatio > 0.3 ? 0xffaa00 : 0xff4444;
      hpG.fillStyle(hpColor, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 32, hpBarWidth * hpRatio, 4, 2);

      // HP text
      this.add.text(x, y + 43, `${hero.currentHp}/${maxHp}`, {
        fontSize: '6px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    });
  }

  private getRoleColor(role: string): number {
    switch (role) {
      case 'tank': return 0x4488ff;
      case 'melee_dps': return 0xff8844;
      case 'ranged_dps': return 0xff4488;
      case 'healer': return 0x44ff88;
      case 'support': return 0xaaaa44;
      default: return 0x888888;
    }
  }

  private selectNode(index: number): void {
    const rm = RunManager.getInstance();
    const accessible = rm.getAccessibleNodes();
    if (!accessible.includes(index)) return;

    // Check for act transition
    const nodeAct = rm.getNodeAct(index);
    const prevAct = rm.getCurrentAct();

    if (nodeAct !== prevAct) {
      rm.setCurrentAct(nodeAct);
    }

    rm.setCurrentNode(index);
    const node = rm.getMap()[index];

    const sceneMap: Record<string, string> = {
      battle: 'BattleScene',
      elite: 'BattleScene',
      boss: 'BattleScene',
      shop: 'ShopScene',
      event: 'EventScene',
      rest: 'RestScene',
    };

    const target = sceneMap[node.type];
    if (target) {
      SceneTransition.fadeTransition(this, target, { nodeIndex: index });
    }
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { MapGenerator } from '../systems/MapGenerator';
import { MapNode, ActConfig } from '../types';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { Button } from '../ui/Button';
import { MapRenderer, NODE_COLORS, NODE_LABELS, LayerInfo } from '../ui/MapRenderer';
import actsData from '../data/acts.json';
import { UI } from '../i18n';
import { NodeTooltip } from '../ui/NodeTooltip';

export class MapScene extends Phaser.Scene {
  private mapContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private dragStartX = 0;
  private scrollX = 0;
  private totalMapWidth = 0;
  private pendingActTransition: number | null = null;
  private activeTooltip: NodeTooltip | null = null;
  private pathOverlay: Phaser.GameObjects.Graphics | null = null;
  private nodePositions = new Map<number, { x: number; y: number }>();
  private mapNodes: MapNode[] = [];

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
    const acts = actsData as ActConfig[];
    const layers = MapRenderer.buildLayers(map, acts);

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
    MapRenderer.drawActBackgrounds(this, this.mapContainer, layers, acts, layerSpacing, startX, headerHeight, mapAreaHeight);

    // Draw connections first (behind nodes)
    const connGraphics = this.add.graphics();
    this.mapContainer.add(connGraphics);

    const accessibleNodes = rm.getAccessibleNodes();
    this.nodePositions = new Map<number, { x: number; y: number }>();
    this.mapNodes = map;
    const nodePositions = this.nodePositions;

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
          MapRenderer.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
          connGraphics.lineStyle(2, 0x88aaff, 0.5);
          MapRenderer.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        } else if (isCompleted) {
          connGraphics.lineStyle(2, 0x444466, 0.4);
          MapRenderer.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        } else {
          connGraphics.lineStyle(1, 0x222244, 0.25);
          MapRenderer.drawCurvedLine(connGraphics, fromPos.x, fromPos.y, toPos.x, toPos.y);
        }
      }
    }

    // Draw nodes
    const currentNodeIdx = rm.getCurrentNode();
    for (const node of map) {
      const pos = nodePositions.get(node.index);
      if (!pos) continue;

      const isAccessible = accessibleNodes.includes(node.index);
      const isCompleted = node.completed;
      const isCurrent = node.index === currentNodeIdx;
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

        // Pulse animation - use a circle positioned at node center so scale pivots correctly
        const pulseRing = this.add.circle(pos.x, pos.y, radius + 5)
          .setStrokeStyle(2, color, 0.4)
          .setFillStyle(0x000000, 0);
        this.mapContainer.add(pulseRing);
        this.tweens.add({
          targets: pulseRing,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0,
          duration: 800,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
      } else {
        g.fillStyle(color, 0.25);
        g.fillCircle(pos.x, pos.y, radius);
        g.lineStyle(1, color, 0.15);
        g.strokeCircle(pos.x, pos.y, radius);
      }

      this.mapContainer.add(g);

      // Current position marker (bright pulsing white ring)
      if (isCurrent && isCompleted) {
        const currentRing = this.add.circle(pos.x, pos.y, radius + 8)
          .setStrokeStyle(3, 0xffffff, 0.6)
          .setFillStyle(0x000000, 0);
        this.mapContainer.add(currentRing);
        this.tweens.add({
          targets: currentRing,
          alpha: { from: 0.6, to: 0.2 },
          scaleX: { from: 1, to: 1.15 },
          scaleY: { from: 1, to: 1.15 },
          duration: 1000,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
      }

      // Node icon
      const labelAlpha = isCompleted ? 0.4 : isAccessible ? 1 : 0.25;
      const label = this.add.text(pos.x, pos.y, NODE_LABELS[node.type], {
        fontSize: node.type === 'boss' ? '12px' : '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);
      this.mapContainer.add(label);

      // Type name below
      const typeName = UI.nodeType[node.type] ?? node.type;
      const typeLabel = this.add.text(pos.x, pos.y + radius + 6, typeName, {
        fontSize: '9px',
        color: '#7799aa',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);
      this.mapContainer.add(typeLabel);

      // Make accessible nodes clickable + hover tooltip for all uncompleted
      if (isAccessible || !isCompleted) {
        const hitArea = this.add.circle(pos.x, pos.y, radius + 6)
          .setInteractive({ useHandCursor: isAccessible })
          .setAlpha(0.01);
        this.mapContainer.add(hitArea);

        if (isAccessible) {
          hitArea.on('pointerup', () => {
            if (!this.isDragging) {
              this.selectNode(node.index);
            }
          });
        }

        // Hover tooltip + path overlay
        hitArea.on('pointerover', () => {
          this.hideNodeTooltip();
          this.activeTooltip = new NodeTooltip(this, pos.x, pos.y, node);
          this.mapContainer.add(this.activeTooltip);
          if (!isCompleted) {
            this.showPathOverlay(node.index, accessibleNodes);
          }
        });
        hitArea.on('pointerout', () => {
          this.hideNodeTooltip();
          this.clearPathOverlay();
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
    this.add.text(GAME_WIDTH / 2, 16, UI.map.title, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Act + Floor indicator
    const currentAct = rm.getCurrentAct();
    this.add.text(GAME_WIDTH / 2, 34, UI.map.floorLabel(currentAct + 1, acts[currentAct]?.name ?? '', rm.getFloor()), {
      fontSize: '9px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Gold display
    this.add.text(GAME_WIDTH - 15, 8, UI.map.gold(rm.getGold()), {
      fontSize: '11px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // Run stats (hero count, relics, node progress)
    const completedCount = map.filter(n => n.completed).length;
    this.add.text(15, 8, UI.map.runStats(rm.getHeroes().length, rm.getRelics().length, completedCount, map.length), {
      fontSize: '9px',
      color: '#7788aa',
      fontFamily: 'monospace',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(101);

    // Hero summary at bottom
    MapRenderer.drawHeroSummary(this, rm.getHeroes(), (id) => rm.getHeroData(id), (h, d) => rm.getMaxHp(h, d));

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
          // Check all accessible nodes for a higher act
          let highestAct = bossAct;
          for (const nodeIdx of accessibleNodes) {
            const nodeAct = rm.getNodeAct(nodeIdx);
            if (nodeAct > highestAct) {
              highestAct = nodeAct;
            }
          }
          if (highestAct > bossAct) {
            this.pendingActTransition = highestAct;
            rm.setCurrentAct(highestAct);
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

  private setupDragScroll(): void {
    const maxScroll = Math.max(0, this.totalMapWidth - GAME_WIDTH);
    let scrollStartX = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only start drag in map area (not header/hero panel)
      if (pointer.y > 55 && pointer.y < GAME_HEIGHT - 75) {
        this.isDragging = false;
        this.dragStartX = pointer.x;
        scrollStartX = this.scrollX;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.y > 55 && pointer.y < GAME_HEIGHT - 75) {
        const dx = pointer.x - this.dragStartX;
        if (Math.abs(dx) > 5) {
          this.isDragging = true;
        }
        if (this.isDragging) {
          this.scrollX = Phaser.Math.Clamp(scrollStartX - dx, 0, maxScroll);
          this.mapContainer.x = -this.scrollX;
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Use distance-based check: isDragging stays true so node pointerup sees it,
      // then reset immediately. No timer race condition.
      const dist = Math.abs(pointer.x - this.dragStartX);
      // Keep isDragging=true if we actually dragged, so node click guards work.
      // Reset it synchronously after the current event cycle via next frame.
      if (dist < 8) {
        this.isDragging = false;
      }
      // For actual drags, reset on next frame so node pointerup (same event) sees isDragging=true
      if (this.isDragging) {
        this.time.delayedCall(0, () => { this.isDragging = false; });
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
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, UI.map.enterAct(actIndex + 1), {
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
        UI.map.continueBtn, 140, 36,
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

  private hideNodeTooltip(): void {
    if (this.activeTooltip) {
      this.activeTooltip.destroy();
      this.activeTooltip = null;
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

  /** BFS to find shortest path from any accessible node to targetIdx. */
  private findPath(targetIdx: number, accessibleNodes: number[]): number[] | null {
    if (accessibleNodes.includes(targetIdx)) return [targetIdx];

    // Build reverse connection map
    const reverseMap = new Map<number, number[]>();
    for (const node of this.mapNodes) {
      for (const conn of node.connections) {
        if (!reverseMap.has(conn)) reverseMap.set(conn, []);
        reverseMap.get(conn)!.push(node.index);
      }
    }

    // BFS backwards from target to find an accessible node
    const visited = new Set<number>([targetIdx]);
    const parent = new Map<number, number>();
    const queue = [targetIdx];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (accessibleNodes.includes(current)) {
        // Reconstruct path forward
        const path: number[] = [current];
        let c = current;
        while (parent.has(c)) {
          c = parent.get(c)!;
          path.push(c);
        }
        return path;
      }
      for (const prev of (reverseMap.get(current) ?? [])) {
        if (!visited.has(prev)) {
          visited.add(prev);
          parent.set(prev, current);
          queue.push(prev);
        }
      }
    }
    return null;
  }

  private showPathOverlay(targetIdx: number, accessibleNodes: number[]): void {
    this.clearPathOverlay();
    const path = this.findPath(targetIdx, accessibleNodes);
    if (!path || path.length < 2) return;

    const g = this.add.graphics();
    g.lineStyle(3, 0xffdd44, 0.5);

    for (let i = 0; i < path.length - 1; i++) {
      const from = this.nodePositions.get(path[i]);
      const to = this.nodePositions.get(path[i + 1]);
      if (from && to) {
        MapRenderer.drawCurvedLine(g, from.x, from.y, to.x, to.y);
      }
    }

    // Highlight intermediate nodes with a faint circle
    for (let i = 1; i < path.length - 1; i++) {
      const pos = this.nodePositions.get(path[i]);
      if (pos) {
        g.lineStyle(2, 0xffdd44, 0.35);
        g.strokeCircle(pos.x, pos.y, 15);
      }
    }

    this.pathOverlay = g;
    this.mapContainer.add(g);
  }

  private clearPathOverlay(): void {
    if (this.pathOverlay) {
      this.pathOverlay.destroy();
      this.pathOverlay = null;
    }
  }

  shutdown(): void {
    this.tweens.killAll();
    this.hideNodeTooltip();
    this.clearPathOverlay();
  }
}

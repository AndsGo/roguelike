import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MAP_NODE_COUNT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { MapGenerator } from '../systems/MapGenerator';
import { MapNode, NodeType } from '../types';

const NODE_COLORS: Record<NodeType, number> = {
  battle: 0xcc4444,
  elite: 0xff8844,
  boss: 0xff2222,
  shop: 0x44cc44,
  event: 0x8844cc,
  rest: 0x4488cc,
};

const NODE_LABELS: Record<NodeType, string> = {
  battle: '战',
  elite: '精',
  boss: 'Boss',
  shop: '商',
  event: '事',
  rest: '休',
};

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    // Generate map if not already done
    if (rm.getMap().length === 0) {
      const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
      rm.setMap(map);
    }

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    // Title
    this.add.text(GAME_WIDTH / 2, 25, '冒险地图', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Gold display
    this.add.text(GAME_WIDTH - 20, 15, `金币: ${rm.getGold()}`, {
      fontSize: '11px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Draw map nodes
    const map = rm.getMap();
    const currentNode = rm.getCurrentNode();
    const nextNode = currentNode + 1;

    const startX = 40;
    const endX = GAME_WIDTH - 40;
    const nodeSpacing = (endX - startX) / (MAP_NODE_COUNT - 1);
    const nodeY = GAME_HEIGHT / 2;

    // Draw connections
    for (let i = 0; i < MAP_NODE_COUNT - 1; i++) {
      const x1 = startX + i * nodeSpacing;
      const x2 = startX + (i + 1) * nodeSpacing;
      const line = this.add.line(0, 0, x1, nodeY, x2, nodeY, 0x333355);
      line.setOrigin(0, 0);
    }

    // Draw nodes
    for (let i = 0; i < MAP_NODE_COUNT; i++) {
      const node = map[i];
      const x = startX + i * nodeSpacing;
      const y = nodeY;
      const isAccessible = i === nextNode;
      const isCompleted = node.completed;

      // Node circle
      const radius = node.type === 'boss' ? 18 : 14;
      let color = NODE_COLORS[node.type];
      let alpha = 1;

      if (isCompleted) {
        color = 0x444444;
        alpha = 0.5;
      } else if (!isAccessible) {
        alpha = 0.4;
      }

      const circle = this.add.circle(x, y, radius, color, alpha);

      // Node label
      const label = this.add.text(x, y, NODE_LABELS[node.type], {
        fontSize: node.type === 'boss' ? '10px' : '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      label.setAlpha(alpha);

      // Node index below
      this.add.text(x, y + radius + 8, `${i + 1}`, {
        fontSize: '7px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Clickable if accessible
      if (isAccessible) {
        circle.setStrokeStyle(2, 0xffffff);
        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerdown', () => this.selectNode(i));

        // Pulse animation
        this.tweens.add({
          targets: circle,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Hero summary at bottom
    this.drawHeroSummary(rm);
  }

  private drawHeroSummary(rm: RunManager): void {
    const heroes = rm.getHeroes();
    const startX = GAME_WIDTH / 2 - (heroes.length * 80) / 2;

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '队伍', {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const x = startX + i * 80 + 40;
      const y = GAME_HEIGHT - 60;

      this.add.text(x, y, `${data.name}\nLv.${hero.level}`, {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);

      const maxHp = rm.getMaxHp(hero, data);
      const hpPercent = Math.round((hero.currentHp / maxHp) * 100);
      const hpColor = hpPercent > 60 ? '#44ff44' : hpPercent > 30 ? '#ffaa00' : '#ff4444';
      this.add.text(x, y + 22, `HP:${hpPercent}%`, {
        fontSize: '8px',
        color: hpColor,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });
  }

  private selectNode(index: number): void {
    const rm = RunManager.getInstance();
    rm.setCurrentNode(index);
    const node = rm.getMap()[index];

    switch (node.type) {
      case 'battle':
      case 'elite':
      case 'boss':
        this.scene.start('BattleScene', { nodeIndex: index });
        break;
      case 'shop':
        this.scene.start('ShopScene', { nodeIndex: index });
        break;
      case 'event':
        this.scene.start('EventScene', { nodeIndex: index });
        break;
      case 'rest':
        this.scene.start('RestScene', { nodeIndex: index });
        break;
    }
  }
}

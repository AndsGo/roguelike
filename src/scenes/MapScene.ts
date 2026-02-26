import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MAP_NODE_COUNT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { MapGenerator } from '../systems/MapGenerator';
import { NodeType } from '../types';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';

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

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    if (rm.getMap().length === 0) {
      const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
      rm.setMap(map);
    }

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Title
    this.add.text(GAME_WIDTH / 2, 22, 'ADVENTURE MAP', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Act indicator
    this.add.text(GAME_WIDTH / 2, 40, `Act ${rm.getCurrentAct() + 1} - Floor ${rm.getFloor()}`, {
      fontSize: '9px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Gold display
    this.add.text(GAME_WIDTH - 15, 12, `${rm.getGold()}G`, {
      fontSize: '11px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Draw map
    const map = rm.getMap();
    const currentNode = rm.getCurrentNode();
    const nextNode = currentNode + 1;

    const startX = 50;
    const endX = GAME_WIDTH - 50;
    const nodeSpacing = (endX - startX) / (MAP_NODE_COUNT - 1);
    const nodeY = GAME_HEIGHT / 2 - 10;

    // Draw connections
    const connGraphics = this.add.graphics();
    for (let i = 0; i < MAP_NODE_COUNT - 1; i++) {
      const x1 = startX + i * nodeSpacing;
      const x2 = startX + (i + 1) * nodeSpacing;
      const isCompleted = map[i].completed;
      connGraphics.lineStyle(2, isCompleted ? 0x444466 : 0x222244, isCompleted ? 0.5 : 0.3);
      connGraphics.lineBetween(x1, nodeY, x2, nodeY);
    }

    // Draw nodes
    for (let i = 0; i < MAP_NODE_COUNT; i++) {
      const node = map[i];
      const x = startX + i * nodeSpacing;
      const y = nodeY;
      const isAccessible = i === nextNode;
      const isCompleted = node.completed;
      const isCurrent = i === currentNode;

      const radius = node.type === 'boss' ? 16 : 12;
      let color = NODE_COLORS[node.type];

      const g = this.add.graphics();

      if (isCompleted) {
        g.fillStyle(0x444455, 0.5);
        g.fillCircle(x, y, radius);
        g.lineStyle(1, 0x555566, 0.5);
        g.strokeCircle(x, y, radius);
      } else if (isAccessible) {
        // Glow ring
        g.lineStyle(3, color, 0.3);
        g.strokeCircle(x, y, radius + 4);
        g.fillStyle(color, 1);
        g.fillCircle(x, y, radius);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeCircle(x, y, radius);

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
        g.fillStyle(color, 0.3);
        g.fillCircle(x, y, radius);
        g.lineStyle(1, color, 0.2);
        g.strokeCircle(x, y, radius);
      }

      // Node icon/label
      const labelAlpha = isCompleted ? 0.4 : isAccessible ? 1 : 0.3;
      const label = this.add.text(x, y, NODE_LABELS[node.type], {
        fontSize: node.type === 'boss' ? '12px' : '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);

      // Type name below
      const typeName = this.getNodeTypeName(node.type);
      this.add.text(x, y + radius + 8, typeName, {
        fontSize: '7px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(labelAlpha);

      // Make accessible nodes clickable
      if (isAccessible) {
        const hitArea = this.add.circle(x, y, radius + 4)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.01);
        hitArea.on('pointerdown', () => this.selectNode(i));
      }
    }

    // Hero summary at bottom
    this.drawHeroSummary(rm);
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
    const totalWidth = heroes.length * 90;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    // Panel background
    const panelBg = this.add.graphics();
    panelBg.fillStyle(Theme.colors.panel, 0.7);
    panelBg.fillRoundedRect(startX - 10, GAME_HEIGHT - 90, totalWidth + 20, 75, 6);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const x = startX + i * 90 + 45;
      const y = GAME_HEIGHT - 62;

      // Role color bar
      const roleColor = this.getRoleColor(data.role);
      const bar = this.add.graphics();
      bar.fillStyle(roleColor, 0.6);
      bar.fillRoundedRect(x - 35, y - 20, 70, 4, 2);

      // Name
      this.add.text(x, y - 8, data.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Level
      this.add.text(x, y + 5, `Lv.${hero.level}`, {
        fontSize: '8px',
        color: colorToString(Theme.colors.secondary),
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      // HP bar
      const maxHp = rm.getMaxHp(hero, data);
      const hpRatio = hero.currentHp / maxHp;
      const hpBarWidth = 60;
      const hpG = this.add.graphics();
      hpG.fillStyle(0x333333, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 15, hpBarWidth, 5, 2);
      const hpColor = hpRatio > 0.6 ? 0x44ff44 : hpRatio > 0.3 ? 0xffaa00 : 0xff4444;
      hpG.fillStyle(hpColor, 1);
      hpG.fillRoundedRect(x - hpBarWidth / 2, y + 15, hpBarWidth * hpRatio, 5, 2);

      // HP text
      this.add.text(x, y + 28, `${hero.currentHp}/${maxHp}`, {
        fontSize: '7px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
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

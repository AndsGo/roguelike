import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { ShopGenerator } from '../systems/ShopGenerator';
import { ItemData, HeroState } from '../types';
import { Button } from '../ui/Button';

export class ShopScene extends Phaser.Scene {
  private nodeIndex!: number;
  private shopItems: ItemData[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private selectedHero: HeroState | null = null;
  private itemButtons: { button: Phaser.GameObjects.Container; item: ItemData; priceText: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
    this.selectedHero = null;
    this.itemButtons = [];
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    // Generate shop inventory
    this.shopItems = ShopGenerator.generate(rng, this.nodeIndex);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    this.add.text(GAME_WIDTH / 2, 25, '商店', {
      fontSize: '20px',
      color: '#44cc44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.goldText = this.add.text(GAME_WIDTH - 20, 15, `金币: ${rm.getGold()}`, {
      fontSize: '12px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Hero selection at top
    this.add.text(20, 50, '选择英雄装备:', {
      fontSize: '10px',
      color: '#8899cc',
      fontFamily: 'monospace',
    });

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const btn = this.add.text(20 + i * 100, 70, data.name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#333355',
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.selectedHero = hero;
        // Highlight selected
        heroes.forEach((_, j) => {
          const otherBtn = this.children.list.find(
            c => c instanceof Phaser.GameObjects.Text && (c as Phaser.GameObjects.Text).text === rm.getHeroData(heroes[j].id).name
          ) as Phaser.GameObjects.Text;
          if (otherBtn) otherBtn.setColor(j === i ? '#ffdd44' : '#ffffff');
        });
      });
    });

    // Shop items
    this.shopItems.forEach((item, i) => {
      const x = 60 + (i % 3) * 240;
      const y = 130 + Math.floor(i / 3) * 100;
      this.createItemCard(item, x, y, rm);
    });

    // Leave button
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 35, '离开商店', 140, 35, () => {
      rm.markNodeCompleted(this.nodeIndex);
      this.scene.start('MapScene');
    });
  }

  private createItemCard(item: ItemData, x: number, y: number, rm: RunManager): void {
    const rarityColors: Record<string, string> = {
      common: '#aaaaaa',
      uncommon: '#44cc44',
      rare: '#4488ff',
      epic: '#cc44cc',
      legendary: '#ff8844',
    };

    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 220, 80, 0x222244, 0.9);
    bg.setStrokeStyle(1, 0x445588);
    container.add(bg);

    const nameText = this.add.text(-100, -30, item.name, {
      fontSize: '11px',
      color: rarityColors[item.rarity] || '#ffffff',
      fontFamily: 'monospace',
    });
    container.add(nameText);

    const desc = this.add.text(-100, -14, item.description, {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
    });
    container.add(desc);

    // Stats
    const statStr = Object.entries(item.stats)
      .map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`)
      .join(' ');
    const statsText = this.add.text(-100, 2, statStr, {
      fontSize: '8px',
      color: '#aaccff',
      fontFamily: 'monospace',
    });
    container.add(statsText);

    const priceText = this.add.text(-100, 20, `${item.cost} 金币`, {
      fontSize: '10px',
      color: rm.getGold() >= item.cost ? '#ffdd44' : '#ff4444',
      fontFamily: 'monospace',
    });
    container.add(priceText);

    // Buy button
    const buyBtn = this.add.text(80, 20, '购买', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#445588',
      padding: { x: 8, y: 3 },
    }).setInteractive({ useHandCursor: true });
    container.add(buyBtn);

    buyBtn.on('pointerdown', () => {
      this.buyItem(item, container, priceText);
    });

    this.itemButtons.push({ button: container, item, priceText });
  }

  private buyItem(item: ItemData, container: Phaser.GameObjects.Container, priceText: Phaser.GameObjects.Text): void {
    const rm = RunManager.getInstance();

    if (!this.selectedHero) {
      this.showMessage('请先选择一个英雄！');
      return;
    }

    if (!rm.spendGold(item.cost)) {
      this.showMessage('金币不足！');
      return;
    }

    const oldItem = rm.equipItem(this.selectedHero.id, item);
    this.goldText.setText(`金币: ${rm.getGold()}`);

    // Remove bought item from display
    container.setAlpha(0.3);
    container.removeInteractive();

    // Update price colors for remaining items
    for (const ib of this.itemButtons) {
      const canAfford = rm.getGold() >= ib.item.cost;
      ib.priceText.setColor(canAfford ? '#ffdd44' : '#ff4444');
    }

    if (oldItem) {
      this.showMessage(`装备了 ${item.name}，替换了 ${oldItem.name}`);
    } else {
      this.showMessage(`装备了 ${item.name}！`);
    }
  }

  private showMessage(text: string): void {
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, text, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => msg.destroy(),
    });
  }
}

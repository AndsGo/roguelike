import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { ShopGenerator } from '../systems/ShopGenerator';
import { ItemData, HeroState } from '../types';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { UI, formatStat, formatStatDiff, SLOT_LABELS } from '../i18n';

export class ShopScene extends Phaser.Scene {
  private nodeIndex!: number;
  private shopItems: ItemData[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private selectedHero: HeroState | null = null;
  private itemCards: { container: Phaser.GameObjects.Container; item: ItemData; priceText: Phaser.GameObjects.Text; compareText: Phaser.GameObjects.Text; sold: boolean }[] = [];
  private heroButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.selectedHero = null;
    this.itemCards = [];
    this.heroButtons = [];
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    this.shopItems = ShopGenerator.generate(rng, rm.getCurrentAct());

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Title
    this.add.text(GAME_WIDTH / 2, 22, UI.shop.title, {
      fontSize: '20px',
      color: colorToString(Theme.colors.success),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gold display
    this.goldText = this.add.text(GAME_WIDTH - 15, 12, `${rm.getGold()}G`, {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Hero selection
    this.add.text(20, 50, UI.shop.selectHero, {
      fontSize: '10px',
      color: '#8899cc',
      fontFamily: 'monospace',
    });

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const btnContainer = this.add.container(25 + i * 100, 72);

      const bg = this.add.graphics();
      bg.fillStyle(Theme.colors.panel, 0.8);
      bg.fillRoundedRect(0, -10, 85, 22, 4);
      bg.lineStyle(1, Theme.colors.panelBorder, 0.5);
      bg.strokeRoundedRect(0, -10, 85, 22, 4);
      btnContainer.add(bg);

      const text = this.add.text(42, 1, data.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      btnContainer.add(text);

      btnContainer.setSize(85, 22);
      btnContainer.setInteractive({ useHandCursor: true });
      btnContainer.on('pointerdown', () => {
        this.selectedHero = hero;
        this.highlightHeroButton(i);
        this.updateComparisonTexts();
      });

      this.heroButtons.push(btnContainer);
    });

    // Shop items
    this.shopItems.forEach((item, i) => {
      const x = 70 + (i % 3) * 230;
      const y = 140 + Math.floor(i / 3) * 120;
      this.createItemCard(item, x, y, rm);
    });

    // Leave button
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, UI.shop.leaveShop, 140, 35, () => {
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();
      SceneTransition.fadeTransition(this, 'MapScene');
    });
  }

  private highlightHeroButton(selectedIndex: number): void {
    this.heroButtons.forEach((btn, i) => {
      const text = btn.getAt(1) as Phaser.GameObjects.Text;
      text.setColor(i === selectedIndex ? colorToString(Theme.colors.secondary) : '#ffffff');
    });
  }

  private createItemCard(item: ItemData, x: number, y: number, rm: RunManager): void {
    const container = this.add.container(x, y);

    const rarityColor = Theme.colors.rarity[item.rarity] ?? 0xbbbbbb;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.9);
    bg.fillRoundedRect(-60, -42, 210, 95, 6);
    bg.lineStyle(2, rarityColor, 0.7);
    bg.strokeRoundedRect(-60, -42, 210, 95, 6);
    container.add(bg);

    // Rarity indicator dot
    const rarityDot = this.add.graphics();
    rarityDot.fillStyle(rarityColor, 1);
    rarityDot.fillCircle(-48, -28, 4);
    container.add(rarityDot);

    // Item name
    const nameText = this.add.text(-38, -34, item.name, {
      fontSize: '11px',
      color: colorToString(rarityColor),
      fontFamily: 'monospace',
    });
    container.add(nameText);

    // Slot tag
    const slotLabel = SLOT_LABELS[item.slot] ?? item.slot;
    const slotTag = this.add.text(140, -34, `[${slotLabel}]`, {
      fontSize: '8px',
      color: '#666688',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);
    container.add(slotTag);

    // Description
    const desc = this.add.text(-55, -16, item.description, {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
      wordWrap: { width: 190 },
    });
    container.add(desc);

    // Stats
    const statStr = Object.entries(item.stats)
      .map(([k, v]) => formatStat(k, v as number))
      .join(' ');
    const statsText = this.add.text(-55, 2, statStr, {
      fontSize: '8px',
      color: '#aaccff',
      fontFamily: 'monospace',
    });
    container.add(statsText);

    // Comparison text (updated when hero is selected)
    const compareText = this.add.text(-55, 14, '', {
      fontSize: '7px',
      color: '#888888',
      fontFamily: 'monospace',
    });
    container.add(compareText);

    // Price
    const canAfford = rm.getGold() >= item.cost;
    const priceText = this.add.text(-55, 28, `${item.cost}G`, {
      fontSize: '10px',
      color: canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger),
      fontFamily: 'monospace',
    });
    container.add(priceText);

    // Buy button
    const buyBg = this.add.graphics();
    buyBg.fillStyle(Theme.colors.primary, 0.8);
    buyBg.fillRoundedRect(100, 22, 48, 22, 4);
    container.add(buyBg);

    const buyLabel = this.add.text(124, 33, UI.shop.buy, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(buyLabel);

    // Transparent hit area covering the full buy button region (padded for easier clicking)
    const buyHit = this.add.rectangle(124, 33, 64, 34, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(buyHit);

    buyHit.on('pointerdown', () => {
      this.buyItem(item, container, priceText);
    });

    this.itemCards.push({ container, item, priceText, compareText, sold: false });
  }

  private updateComparisonTexts(): void {
    for (const card of this.itemCards) {
      if (card.sold) continue;

      if (!this.selectedHero) {
        card.compareText.setText('');
        continue;
      }

      const currentEquip = this.selectedHero.equipment[card.item.slot];
      if (!currentEquip) {
        card.compareText.setText(UI.shop.vsEmpty);
        card.compareText.setColor('#888888');
        continue;
      }

      const diffs: string[] = [];
      const allKeys = new Set([...Object.keys(card.item.stats), ...Object.keys(currentEquip.stats)]);
      for (const k of allKeys) {
        const newVal = (card.item.stats as Record<string, number>)[k] ?? 0;
        const oldVal = (currentEquip.stats as Record<string, number>)[k] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) {
          diffs.push(formatStatDiff(k, diff));
        }
      }

      if (diffs.length > 0) {
        card.compareText.setText(`${UI.shop.vs(currentEquip.name)}${diffs.join(' ')}`);
        // Color based on whether it's mostly upgrades
        const hasUpgrade = diffs.some(d => d.includes('+'));
        const hasDowngrade = diffs.some(d => !d.includes('+'));
        if (hasUpgrade && !hasDowngrade) {
          card.compareText.setColor(colorToString(Theme.colors.success));
        } else if (!hasUpgrade && hasDowngrade) {
          card.compareText.setColor(colorToString(Theme.colors.danger));
        } else {
          card.compareText.setColor(colorToString(Theme.colors.secondary));
        }
      } else {
        card.compareText.setText(UI.shop.vsSame(currentEquip.name));
        card.compareText.setColor('#888888');
      }
    }
  }

  private buyItem(item: ItemData, container: Phaser.GameObjects.Container, priceText: Phaser.GameObjects.Text): void {
    const rm = RunManager.getInstance();

    if (!this.selectedHero) {
      this.showMessage(UI.shop.selectFirst);
      return;
    }

    if (!rm.spendGold(item.cost)) {
      this.showMessage(UI.shop.noGold);
      return;
    }

    const oldItem = rm.equipItem(this.selectedHero.id, item);
    this.goldText.setText(`${rm.getGold()}G`);

    // Mark as sold
    const card = this.itemCards.find(c => c.item === item);
    if (card) {
      card.sold = true;
      this.tweens.add({
        targets: container,
        alpha: 0.3,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 200,
      });
    }

    // Update affordability
    for (const ic of this.itemCards) {
      if (ic.sold) continue;
      const canAfford = rm.getGold() >= ic.item.cost;
      ic.priceText.setColor(canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger));
    }

    // Refresh comparison since equipment changed
    this.updateComparisonTexts();

    if (oldItem) {
      this.showMessage(UI.shop.replaced(item.name, oldItem.name));
    } else {
      this.showMessage(UI.shop.equipped(item.name));
    }
  }

  private showMessage(text: string): void {
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 65, text, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      y: msg.y - 10,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => msg.destroy(),
    });
  }
}

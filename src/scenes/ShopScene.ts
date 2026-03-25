import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SHOP_REFRESH_BASE_COST, SELL_PRICE_RATIO } from '../constants';
import { RunManager } from '../managers/RunManager';
import { ShopGenerator } from '../systems/ShopGenerator';
import { ItemData, HeroState } from '../types';
import { Button } from '../ui/Button';
import { Theme, colorToString, getRarityColor } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { UI, formatStat, formatStatDiff, SLOT_LABELS } from '../i18n';
import { AudioManager } from '../systems/AudioManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { calculateSynergyTags, formatSynergyTags } from '../utils/synergy-helpers';
import { TextFactory } from '../ui/TextFactory';

export class ShopScene extends Phaser.Scene {
  private nodeIndex!: number;
  private shopItems: ItemData[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private selectedHero: HeroState | null = null;
  private itemCards: { container: Phaser.GameObjects.Container; item: ItemData; priceText: Phaser.GameObjects.Text; compareText: Phaser.GameObjects.Text; sold: boolean }[] = [];
  private heroButtons: Phaser.GameObjects.Container[] = [];
  private refreshCount = 0;
  private refreshBtn!: Button;

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.selectedHero = null;
    this.itemCards = [];
    this.heroButtons = [];
    this.refreshCount = 0;
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    this.shopItems = ShopGenerator.generate(rng, rm.getCurrentAct());

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Title
    TextFactory.create(this, GAME_WIDTH / 2, 22, UI.shop.title, 'title', {
      color: colorToString(Theme.colors.success),
    }).setOrigin(0.5);

    // Gold display
    this.goldText = TextFactory.create(this, GAME_WIDTH - 15, 12, `${rm.getGold()}G`, 'body', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(1, 0);

    // Hero selection
    TextFactory.create(this, 20, 50, UI.shop.selectHero, 'label', {
      color: '#8899cc',
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

      const text = TextFactory.create(this, 42, 1, data.name, 'label', {
        color: '#ffffff',
      }).setOrigin(0.5);
      btnContainer.add(text);

      btnContainer.setSize(85, 22);
      btnContainer.setInteractive({ useHandCursor: true });
      btnContainer.on('pointerup', () => {
        this.selectedHero = hero;
        this.highlightHeroButton(i);
        this.updateComparisonTexts();
      });

      this.heroButtons.push(btnContainer);
    });

    // Synergy hints bar
    this.buildSynergyBar(heroes);

    // Shop items
    this.shopItems.forEach((item, i) => {
      const x = 70 + (i % 3) * 230;
      const y = 155 + Math.floor(i / 3) * 120;
      this.createItemCard(item, x, y, rm);
    });

    // Leave button (shifted left for refresh button)
    new Button(this, 310, GAME_HEIGHT - 30, UI.shop.leaveShop, 140, 35, () => {
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();
      SceneTransition.fadeTransition(this, 'MapScene');
    });

    // Refresh button
    const refreshCost = this.getRefreshCost();
    this.refreshBtn = new Button(this, 490, GAME_HEIGHT - 30, UI.shop.refresh(refreshCost), 140, 35, () => {
      this.refreshShop();
    }, Theme.colors.secondary);
    this.updateRefreshButton();

    TutorialSystem.showTipIfNeeded(this, 'first_shop');
  }

  private buildSynergyBar(heroes: HeroState[]): void {
    const tags = calculateSynergyTags(heroes.map(h => h.id));
    const text = formatSynergyTags(tags);

    if (text) {
      TextFactory.create(this, GAME_WIDTH / 2, 105, `${UI.shop.synergyLabel} ${text}`, 'small', {
        color: '#ccaa44',
      }).setOrigin(0.5);
    }
  }

  private highlightHeroButton(selectedIndex: number): void {
    this.heroButtons.forEach((btn, i) => {
      const text = btn.getAt(1) as Phaser.GameObjects.Text;
      text.setColor(i === selectedIndex ? colorToString(Theme.colors.secondary) : '#ffffff');
    });
  }

  private createItemCard(item: ItemData, x: number, y: number, rm: RunManager): void {
    const container = this.add.container(x, y);

    const rarityColor = getRarityColor(item.rarity);

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
    const nameText = TextFactory.create(this, -38, -34, item.name, 'body', {
      color: colorToString(rarityColor),
    });
    container.add(nameText);

    // Slot tag
    const slotLabel = SLOT_LABELS[item.slot] ?? item.slot;
    const slotTag = TextFactory.create(this, 140, -34, `[${slotLabel}]`, 'small', {
      color: '#666688',
    }).setOrigin(1, 0);
    container.add(slotTag);

    // Description
    const desc = TextFactory.create(this, -55, -16, item.description, 'small', {
      color: '#888888',
      wordWrap: { width: 190 },
    });
    container.add(desc);

    // Stats
    const statStr = Object.entries(item.stats)
      .map(([k, v]) => formatStat(k, v as number))
      .join(' ');
    const statsText = TextFactory.create(this, -55, 2, statStr, 'small', {
      color: '#aaccff',
    });
    container.add(statsText);

    // Comparison text (updated when hero is selected)
    const compareText = TextFactory.create(this, -55, 14, '', 'small', {
      color: '#888888',
    });
    container.add(compareText);

    // Price
    const canAfford = rm.getGold() >= item.cost;
    const priceText = TextFactory.create(this, -55, 28, `${item.cost}G`, 'label', {
      color: canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger),
    });
    container.add(priceText);

    // Buy button
    const buyBg = this.add.graphics();
    buyBg.fillStyle(Theme.colors.primary, 0.8);
    buyBg.fillRoundedRect(100, 22, 48, 22, 4);
    container.add(buyBg);

    const buyLabel = TextFactory.create(this, 124, 33, UI.shop.buy, 'label', {
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(buyLabel);

    // Transparent hit area covering the full buy button region (padded for easier clicking)
    const buyHit = this.add.rectangle(124, 33, 64, 34, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(buyHit);

    buyHit.on('pointerup', () => {
      this.buyItem(item, container, priceText);
    });

    this.itemCards.push({ container, item, priceText, compareText, sold: false });
  }

  private updateComparisonTexts(): void {
    const rm = RunManager.getInstance();

    for (const card of this.itemCards) {
      if (card.sold) continue;

      const canAfford = rm.getGold() >= card.item.cost;
      const baseColor = canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger);

      if (!this.selectedHero) {
        card.compareText.setText('');
        card.priceText.setText(`${card.item.cost}G`);
        card.priceText.setColor(baseColor);
        continue;
      }

      const currentEquip = this.selectedHero.equipment[card.item.slot];

      if (!currentEquip) {
        card.compareText.setText(UI.shop.vsEmpty);
        card.compareText.setColor('#888888');
        card.priceText.setText(`${card.item.cost}G`);
        card.priceText.setColor(baseColor);
        continue;
      }

      const diffs: { text: string; positive: boolean }[] = [];
      const allKeys = new Set([...Object.keys(card.item.stats), ...Object.keys(currentEquip.stats)]);
      for (const k of allKeys) {
        const newVal = (card.item.stats as Record<string, number>)[k] ?? 0;
        const oldVal = (currentEquip.stats as Record<string, number>)[k] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) {
          const arrow = diff > 0 ? '▲' : '▼';
          diffs.push({ text: `${arrow}${formatStatDiff(k, diff)}`, positive: diff > 0 });
        }
      }

      if (diffs.length > 0) {
        const prefix = UI.shop.vs(currentEquip.name);
        const fullText = prefix + diffs.map(d => d.text).join(' ');
        card.compareText.setText(fullText);

        // Color based on overall direction with arrow indicators
        const hasUpgrade = diffs.some(d => d.positive);
        const hasDowngrade = diffs.some(d => !d.positive);
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

      // Net cost display
      if (currentEquip.cost > 0) {
        const sellback = Math.floor(currentEquip.cost * SELL_PRICE_RATIO);
        const netCost = card.item.cost - sellback;
        card.priceText.setText(UI.shop.netCost(card.item.cost, netCost));
        card.priceText.setColor(baseColor);
      } else {
        card.priceText.setText(`${card.item.cost}G`);
        card.priceText.setColor(baseColor);
      }
    }
  }

  private buyItem(item: ItemData, container: Phaser.GameObjects.Container, priceText: Phaser.GameObjects.Text): void {
    // Prevent double-purchase
    const card = this.itemCards.find(c => c.item === item);
    if (card?.sold) return;

    const rm = RunManager.getInstance();

    if (!this.selectedHero) {
      AudioManager.getInstance().playSfx('sfx_error');
      this.showMessage(UI.shop.selectFirst);
      return;
    }

    if (!rm.spendGold(item.cost)) {
      AudioManager.getInstance().playSfx('sfx_error');
      this.showMessage(UI.shop.noGold);
      return;
    }

    const oldItem = rm.equipItem(this.selectedHero.id, item);

    // Sell-back: credit 50% of replaced item's cost
    if (oldItem && oldItem.cost > 0) {
      const sellPrice = Math.floor(oldItem.cost * SELL_PRICE_RATIO);
      rm.addGold(sellPrice);
      this.showMessage(UI.shop.sellback(sellPrice));
    }

    AudioManager.getInstance().playSfx('sfx_buy');
    this.goldText.setText(`${rm.getGold()}G`);

    // Mark as sold and disable interaction
    if (card) {
      card.sold = true;
      try {
        const children = container.getAll?.() ?? [];
        for (const child of children) {
          if (child.input) (child as Phaser.GameObjects.Rectangle).disableInteractive();
        }
      } catch { /* container mock may not support getAll */ }
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

    this.updateRefreshButton();

    // Refresh comparison since equipment changed
    this.updateComparisonTexts();

    if (oldItem) {
      this.showMessage(UI.shop.replaced(item.name, oldItem.name));
    } else {
      this.showMessage(UI.shop.equipped(item.name));
    }
  }

  private showMessage(text: string): void {
    const msg = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT - 65, text, 'body', {
      color: '#ffffff',
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

  private getRefreshCost(): number {
    return SHOP_REFRESH_BASE_COST * Math.pow(2, this.refreshCount);
  }

  private updateRefreshButton(): void {
    const cost = this.getRefreshCost();
    const canAfford = RunManager.getInstance().getGold() >= cost;
    this.refreshBtn.setText(UI.shop.refresh(cost));
    this.refreshBtn.setAlpha(canAfford ? 1 : 0.5);
  }

  private refreshShop(): void {
    const rm = RunManager.getInstance();
    const cost = this.getRefreshCost();

    if (!rm.spendGold(cost)) {
      AudioManager.getInstance().playSfx('sfx_error');
      return;
    }

    this.refreshCount++;
    AudioManager.getInstance().playSfx('sfx_coin');

    // Fade out old cards, then destroy and rebuild
    const oldContainers = this.itemCards.map(c => c.container);
    this.tweens.add({
      targets: oldContainers,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        for (const card of this.itemCards) {
          card.container.destroy();
        }
        this.itemCards = [];

        // Regenerate inventory
        const rng = rm.getRng();
        this.shopItems = ShopGenerator.generate(rng, rm.getCurrentAct());

        // Rebuild cards at alpha 0, then fade in
        this.shopItems.forEach((item, i) => {
          const x = 70 + (i % 3) * 230;
          const y = 155 + Math.floor(i / 3) * 120;
          this.createItemCard(item, x, y, rm);
        });

        // Fade in new cards
        const newContainers = this.itemCards.map(c => c.container);
        for (const c of newContainers) c.setAlpha(0);
        this.tweens.add({
          targets: newContainers,
          alpha: 1,
          duration: 200,
        });

        // Update UI
        this.goldText.setText(`${rm.getGold()}G`);
        this.updateRefreshButton();
        if (this.selectedHero) {
          this.updateComparisonTexts();
        }
      },
    });
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

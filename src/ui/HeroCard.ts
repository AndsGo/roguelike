import Phaser from 'phaser';
import { HeroData, HeroState, EquipmentSlot } from '../types';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from './Theme';

export class HeroCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private expanded: boolean = false;
  private detailContainer: Phaser.GameObjects.Container | null = null;
  private cardWidth: number = 130;
  private cardHeight: number = 160;
  private heroData: HeroData;
  private heroState: HeroState;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    heroState: HeroState,
  ) {
    super(scene, x, y);
    this.heroData = heroData;
    this.heroState = heroState;

    const rarityColor = this.getRarityBorderColor();

    // Card background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(Theme.colors.panel, 0.9);
    this.bg.fillRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);
    this.bg.lineStyle(2, rarityColor, 1);
    this.bg.strokeRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);
    this.add(this.bg);

    // Element icon (colored circle)
    if (heroData.element) {
      const elColor = Theme.colors.element[heroData.element] ?? 0xffffff;
      const elCircle = scene.add.graphics();
      elCircle.fillStyle(elColor, 1);
      elCircle.fillCircle(this.cardWidth / 2 - 16, -this.cardHeight / 2 + 16, 8);
      elCircle.lineStyle(1, 0xffffff, 0.5);
      elCircle.strokeCircle(this.cardWidth / 2 - 16, -this.cardHeight / 2 + 16, 8);
      this.add(elCircle);
    }

    // Hero icon placeholder (role-based color)
    const iconColor = this.getRoleColor(heroData.role);
    const icon = scene.add.rectangle(0, -42, 32, 32, iconColor);
    icon.setStrokeStyle(1, 0xffffff, 0.3);
    this.add(icon);

    // Role initial on icon
    const roleInitial = scene.add.text(0, -42, heroData.role.charAt(0).toUpperCase(), {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(roleInitial);

    // Name
    const name = scene.add.text(0, -17, heroData.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(name);

    // Level
    const level = scene.add.text(0, -3, `Lv.${heroState.level}`, {
      fontSize: '9px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(level);

    // HP bar
    const rm = RunManager.getInstance();
    const maxHp = rm.getMaxHp(heroState, heroData);
    const hpRatio = heroState.currentHp / maxHp;
    this.drawMiniHpBar(scene, 0, 12, 100, 6, hpRatio);

    const hpText = scene.add.text(0, 24, `${heroState.currentHp}/${maxHp}`, {
      fontSize: '8px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(hpText);

    // Stats summary
    const stats = heroData.baseStats;
    const scaling = heroData.scalingPerLevel;
    const lvl = heroState.level;
    const atk = stats.attack + scaling.attack * (lvl - 1);
    const def = stats.defense + scaling.defense * (lvl - 1);
    const statsText = scene.add.text(0, 38, `ATK:${atk}  DEF:${def}`, {
      fontSize: '8px',
      color: '#aaccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(statsText);

    // Equipment slots (3 small boxes)
    const slotNames: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    const slotIcons = ['W', 'A', 'R'];
    for (let i = 0; i < 3; i++) {
      const sx = -30 + i * 30;
      const sy = 56;
      const equipped = heroState.equipment[slotNames[i]];
      const slotColor = equipped
        ? (Theme.colors.rarity[equipped.rarity] ?? 0x888888)
        : 0x333344;
      const slot = scene.add.graphics();
      slot.fillStyle(slotColor, equipped ? 0.8 : 0.4);
      slot.fillRoundedRect(sx - 10, sy - 8, 20, 16, 3);
      this.add(slot);

      const slotLabel = scene.add.text(sx, sy, equipped ? slotIcons[i] : '-', {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add(slotLabel);
    }

    // Click to expand details
    this.setSize(this.cardWidth, this.cardHeight);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => this.toggleDetails());

    scene.add.existing(this);
  }

  private drawMiniHpBar(scene: Phaser.Scene, x: number, y: number, width: number, height: number, ratio: number): void {
    const g = scene.add.graphics();
    // Background
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 2);
    // Fill
    const fillColor = ratio > 0.6 ? 0x44ff44 : ratio > 0.3 ? 0xffaa00 : 0xff4444;
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x - width / 2, y - height / 2, width * ratio, height, 2);
    this.add(g);
  }

  private toggleDetails(): void {
    if (this.expanded) {
      this.collapseDetails();
    } else {
      this.expandDetails();
    }
  }

  private expandDetails(): void {
    this.expanded = true;
    const scene = this.scene;
    this.detailContainer = scene.add.container(0, this.cardHeight / 2 + 5);

    const detailBg = scene.add.graphics();
    detailBg.fillStyle(Theme.colors.panel, 0.95);
    detailBg.fillRoundedRect(-this.cardWidth / 2, 0, this.cardWidth, 90, 4);
    detailBg.lineStyle(1, Theme.colors.panelBorder, 1);
    detailBg.strokeRoundedRect(-this.cardWidth / 2, 0, this.cardWidth, 90, 4);
    this.detailContainer.add(detailBg);

    const stats = this.heroData.baseStats;
    const scaling = this.heroData.scalingPerLevel;
    const lvl = this.heroState.level;

    const lines = [
      `SPD: ${stats.speed}  ASPD: ${stats.attackSpeed.toFixed(1)}`,
      `CRIT: ${Math.round(stats.critChance * 100)}%  x${stats.critDamage}`,
      `M.POW: ${stats.magicPower + scaling.magicPower * (lvl - 1)}`,
      `M.RES: ${stats.magicResist + scaling.magicResist * (lvl - 1)}`,
      `RNG: ${stats.attackRange}`,
    ];

    lines.forEach((line, i) => {
      const t = scene.add.text(-this.cardWidth / 2 + 8, 6 + i * 16, line, {
        fontSize: '8px',
        color: '#bbbbbb',
        fontFamily: 'monospace',
      });
      this.detailContainer!.add(t);
    });

    // Skills list
    if (this.heroData.skills.length > 0) {
      const skillText = scene.add.text(-this.cardWidth / 2 + 8, 82, `Skills: ${this.heroData.skills.join(', ')}`, {
        fontSize: '7px',
        color: '#8899cc',
        fontFamily: 'monospace',
        wordWrap: { width: this.cardWidth - 16 },
      });
      this.detailContainer.add(skillText);
    }

    this.add(this.detailContainer);

    // Animate in
    this.detailContainer.setAlpha(0);
    this.detailContainer.y = this.cardHeight / 2 - 10;
    scene.tweens.add({
      targets: this.detailContainer,
      alpha: 1,
      y: this.cardHeight / 2 + 5,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  private collapseDetails(): void {
    this.expanded = false;
    if (this.detailContainer) {
      this.scene.tweens.add({
        targets: this.detailContainer,
        alpha: 0,
        duration: 100,
        onComplete: () => {
          this.detailContainer?.destroy();
          this.detailContainer = null;
        },
      });
    }
  }

  private getRarityBorderColor(): number {
    // Use highest rarity equipment for card border
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    let bestRarity = -1;
    for (const slot of slots) {
      const item = this.heroState.equipment[slot];
      if (item) {
        const idx = rarityOrder.indexOf(item.rarity);
        if (idx > bestRarity) bestRarity = idx;
      }
    }
    if (bestRarity >= 0) {
      return Theme.colors.rarity[rarityOrder[bestRarity]] ?? Theme.colors.panelBorder;
    }
    return Theme.colors.panelBorder;
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
}

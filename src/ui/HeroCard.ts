import Phaser from 'phaser';
import { HeroData, HeroState, EquipmentSlot } from '../types';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString, getElementColor } from './Theme';
import { UI } from '../i18n';
import { HeroDetailPopup } from './HeroDetailPopup';

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

    // Element icon (colored circle + symbol)
    if (heroData.element) {
      const elColor = getElementColor(heroData.element);
      const elX = this.cardWidth / 2 - 16;
      const elY = -this.cardHeight / 2 + 16;
      const elCircle = scene.add.graphics();
      elCircle.fillStyle(elColor, 1);
      elCircle.fillCircle(elX, elY, 8);
      elCircle.lineStyle(1, 0xffffff, 0.5);
      elCircle.strokeCircle(elX, elY, 8);
      this.add(elCircle);
      const elSym = Theme.colors.elementSymbol[heroData.element] ?? '';
      if (elSym) {
        const symText = scene.add.text(elX, elY, elSym, {
          fontSize: '8px', color: '#000000', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(symText);
      }
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
      fontSize: '9px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(hpText);

    // Stats summary (include equipment bonuses)
    const stats = heroData.baseStats;
    const scaling = heroData.scalingPerLevel;
    const lvl = heroState.level;
    const mainEqBonus: Record<string, number> = {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const equip = heroState.equipment[slot];
      if (equip) {
        for (const [k, v] of Object.entries(equip.stats)) {
          mainEqBonus[k] = (mainEqBonus[k] ?? 0) + (v as number);
        }
      }
    }
    const atk = stats.attack + scaling.attack * (lvl - 1) + (mainEqBonus['attack'] ?? 0);
    const def = stats.defense + scaling.defense * (lvl - 1) + (mainEqBonus['defense'] ?? 0);
    const statsText = scene.add.text(0, 38, UI.heroCard.atkDef(atk, def), {
      fontSize: '9px',
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
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add(slotLabel);
    }

    // Click to expand details, right-click for full popup
    this.setSize(this.cardWidth, this.cardHeight);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.openDetailPopup();
      } else {
        this.toggleDetails();
      }
    });

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

    // Include equipment bonuses in expanded stats
    const eqBonus: Record<string, number> = {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const equip = this.heroState.equipment[slot];
      if (equip) {
        for (const [k, v] of Object.entries(equip.stats)) {
          eqBonus[k] = (eqBonus[k] ?? 0) + (v as number);
        }
      }
    }

    const lines = [
      UI.heroCard.spdAspd(stats.speed + (eqBonus['speed'] ?? 0), stats.attackSpeed + (eqBonus['attackSpeed'] ?? 0)),
      UI.heroCard.crit(stats.critChance + (eqBonus['critChance'] ?? 0), stats.critDamage + (eqBonus['critDamage'] ?? 0)),
      UI.heroCard.magicPow(stats.magicPower + scaling.magicPower * (lvl - 1) + (eqBonus['magicPower'] ?? 0)),
      UI.heroCard.magicRes(stats.magicResist + scaling.magicResist * (lvl - 1) + (eqBonus['magicResist'] ?? 0)),
      UI.heroCard.range(stats.attackRange + (eqBonus['attackRange'] ?? 0)),
    ];

    lines.forEach((line, i) => {
      const t = scene.add.text(-this.cardWidth / 2 + 8, 6 + i * 16, line, {
        fontSize: '9px',
        color: '#bbbbbb',
        fontFamily: 'monospace',
      });
      this.detailContainer!.add(t);
    });

    // Skills list
    if (this.heroData.skills.length > 0) {
      const skillText = scene.add.text(-this.cardWidth / 2 + 8, 82, UI.heroCard.skills(this.heroData.skills.join(', ')), {
        fontSize: '9px',
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

  private openDetailPopup(): void {
    new HeroDetailPopup(this.scene, this.heroData, this.heroState);
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

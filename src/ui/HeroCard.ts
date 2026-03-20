import Phaser from 'phaser';
import { HeroData, HeroState, EquipmentSlot } from '../types';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString, getRarityColor, getRoleColor } from './Theme';
import { UI } from '../i18n';
import { HeroDetailPopup } from './HeroDetailPopup';
import { TextFactory } from './TextFactory';
import { drawRoleIcon, drawElementIcon } from './PixelIcons';
import { getOrCreateTexture, ChibiConfig } from '../systems/UnitRenderer';

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

    const roleColor = getRoleColor(heroData.role);

    // Card background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(Theme.colors.panel, 0.9);
    this.bg.fillRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);
    this.bg.lineStyle(2, roleColor, 1);
    this.bg.strokeRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);
    this.add(this.bg);

    // ── Top identity zone (y: -80 to -34) ──

    // Role pixel icon (8x8, scale=2) top-left
    const iconG = scene.add.graphics();
    drawRoleIcon(iconG, -this.cardWidth / 2 + 6, -this.cardHeight / 2 + 6, heroData.role, 2);
    this.add(iconG);

    // Element pixel icon (8x8, scale=2) top-right
    if (heroData.element) {
      const elIconG = scene.add.graphics();
      drawElementIcon(elIconG, this.cardWidth / 2 - 22, -this.cardHeight / 2 + 6, heroData.element, 2);
      this.add(elIconG);
    }

    // Chibi sprite centered
    const chibiConfig: ChibiConfig = {
      role: heroData.role as ChibiConfig['role'],
      race: (heroData.race ?? 'human') as ChibiConfig['race'],
      classType: (heroData.class ?? 'warrior') as ChibiConfig['classType'],
      fillColor: getRoleColor(heroData.role),
      borderColor: 0x000000,
      isHero: true,
      isBoss: false,
    };
    const textureKey = getOrCreateTexture(scene, chibiConfig);
    const chibiSprite = scene.add.image(0, -52, textureKey);
    chibiSprite.setOrigin(0.5);
    this.add(chibiSprite);

    // ── Middle status zone (y: -34 to +10) ──

    // Name + Level
    const name = TextFactory.create(scene, 0, -30, `${heroData.name} Lv.${heroState.level}`, 'body', {
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(name);

    // HP bar
    const rm = RunManager.getInstance();
    const maxHp = rm.getMaxHp(heroState, heroData);
    const hpRatio = heroState.currentHp / maxHp;
    this.drawMiniHpBar(scene, 0, -16, 100, 6, hpRatio);

    // Role tag (tiny, role color)
    const roleTag = UI.heroCard.roleTag[heroData.role] ?? heroData.role;
    const roleTagText = TextFactory.create(scene, 0, -6, roleTag, 'tiny', {
      color: colorToString(roleColor),
    }).setOrigin(0.5);
    this.add(roleTagText);

    // ── Bottom summary zone (y: +10 to +80) ──

    // Stats summary (attack + defense with equipment bonuses)
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
    const statsText = TextFactory.create(scene, 0, 18, UI.heroCard.atkDef(atk, def), 'small', {
      color: '#aaccff',
    }).setOrigin(0.5);
    this.add(statsText);

    // Equipment slots (3 small boxes)
    const slotNames: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    const slotIcons = ['W', 'A', 'R'];
    for (let i = 0; i < 3; i++) {
      const sx = -30 + i * 30;
      const sy = 40;
      const equipped = heroState.equipment[slotNames[i]];
      const slotColor = equipped
        ? getRarityColor(equipped.rarity)
        : 0x333344;
      const slot = scene.add.graphics();
      slot.fillStyle(slotColor, equipped ? 0.8 : 0.4);
      slot.fillRoundedRect(sx - 10, sy - 8, 20, 16, 3);
      this.add(slot);

      const slotLabel = TextFactory.create(scene, sx, sy, equipped ? slotIcons[i] : '-', 'small', {
        color: '#ffffff',
      }).setOrigin(0.5);
      this.add(slotLabel);
    }

    // Click to expand details, right-click for full popup
    this.setSize(this.cardWidth, this.cardHeight);
    this.setInteractive({ useHandCursor: true });
    let downX = 0, downY = 0;
    this.on('pointerdown', (p: Phaser.Input.Pointer) => { downX = p.x; downY = p.y; });
    this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - downX, dy = pointer.y - downY;
      if (dx * dx + dy * dy < 400) {
        if (pointer.rightButtonReleased()) {
          this.openDetailPopup();
        } else {
          this.toggleDetails();
        }
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
      const t = TextFactory.create(scene, -this.cardWidth / 2 + 8, 6 + i * 16, line, 'small', {
        color: '#bbbbbb',
      });
      this.detailContainer!.add(t);
    });

    // Skills list
    if (this.heroData.skills.length > 0) {
      const skillText = TextFactory.create(scene, -this.cardWidth / 2 + 8, 82, UI.heroCard.skills(this.heroData.skills.join(', ')), 'small', {
        color: '#8899cc',
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

}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, getElementColor } from './Theme';
import { TextFactory } from './TextFactory';
import { Hero } from '../entities/Hero';
import { UltimateSystem } from '../systems/UltimateSystem';
import { EventBus } from '../systems/EventBus';
import { SkillData } from '../types';
import skillsData from '../data/skills.json';

const BUTTON_SIZE = 36;
const BUTTON_GAP = 8;
const BAR_Y = GAME_HEIGHT - 100; // Above SkillBar (which is at GAME_HEIGHT - 50)

/**
 * Ultimate skill bar — 4 circular buttons (one per party slot).
 * Each button shows an energy ring fill that grows as energy charges.
 * When full (100%), the button glows and can be clicked or triggered via Q/W/E/R.
 */
export class UltimateBar extends Phaser.GameObjects.Container {
  private slots: UltimateSlot[] = [];
  private ultimateSystem: UltimateSystem;
  private heroes: Hero[];

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    ultimateSystem: UltimateSystem,
  ) {
    super(scene, 0, 0);
    this.heroes = heroes;
    this.ultimateSystem = ultimateSystem;
    this.setDepth(101);

    this.buildSlots();
    scene.add.existing(this);
  }

  private buildSlots(): void {
    const count = Math.min(this.heroes.length, 4);
    const totalWidth = count * (BUTTON_SIZE + BUTTON_GAP) - BUTTON_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    for (let i = 0; i < count; i++) {
      const hero = this.heroes[i];
      const ultSkillId = this.ultimateSystem.getUltimateSkillId(hero.unitId);
      if (!ultSkillId) continue;

      const ultSkill = (skillsData as SkillData[]).find(s => s.id === ultSkillId);
      if (!ultSkill) continue;

      const x = startX + i * (BUTTON_SIZE + BUTTON_GAP);
      const slot = new UltimateSlot(
        this.scene,
        x,
        BAR_Y,
        hero,
        ultSkill,
        i,
        this.ultimateSystem,
      );
      this.slots.push(slot);
      this.add(slot);
    }
  }

  /** Call every frame to update energy ring displays */
  updateSlots(): void {
    for (const slot of this.slots) {
      slot.updateState();
    }
  }

  /** Fire an ultimate by hotkey index (0-3 maps to Q/W/E/R) */
  fireByHotkey(index: number): boolean {
    const slot = this.slots[index];
    if (!slot) return false;
    return slot.tryFire();
  }

  destroy(): void {
    for (const slot of this.slots) {
      slot.destroy();
    }
    super.destroy();
  }
}

/**
 * Individual ultimate slot — circular button with energy ring.
 */
class UltimateSlot extends Phaser.GameObjects.Container {
  private hero: Hero;
  private skill: SkillData;
  private ultimateSystem: UltimateSystem;
  private ringGraphics: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private energyText: Phaser.GameObjects.Text;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private isReady: boolean = false;
  private lastEnergyRatio: number = -1;
  private readyTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hero: Hero,
    skill: SkillData,
    slotIndex: number,
    ultimateSystem: UltimateSystem,
  ) {
    super(scene, x, y);
    this.hero = hero;
    this.skill = skill;
    this.ultimateSystem = ultimateSystem;

    const cx = BUTTON_SIZE / 2;
    const cy = BUTTON_SIZE / 2;
    const radius = BUTTON_SIZE / 2;

    // Background circle
    const bgGraphics = scene.add.graphics();
    bgGraphics.fillStyle(Theme.colors.panel, 0.85);
    bgGraphics.fillCircle(cx, cy, radius);
    bgGraphics.lineStyle(1, Theme.colors.panelBorder, 0.6);
    bgGraphics.strokeCircle(cx, cy, radius);
    this.add(bgGraphics);

    // Energy ring (redrawn each frame based on energy %)
    this.ringGraphics = scene.add.graphics();
    this.add(this.ringGraphics);

    // Skill name (1-2 chars)
    this.nameText = TextFactory.create(scene, cx, cy - 3, skill.name.substring(0, 2), 'label', {
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Hero name below (tiny)
    const heroLabel = TextFactory.create(scene, cx, BUTTON_SIZE + 2, hero.unitName.substring(0, 2), 'tiny', {
      color: '#888888',
    }).setOrigin(0.5, 0);
    this.add(heroLabel);

    // Hotkey label (Q/W/E/R)
    const hotkeys = ['Q', 'W', 'E', 'R'];
    const hotkeyText = TextFactory.create(scene, BUTTON_SIZE - 2, 2, hotkeys[slotIndex] ?? '', 'tiny', {
      color: '#666666',
    }).setOrigin(1, 0);
    this.add(hotkeyText);

    // Energy percentage text
    this.energyText = TextFactory.create(scene, cx, cy + 8, '0%', 'tiny', {
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add(this.energyText);

    // Interactive hit area (pointerup with distance check per project convention)
    const hitArea = scene.add.rectangle(cx, cy, BUTTON_SIZE + 4, BUTTON_SIZE + 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    let downX = 0, downY = 0;
    hitArea.on('pointerdown', (_p: unknown, x: number, y: number) => { downX = x; downY = y; });
    hitArea.on('pointerup', (_p: unknown, x: number, y: number) => {
      const dist = Math.sqrt((x - downX) ** 2 + (y - downY) ** 2);
      if (dist < 20) this.tryFire();
    });
    hitArea.on('pointerover', () => this.showTooltip());
    hitArea.on('pointerout', () => this.hideTooltip());
    this.add(hitArea);
  }

  /** Update visual state based on current energy */
  updateState(): void {
    if (!this.hero.isAlive) {
      this.setAlpha(0.3);
      return;
    }
    this.setAlpha(1);

    const energy = this.ultimateSystem.getEnergy(this.hero.unitId);
    const ratio = Math.min(1, energy / 100);

    // Only redraw ring if changed significantly
    if (Math.abs(ratio - this.lastEnergyRatio) > 0.02 || (ratio >= 1) !== (this.lastEnergyRatio >= 1)) {
      this.lastEnergyRatio = ratio;
      this.drawEnergyRing(ratio);
      this.energyText.setText(`${Math.floor(energy)}%`);
    }

    // Ready state transition
    const ready = ratio >= 1;
    if (ready && !this.isReady) {
      this.isReady = true;
      this.energyText.setText('\u5C31\u7EEA');
      this.energyText.setColor('#ffcc00');
      this.nameText.setColor('#ffcc00');
      // Pulse glow
      this.readyTween = this.scene.tweens.add({
        targets: this.ringGraphics,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!ready && this.isReady) {
      this.isReady = false;
      this.energyText.setColor('#aaaaaa');
      this.nameText.setColor('#ffffff');
      if (this.readyTween) {
        this.readyTween.stop();
        this.readyTween = null;
      }
      this.ringGraphics.setAlpha(1);
    }
  }

  private drawEnergyRing(ratio: number): void {
    this.ringGraphics.clear();
    if (ratio <= 0) return;

    const cx = BUTTON_SIZE / 2;
    const cy = BUTTON_SIZE / 2;
    const radius = BUTTON_SIZE / 2 - 1;

    // Determine ring color based on hero element or default gold
    const color = this.isReady ? 0xffcc00 : (
      this.hero.element ? getElementColor(this.hero.element) : Theme.colors.primary
    );

    // Draw arc from top (-90 deg) clockwise
    this.ringGraphics.lineStyle(3, color, 0.9);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * ratio);

    // Approximate arc with line segments
    const segments = Math.max(4, Math.ceil(ratio * 24));
    this.ringGraphics.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) {
        this.ringGraphics.moveTo(px, py);
      } else {
        this.ringGraphics.lineTo(px, py);
      }
    }
    this.ringGraphics.strokePath();
  }

  private showTooltip(): void {
    if (this.tooltip) return;

    const targetLabels: Record<string, string> = {
      enemy: '敌方单体', ally: '友方单体', self: '自身',
      all_enemies: '全体敌方', all_allies: '全体友方',
    };
    const elementStr = this.skill.element ? ` [${this.skill.element}]` : '';
    const lines: string[] = [
      `★ ${this.skill.name}${elementStr}`,
      `目标: ${targetLabels[this.skill.targetType] ?? this.skill.targetType}`,
    ];
    if (this.skill.scalingRatio) {
      const ratio = Math.round(this.skill.scalingRatio * 100);
      lines.push(`倍率: ${ratio}% ${this.skill.scalingStat === 'magicPower' ? '法力' : '攻击'}`);
    }

    const cx = BUTTON_SIZE / 2;
    this.tooltip = this.scene.add.container(cx, -8);

    const text = TextFactory.create(this.scene, 0, 0, lines.join('\n'), 'small', {
      color: '#ffffff',
      lineSpacing: 2,
    }).setOrigin(0.5, 1);

    const padding = 6;
    const bg = this.scene.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.95);
    bg.fillRoundedRect(
      -text.width / 2 - padding, -text.height - padding,
      text.width + padding * 2, text.height + padding * 2, 4,
    );
    bg.lineStyle(1, Theme.colors.panelBorder, 0.7);
    bg.strokeRoundedRect(
      -text.width / 2 - padding, -text.height - padding,
      text.width + padding * 2, text.height + padding * 2, 4,
    );

    this.tooltip.add(bg);
    this.tooltip.add(text);
    this.tooltip.setDepth(200);
    this.add(this.tooltip);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  /** Attempt to fire this ultimate */
  tryFire(): boolean {
    if (!this.isReady || !this.hero.isAlive) return false;

    const targetType = this.skill.targetType;
    if (targetType === 'enemy' || targetType === 'ally') {
      // Enter targeting mode
      EventBus.getInstance().emit('skill:targetRequest', {
        unitId: this.hero.unitId,
        skillId: this.skill.id,
        targetType,
      });
    } else {
      // Self/all-target: fire directly
      this.ultimateSystem.consumeEnergy(this.hero.unitId);
      EventBus.getInstance().emit('skill:manualFire', {
        unitId: this.hero.unitId,
        skillId: this.skill.id,
      });
    }
    return true;
  }

  destroy(): void {
    if (this.readyTween) {
      this.readyTween.stop();
      this.readyTween = null;
    }
    super.destroy();
  }
}

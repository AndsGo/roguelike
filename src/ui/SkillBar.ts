import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, colorToString } from './Theme';
import { SkillQueueSystem } from '../systems/SkillQueueSystem';
import { Hero } from '../entities/Hero';
import { SkillData } from '../types';
import { UI } from '../i18n';
import { EventBus } from '../systems/EventBus';
import skillsData from '../data/skills.json';

const SLOT_SIZE = 44;
const SLOT_GAP = 4;
const BAR_Y = GAME_HEIGHT - 50;

/**
 * Bottom-center skill bar showing up to 8 skill slots (4 heroes × 2 skills).
 * Shows cooldown overlay, ready pulse animation, and hotkey labels (1-8).
 */
export class SkillBar extends Phaser.GameObjects.Container {
  private slots: SkillSlot[] = [];
  private skillQueue: SkillQueueSystem;
  private heroes: Hero[];

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    skillQueue: SkillQueueSystem,
  ) {
    super(scene, 0, 0);
    this.heroes = heroes;
    this.skillQueue = skillQueue;
    this.setDepth(101);

    this.buildSlots();
    scene.add.existing(this);
  }

  private buildSlots(): void {
    const allSkillSlots: { hero: Hero; skill: SkillData; index: number }[] = [];

    for (const hero of this.heroes) {
      for (const skill of hero.skills) {
        allSkillSlots.push({ hero, skill, index: allSkillSlots.length });
      }
    }

    // Cap at 8 slots
    const visibleSlots = allSkillSlots.slice(0, 8);
    const totalWidth = visibleSlots.length * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    for (const entry of visibleSlots) {
      const x = startX + entry.index * (SLOT_SIZE + SLOT_GAP);
      const slot = new SkillSlot(
        this.scene,
        x,
        BAR_Y,
        entry.hero,
        entry.skill,
        entry.index + 1, // hotkey label 1-8
        this.skillQueue,
      );
      this.slots.push(slot);
      this.add(slot);
    }
  }

  /** Call every frame to update cooldown overlays, ready state, and queue position */
  updateSlots(): void {
    const readyEntries = this.skillQueue.getReadySkills();
    for (const slot of this.slots) {
      slot.updateState(readyEntries);
    }
  }

  /** Fire a skill by hotkey index (1-8) */
  fireByHotkey(index: number): boolean {
    const slot = this.slots[index - 1];
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
 * Individual skill slot in the bar.
 */
class SkillSlot extends Phaser.GameObjects.Container {
  private hero: Hero;
  private skill: SkillData;
  private skillQueue: SkillQueueSystem;
  private bg: Phaser.GameObjects.Graphics;
  private cdOverlay: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hotkeyText: Phaser.GameObjects.Text;
  private readyGlow: Phaser.GameObjects.Graphics;
  private queueBadge: Phaser.GameObjects.Text;
  private tooltip: Phaser.GameObjects.Container | null = null;
  private isReady: boolean = false;
  private lastCdRatio: number = -1;
  private lastQueuePos: number = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hero: Hero,
    skill: SkillData,
    hotkeyNum: number,
    skillQueue: SkillQueueSystem,
  ) {
    super(scene, x, y);
    this.hero = hero;
    this.skill = skill;
    this.skillQueue = skillQueue;

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(Theme.colors.panel, 0.85);
    this.bg.fillRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 4);
    this.bg.lineStyle(1, Theme.colors.panelBorder, 0.6);
    this.bg.strokeRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 4);
    this.add(this.bg);

    // Ready glow (hidden by default)
    this.readyGlow = scene.add.graphics();
    this.readyGlow.lineStyle(2, Theme.colors.success, 0.8);
    this.readyGlow.strokeRoundedRect(-1, -1, SLOT_SIZE + 2, SLOT_SIZE + 2, 5);
    this.readyGlow.setAlpha(0);
    this.add(this.readyGlow);

    // Queue position badge (top-left, hidden by default)
    this.queueBadge = scene.add.text(2, 2, '', {
      fontSize: '9px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
    }).setOrigin(0, 0).setAlpha(0);
    this.add(this.queueBadge);

    // Skill name (abbreviated, 2 chars)
    const skillName = this.getSkillDisplayName(skill.id);
    this.nameText = scene.add.text(SLOT_SIZE / 2, SLOT_SIZE / 2 - 4, skillName.substring(0, 3), {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Hero name indicator (tiny, bottom)
    const heroLabel = scene.add.text(SLOT_SIZE / 2, SLOT_SIZE - 4, hero.unitName.substring(0, 2), {
      fontSize: '7px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1);
    this.add(heroLabel);

    // Hotkey label (top-right corner)
    this.hotkeyText = scene.add.text(SLOT_SIZE - 3, 2, `${hotkeyNum}`, {
      fontSize: '7px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.add(this.hotkeyText);

    // Cooldown overlay
    this.cdOverlay = scene.add.graphics();
    this.add(this.cdOverlay);

    // Interactive hit area
    const hitArea = scene.add.rectangle(SLOT_SIZE / 2, SLOT_SIZE / 2, SLOT_SIZE + 4, SLOT_SIZE + 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.tryFire());
    hitArea.on('pointerover', () => this.showTooltip());
    hitArea.on('pointerout', () => this.hideTooltip());
    this.add(hitArea);
  }

  private getSkillDisplayName(skillId: string): string {
    const data = (skillsData as SkillData[]).find(s => s.id === skillId);
    return data?.name ?? skillId;
  }

  /** Update visual state based on cooldown and queue */
  updateState(readyEntries: { unitId: string; skillId: string }[]): void {
    if (!this.hero.isAlive) {
      this.setAlpha(0.3);
      this.isReady = false;
      return;
    }
    this.setAlpha(1);

    const cd = this.hero.skillCooldowns.get(this.skill.id) ?? 0;
    const maxCd = this.skill.cooldown;
    const cdRatio = maxCd > 0 ? Math.min(1, cd / maxCd) : 0;

    // Only redraw cooldown if changed significantly
    if (Math.abs(cdRatio - this.lastCdRatio) > 0.02 || (cdRatio === 0) !== (this.lastCdRatio === 0)) {
      this.lastCdRatio = cdRatio;
      this.cdOverlay.clear();
      if (cdRatio > 0) {
        this.cdOverlay.fillStyle(0x000000, 0.6);
        // Fill from bottom up proportional to remaining cooldown
        const h = SLOT_SIZE * cdRatio;
        this.cdOverlay.fillRect(1, SLOT_SIZE - h, SLOT_SIZE - 2, h);
      }
    }

    // Check if in queue (ready to fire) and get queue position
    const queueIdx = readyEntries.findIndex(
      e => e.unitId === this.hero.unitId && e.skillId === this.skill.id,
    );
    const queued = queueIdx >= 0;

    // Update queue position badge
    const queuePos = queued ? queueIdx + 1 : -1;
    if (queuePos !== this.lastQueuePos) {
      this.lastQueuePos = queuePos;
      if (queuePos > 0) {
        this.queueBadge.setText(`#${queuePos}`);
        this.queueBadge.setAlpha(1);
      } else {
        this.queueBadge.setAlpha(0);
      }
    }

    if (queued && !this.isReady) {
      this.isReady = true;
      this.readyGlow.setAlpha(1);
      // Pulse animation
      this.scene.tweens.add({
        targets: this.readyGlow,
        alpha: { from: 1, to: 0.3 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!queued && this.isReady) {
      this.isReady = false;
      this.scene.tweens.killTweensOf(this.readyGlow);
      this.readyGlow.setAlpha(0);
    }
  }

  /** Attempt to fire this skill. Returns true if successful. */
  tryFire(): boolean {
    if (!this.isReady) return false;

    // For targeted skills (enemy/ally single target), enter targeting mode
    const targetType = this.skill.targetType;
    if (targetType === 'enemy' || targetType === 'ally') {
      EventBus.getInstance().emit('skill:targetRequest', {
        unitId: this.hero.unitId,
        skillId: this.skill.id,
        targetType,
      });
      return true;
    }

    // Self/all-target skills fire immediately
    return this.skillQueue.fireSkill(this.hero.unitId, this.skill.id);
  }

  private showTooltip(): void {
    if (this.tooltip) return;

    const skillName = this.getSkillDisplayName(this.skill.id);
    const cd = this.skill.cooldown;
    const targetLabel = this.getTargetLabel(this.skill.targetType);
    const elementStr = this.skill.element ? ` [${this.skill.element}]` : '';

    const lines: string[] = [
      `${skillName}${elementStr}`,
      `冷却: ${cd}s`,
      `目标: ${targetLabel}`,
    ];

    // Add damage/heal info if available
    if (this.skill.scalingRatio) {
      const stat = this.skill.scalingStat ?? 'attack';
      const ratio = Math.round(this.skill.scalingRatio * 100);
      lines.push(`倍率: ${ratio}% ${stat === 'magicPower' ? '法力' : '攻击'}`);
    }

    const tooltipText = lines.join('\n');

    this.tooltip = this.scene.add.container(SLOT_SIZE / 2, -8);

    const text = this.scene.add.text(0, 0, tooltipText, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
      lineSpacing: 2,
    }).setOrigin(0.5, 1);

    const padding = 6;
    const bg = this.scene.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.95);
    bg.fillRoundedRect(
      -text.width / 2 - padding,
      -text.height - padding,
      text.width + padding * 2,
      text.height + padding * 2,
      4,
    );
    bg.lineStyle(1, Theme.colors.panelBorder, 0.7);
    bg.strokeRoundedRect(
      -text.width / 2 - padding,
      -text.height - padding,
      text.width + padding * 2,
      text.height + padding * 2,
      4,
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

  private getTargetLabel(targetType: string): string {
    const labels: Record<string, string> = {
      enemy: '敌方单体',
      ally: '友方单体',
      self: '自身',
      all_enemies: '全体敌方',
      all_allies: '全体友方',
    };
    return labels[targetType] ?? targetType;
  }
}

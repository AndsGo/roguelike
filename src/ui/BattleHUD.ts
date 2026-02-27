import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, colorToString } from './Theme';
import { Unit } from '../entities/Unit';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { EventBus } from '../systems/EventBus';
import { RunManager } from '../managers/RunManager';
import { SYNERGY_DEFINITIONS } from '../config/synergies';

/**
 * Battle HUD overlay showing:
 * - Top-left: hero portraits + mini HP bars
 * - Top-right: enemy portraits + mini HP bars
 * - Bottom-center: speed toggle buttons
 * - Bottom-left: active synergy icons
 * - Bottom-right: combo counter
 * - Collapsible damage stats panel
 */
export class BattleHUD extends Phaser.GameObjects.Container {
  private heroes: Hero[];
  private enemies: Enemy[];
  private heroPortraits: Phaser.GameObjects.Container[] = [];
  private enemyPortraits: Phaser.GameObjects.Container[] = [];
  private comboText: Phaser.GameObjects.Text;
  private comboCount: number = 0;
  private speedText: Phaser.GameObjects.Text;
  private currentSpeed: number = 1;
  private damageStats: Map<string, number> = new Map();
  private unitNameMap: Map<string, string> = new Map();
  private statsPanel: Phaser.GameObjects.Container | null = null;
  private statsVisible: boolean = false;
  private onSpeedChange?: (speed: number) => void;
  private onComboHit: (data: { unitId: string; comboCount: number }) => void;
  private onUnitDamage: (data: { sourceId: string; targetId: string; amount: number }) => void;

  constructor(
    scene: Phaser.Scene,
    heroes: Hero[],
    enemies: Enemy[],
    onSpeedChange?: (speed: number) => void,
  ) {
    super(scene, 0, 0);
    this.heroes = heroes;
    this.enemies = enemies;
    this.onSpeedChange = onSpeedChange;
    this.setDepth(100);

    // Build unitId -> unitName lookup for stats display
    for (const h of heroes) this.unitNameMap.set(h.unitId, h.unitName);
    for (const e of enemies) this.unitNameMap.set(e.unitId, e.unitName);

    // Hero portraits (top-left)
    this.createHeroPortraits();

    // Enemy portraits (top-right)
    this.createEnemyPortraits();

    // Speed control (bottom-center)
    this.speedText = this.createSpeedControl();

    // Synergy indicators (bottom-left)
    this.createSynergyIndicators();

    // Combo counter (bottom-right)
    this.comboText = scene.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 30, '', {
      fontSize: '20px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 1).setAlpha(0);
    this.add(this.comboText);

    // Stats toggle button — use padded hit zone for easier clicking
    const statsBtn = scene.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 65, '[统计]', {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(1, 1);
    this.add(statsBtn);

    const statsHit = scene.add.rectangle(GAME_WIDTH - 30, GAME_HEIGHT - 70, 56, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    statsHit.on('pointerdown', () => this.toggleStats());
    this.add(statsHit);

    // Listen for combo events (store refs for cleanup)
    this.onComboHit = (data) => {
      this.showCombo(data.comboCount);
    };
    this.onUnitDamage = (data) => {
      const current = this.damageStats.get(data.sourceId) ?? 0;
      this.damageStats.set(data.sourceId, current + data.amount);
    };
    EventBus.getInstance().on('combo:hit', this.onComboHit);
    EventBus.getInstance().on('unit:damage', this.onUnitDamage);

    scene.add.existing(this);
  }

  private createHeroPortraits(): void {
    this.heroes.forEach((hero, i) => {
      const container = this.scene.add.container(8, 32 + i * 22);

      // Mini colored box
      const box = this.scene.add.graphics();
      const roleColor = hero.isHero ? 0x4488ff : 0xff4444;
      box.fillStyle(roleColor, 0.8);
      box.fillRoundedRect(0, -6, 12, 12, 2);
      container.add(box);

      // Name
      const name = this.scene.add.text(16, 0, hero.unitName.substring(0, 6), {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      container.add(name);

      // Mini HP bar
      const hpBg = this.scene.add.graphics();
      hpBg.fillStyle(0x333333, 1);
      hpBg.fillRect(60, -3, 40, 5);
      container.add(hpBg);

      const hpFill = this.scene.add.graphics();
      container.add(hpFill);
      // Store reference for updates
      container.setData('hpFill', hpFill);
      container.setData('unit', hero);

      this.heroPortraits.push(container);
      this.add(container);
    });
  }

  private createEnemyPortraits(): void {
    this.enemies.forEach((enemy, i) => {
      const container = this.scene.add.container(GAME_WIDTH - 108, 32 + i * 22);

      // Mini HP bar
      const hpBg = this.scene.add.graphics();
      hpBg.fillStyle(0x333333, 1);
      hpBg.fillRect(0, -3, 40, 5);
      container.add(hpBg);

      const hpFill = this.scene.add.graphics();
      container.add(hpFill);
      container.setData('hpFill', hpFill);
      container.setData('unit', enemy);

      // Name
      const name = this.scene.add.text(44, 0, enemy.unitName.substring(0, 6), {
        fontSize: '8px',
        color: '#ff8888',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      container.add(name);

      // Mini colored box
      const box = this.scene.add.graphics();
      box.fillStyle(0xff4444, 0.8);
      box.fillRoundedRect(88, -6, 12, 12, 2);
      container.add(box);

      this.enemyPortraits.push(container);
      this.add(container);
    });
  }

  private createSpeedControl(): Phaser.GameObjects.Text {
    const bg = this.scene.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.7);
    bg.fillRoundedRect(GAME_WIDTH / 2 - 30, GAME_HEIGHT - 25, 60, 20, 4);
    bg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    bg.strokeRoundedRect(GAME_WIDTH / 2 - 30, GAME_HEIGHT - 25, 60, 20, 4);
    this.add(bg);

    const text = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 15, '1x', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(text);

    // Padded hit zone covering the full speed button background
    const speedHit = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 15, 72, 30, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    speedHit.on('pointerdown', () => {
      const speeds = [1, 2, 3];
      const idx = speeds.indexOf(this.currentSpeed);
      this.currentSpeed = speeds[(idx + 1) % speeds.length];
      text.setText(`${this.currentSpeed}x`);
      if (this.onSpeedChange) this.onSpeedChange(this.currentSpeed);
    });
    this.add(speedHit);

    return text;
  }

  private createSynergyIndicators(): void {
    const rm = RunManager.getInstance();
    const synergies = rm.getActiveSynergies();

    synergies.forEach((syn, i) => {
      const x = 10 + i * 22;
      const y = GAME_HEIGHT - 20;

      const circle = this.scene.add.graphics();
      circle.fillStyle(Theme.colors.primary, 0.7);
      circle.fillCircle(x, y, 8);
      circle.lineStyle(1, 0xffffff, 0.3);
      circle.strokeCircle(x, y, 8);
      this.add(circle);

      const label = this.scene.add.text(x, y, `${syn.count}`, {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add(label);

      // Synergy tooltip on hover
      const def = SYNERGY_DEFINITIONS.find(d => d.id === syn.synergyId);
      if (def) {
        const activeThreshold = def.thresholds.find(t => t.count <= syn.count);
        const bonusText = activeThreshold ? activeThreshold.description : '';
        const tooltipStr = `${def.name}\n${bonusText}`;

        const tooltip = this.scene.add.text(x, y - 16, tooltipStr, {
          fontSize: '7px',
          color: '#ffffff',
          fontFamily: 'monospace',
          backgroundColor: '#222222',
          padding: { left: 3, right: 3, top: 2, bottom: 2 },
        }).setOrigin(0, 1).setAlpha(0).setDepth(110);
        this.add(tooltip);

        // Create invisible hit zone for pointer events
        const hitZone = this.scene.add.zone(x, y, 18, 18).setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => tooltip.setAlpha(1));
        hitZone.on('pointerout', () => tooltip.setAlpha(0));
        this.add(hitZone);
      }
    });
  }

  private showCombo(count: number): void {
    this.comboCount = count;
    this.comboText.setText(`x${count}`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(1.5);

    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Fade out after 2s
    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: this.comboText,
        alpha: 0,
        duration: 300,
      });
    });
  }

  private toggleStats(): void {
    if (this.statsVisible && this.statsPanel) {
      this.statsPanel.destroy();
      this.statsPanel = null;
      this.statsVisible = false;
      return;
    }

    this.statsVisible = true;
    this.statsPanel = this.scene.add.container(GAME_WIDTH - 130, 80);

    const bg = this.scene.add.graphics();
    bg.fillStyle(Theme.colors.panel, 0.9);
    bg.fillRoundedRect(0, 0, 120, Math.max(40, this.damageStats.size * 16 + 20), 4);
    bg.lineStyle(1, Theme.colors.panelBorder, 0.5);
    bg.strokeRoundedRect(0, 0, 120, Math.max(40, this.damageStats.size * 16 + 20), 4);
    this.statsPanel.add(bg);

    const title = this.scene.add.text(60, 8, '伤害统计', {
      fontSize: '8px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.statsPanel.add(title);

    let yOffset = 24;
    for (const [unitId, dmg] of this.damageStats) {
      const displayName = this.unitNameMap.get(unitId) ?? unitId.substring(0, 8);
      const label = this.scene.add.text(8, yOffset, `${displayName}: ${dmg}`, {
        fontSize: '7px',
        color: '#cccccc',
        fontFamily: 'monospace',
      });
      this.statsPanel.add(label);
      yOffset += 14;
    }

    this.add(this.statsPanel);
  }

  destroy(): void {
    const eb = EventBus.getInstance();
    eb.off('combo:hit', this.onComboHit);
    eb.off('unit:damage', this.onUnitDamage);
    super.destroy();
  }

  /** Call every frame to update HP displays */
  updatePortraits(): void {
    const updateList = [...this.heroPortraits, ...this.enemyPortraits];
    for (const container of updateList) {
      const hpFill = container.getData('hpFill') as Phaser.GameObjects.Graphics | null;
      const unit = container.getData('unit') as Unit | null;
      if (!hpFill || !unit) continue;

      hpFill.clear();
      const ratio = Math.max(0, unit.currentHp / unit.currentStats.maxHp);
      const color = ratio > 0.6 ? 0x44ff44 : ratio > 0.3 ? 0xffaa00 : 0xff4444;
      const isHero = this.heroPortraits.includes(container);
      const barX = isHero ? 60 : 0;
      hpFill.fillStyle(color, 1);
      hpFill.fillRect(barX, -3, 40 * ratio, 5);

      // Dim dead units
      container.setAlpha(unit.isAlive ? 1 : 0.3);
    }
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BATTLE_GROUND_Y, HERO_START_X, ENEMY_START_X, UNIT_SPACING_Y } from '../constants';
import { RunManager } from '../managers/RunManager';
import { BattleSystem } from '../systems/BattleSystem';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { BattleNodeData, EnemyData, BattleResult, ElementType } from '../types';
import { BattleHUD } from '../ui/BattleHUD';
import { BattleEffects } from '../systems/BattleEffects';
import { ParticleManager } from '../systems/ParticleManager';
import { SceneTransition } from '../systems/SceneTransition';
import { EventBus } from '../systems/EventBus';
import { SaveManager } from '../managers/SaveManager';
import { Theme, colorToString } from '../ui/Theme';
import enemiesData from '../data/enemies.json';

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private nodeIndex!: number;
  private battleEndHandled: boolean = false;
  private hud!: BattleHUD;
  private effects!: BattleEffects;
  private particles!: ParticleManager;
  private allUnits: (Hero | Enemy)[] = [];

  // EventBus listener references for cleanup
  private onDamage!: (data: { sourceId: string; targetId: string; amount: number; isCrit: boolean; element?: ElementType }) => void;
  private onHeal!: (data: { sourceId: string; targetId: string; amount: number }) => void;
  private onDeath!: (data: { unitId: string; isHero: boolean }) => void;
  private onReaction!: (data: { element1: ElementType; element2: ElementType; targetId: string; reactionType: string }) => void;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.battleEndHandled = false;
    this.allUnits = [];
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    // Initialize effects systems
    this.effects = new BattleEffects(this);
    this.particles = new ParticleManager(this);

    // Node info
    const node = rm.getMap()[this.nodeIndex];
    const actIndex = rm.getCurrentAct();

    // Act-themed background
    const actBgColors = [0x0a1a0e, 0x1a0a0a, 0x0a0a1a]; // forest, volcano, abyss
    const bgColor = actBgColors[actIndex] ?? Theme.colors.background;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, bgColor);

    // Background decorations per act
    const bgDecor = this.add.graphics();
    bgDecor.setDepth(-1);
    switch (actIndex) {
      case 0: // Forest
        bgDecor.fillStyle(0x1a3a1e, 0.5);
        bgDecor.fillRect(0, BATTLE_GROUND_Y + 40, GAME_WIDTH, GAME_HEIGHT - BATTLE_GROUND_Y - 40);
        for (let i = 0; i < 5; i++) {
          const tx = 80 + i * 160;
          bgDecor.fillStyle(0x0a2a0e, 0.3);
          bgDecor.fillTriangle(tx, 30, tx - 20, BATTLE_GROUND_Y - 30, tx + 20, BATTLE_GROUND_Y - 30);
        }
        break;
      case 1: // Volcano
        bgDecor.fillStyle(0x3a1a0a, 0.5);
        bgDecor.fillRect(0, BATTLE_GROUND_Y + 40, GAME_WIDTH, GAME_HEIGHT - BATTLE_GROUND_Y - 40);
        bgDecor.lineStyle(2, 0xff4400, 0.2);
        bgDecor.lineBetween(0, BATTLE_GROUND_Y + 42, GAME_WIDTH, BATTLE_GROUND_Y + 42);
        bgDecor.fillStyle(0xff6600, 0.15);
        for (let i = 0; i < 8; i++) {
          bgDecor.fillCircle(100 + i * 90, 60 + (i % 3) * 40, 2);
        }
        break;
      case 2: // Abyss
        for (let i = 0; i < 10; i++) {
          bgDecor.fillStyle(0x1a0a2a, 0.1);
          bgDecor.fillRect(0, GAME_HEIGHT - i * 20, GAME_WIDTH, 20);
        }
        break;
    }

    // Ground line
    const ground = this.add.graphics();
    ground.lineStyle(1, 0x333355, 0.5);
    ground.lineBetween(0, BATTLE_GROUND_Y + 50, GAME_WIDTH, BATTLE_GROUND_Y + 50);

    // Boss vignette
    if (node.type === 'boss') {
      const vignette = this.add.graphics();
      vignette.lineStyle(4, 0xff2222, 0.4);
      vignette.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
      vignette.lineStyle(8, 0xff0000, 0.15);
      vignette.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    const typeLabel = node.type === 'boss' ? 'BOSS' : node.type === 'elite' ? 'ELITE' : 'BATTLE';
    const labelColor = node.type === 'boss' ? colorToString(Theme.colors.danger) : '#ffffff';
    this.add.text(GAME_WIDTH / 2, 12, typeLabel, {
      fontSize: '12px',
      color: labelColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create battle system
    this.battleSystem = new BattleSystem(rng);

    // Create heroes
    const heroStates = rm.getHeroes();
    const heroes: Hero[] = heroStates.map((state, i) => {
      const data = rm.getHeroData(state.id);
      const y = BATTLE_GROUND_Y - ((heroStates.length - 1) / 2 - i) * UNIT_SPACING_Y;
      return new Hero(this, HERO_START_X, y, data, state);
    });

    // Create enemies
    const battleData = node.data as BattleNodeData;
    const enemies: Enemy[] = battleData.enemies.map((e, i) => {
      const data = enemiesData.find(ed => ed.id === e.id) as EnemyData;
      const y = BATTLE_GROUND_Y - ((battleData.enemies.length - 1) / 2 - i) * UNIT_SPACING_Y;
      return new Enemy(this, ENEMY_START_X, y, data, e.level);
    });

    this.battleSystem.setUnits(heroes, enemies);

    // Create HUD
    this.hud = new BattleHUD(this, heroes, enemies, (speed) => {
      this.battleSystem.speedMultiplier = speed;
    });

    // Listen for visual events (store refs for cleanup in shutdown)
    this.allUnits = [...heroes, ...enemies];
    const allUnits = this.allUnits;

    this.onDamage = (data) => {
      if (data.isCrit) {
        this.effects.screenShake(0.008, 150);
        this.effects.critSlowMotion();
      } else {
        this.effects.screenShake(0.003, 60);
      }
      const target = allUnits.find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createHitEffect(target.x, target.y, data.element);
        this.effects.hitFlash(target);
      }
    };

    this.onHeal = (data) => {
      const target = allUnits.find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createHealEffect(target.x, target.y);
      }
    };

    this.onDeath = (data) => {
      const unit = allUnits.find(u => u.unitId === data.unitId);
      if (unit) {
        this.particles.createDeathEffect(unit.x, unit.y);
        this.effects.screenShake(0.01, 200);
      }
    };

    this.onReaction = (data) => {
      const target = allUnits.find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createElementReactionEffect(target.x, target.y, data.element1, data.element2);
        this.effects.screenShake(0.012, 200);
      }
    };

    const eb = EventBus.getInstance();
    eb.on('unit:damage', this.onDamage);
    eb.on('unit:heal', this.onHeal);
    eb.on('unit:death', this.onDeath);
    eb.on('element:reaction', this.onReaction);

    // Gold display (top-right, near battle type label)
    this.add.text(GAME_WIDTH - 15, 10, `${rm.getGold()}G`, {
      fontSize: '10px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0);
  }

  update(_time: number, delta: number): void {
    this.battleSystem.update(delta);
    this.hud.updatePortraits();

    // Update status visuals for all living units
    for (const unit of this.allUnits) {
      if (unit.isAlive) {
        unit.updateStatusVisuals();
      }
    }

    if (this.battleSystem.battleState !== 'fighting' && !this.battleEndHandled) {
      this.battleEndHandled = true;
      this.handleBattleEnd();
    }
  }

  private handleBattleEnd(): void {
    const rm = RunManager.getInstance();
    const isVictory = this.battleSystem.battleState === 'victory';

    if (isVictory) {
      const goldEarned = this.battleSystem.getTotalGoldReward();
      const expEarned = this.battleSystem.getTotalExpReward();
      const survivors = this.battleSystem.heroes
        .filter(h => h.isAlive)
        .map(h => h.unitId);

      for (const hero of this.battleSystem.heroes) {
        rm.updateHeroHp(hero.unitId, hero.currentHp);
      }

      const result: BattleResult = {
        victory: true,
        goldEarned,
        expEarned,
        survivors,
      };

      rm.applyBattleResult(result);
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();

      const node = rm.getMap()[this.nodeIndex];
      if (node.type === 'boss' && rm.isRunComplete()) {
        this.time.delayedCall(1500, () => {
          SceneTransition.fadeTransition(this, 'VictoryScene');
        });
      } else {
        this.time.delayedCall(1500, () => {
          SceneTransition.fadeTransition(this, 'RewardScene', { result });
        });
      }
    } else {
      this.time.delayedCall(1500, () => {
        SceneTransition.fadeTransition(this, 'GameOverScene');
      });
    }

    // Victory/defeat text with animation
    const text = isVictory ? 'VICTORY' : 'DEFEAT';
    const color = isVictory ? colorToString(Theme.colors.success) : colorToString(Theme.colors.danger);
    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, text, {
      fontSize: '28px',
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0).setAlpha(0);

    this.tweens.add({
      targets: resultText,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  shutdown(): void {
    const eb = EventBus.getInstance();
    eb.off('unit:damage', this.onDamage);
    eb.off('unit:heal', this.onHeal);
    eb.off('unit:death', this.onDeath);
    eb.off('element:reaction', this.onReaction);
    this.hud.destroy();
  }
}

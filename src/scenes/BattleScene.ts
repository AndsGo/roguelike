import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BATTLE_GROUND_Y, HERO_START_X, ENEMY_START_X, UNIT_SPACING_Y } from '../constants';
import { RunManager } from '../managers/RunManager';
import { BattleSystem } from '../systems/BattleSystem';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { BattleNodeData, EnemyData, BattleResult } from '../types';
import { BattleHUD } from '../ui/BattleHUD';
import { BattleEffects } from '../systems/BattleEffects';
import { ParticleManager } from '../systems/ParticleManager';
import { SceneTransition } from '../systems/SceneTransition';
import { EventBus } from '../systems/EventBus';
import { Theme, colorToString } from '../ui/Theme';
import enemiesData from '../data/enemies.json';

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private nodeIndex!: number;
  private battleEndHandled: boolean = false;
  private hud!: BattleHUD;
  private effects!: BattleEffects;
  private particles!: ParticleManager;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
    this.battleEndHandled = false;
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    // Initialize effects systems
    this.effects = new BattleEffects(this);
    this.particles = new ParticleManager(this);

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Ground line
    const ground = this.add.graphics();
    ground.lineStyle(1, 0x333355, 0.5);
    ground.lineBetween(0, BATTLE_GROUND_Y + 50, GAME_WIDTH, BATTLE_GROUND_Y + 50);

    // Node info
    const node = rm.getMap()[this.nodeIndex];
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

    // Listen for visual events
    EventBus.getInstance().on('unit:damage', (data) => {
      if (data.isCrit) {
        this.effects.screenShake(0.008, 150);
        this.effects.critSlowMotion();
      } else {
        this.effects.screenShake(0.003, 60);
      }
      // Hit particles
      const target = [...heroes, ...enemies].find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createHitEffect(target.x, target.y, data.element);
        this.effects.hitFlash(target);
      }
    });

    EventBus.getInstance().on('unit:heal', (data) => {
      const target = [...heroes, ...enemies].find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createHealEffect(target.x, target.y);
      }
    });

    EventBus.getInstance().on('unit:death', (data) => {
      const unit = [...heroes, ...enemies].find(u => u.unitId === data.unitId);
      if (unit) {
        this.particles.createDeathEffect(unit.x, unit.y);
        this.effects.screenShake(0.01, 200);
      }
    });

    EventBus.getInstance().on('element:reaction', (data) => {
      const target = [...heroes, ...enemies].find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createElementReactionEffect(target.x, target.y, data.element1, data.element2);
        this.effects.screenShake(0.012, 200);
      }
    });

    // Gold display
    this.add.text(10, 10, `${rm.getGold()}G`, {
      fontSize: '10px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    });
  }

  update(_time: number, delta: number): void {
    this.battleSystem.update(delta);
    this.hud.updatePortraits();

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

      const node = rm.getMap()[this.nodeIndex];
      if (node.type === 'boss') {
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
}

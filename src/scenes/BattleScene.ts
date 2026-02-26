import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BATTLE_GROUND_Y, HERO_START_X, ENEMY_START_X, UNIT_SPACING_Y } from '../constants';
import { RunManager } from '../managers/RunManager';
import { BattleSystem, BattleState } from '../systems/BattleSystem';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { BattleNodeData, EnemyData, BattleResult } from '../types';
import { Button } from '../ui/Button';
import enemiesData from '../data/enemies.json';

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private nodeIndex!: number;
  private battleEndHandled: boolean = false;
  private speedButton!: Button;
  private speedLevels = [1, 2, 3];
  private currentSpeedIndex = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
    this.battleEndHandled = false;
    this.currentSpeedIndex = 0;
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    // Background gradient
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

    // Ground line
    this.add.rectangle(GAME_WIDTH / 2, BATTLE_GROUND_Y + 50, GAME_WIDTH, 2, 0x333355);

    // Node info
    const node = rm.getMap()[this.nodeIndex];
    const typeLabel = node.type === 'boss' ? 'BOSS战' : node.type === 'elite' ? '精英战' : '战斗';
    this.add.text(GAME_WIDTH / 2, 15, typeLabel, {
      fontSize: '14px',
      color: node.type === 'boss' ? '#ff4444' : '#ffffff',
      fontFamily: 'monospace',
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

    // Speed button
    this.speedButton = new Button(this, GAME_WIDTH - 50, 15, '1x', 50, 25, () => {
      this.cycleSpeed();
    });

    // Gold display
    this.add.text(10, 10, `金币: ${rm.getGold()}`, {
      fontSize: '10px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    });
  }

  update(_time: number, delta: number): void {
    this.battleSystem.update(delta);

    if (this.battleSystem.battleState !== 'fighting' && !this.battleEndHandled) {
      this.battleEndHandled = true;
      this.handleBattleEnd();
    }
  }

  private cycleSpeed(): void {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedLevels.length;
    const speed = this.speedLevels[this.currentSpeedIndex];
    this.battleSystem.speedMultiplier = speed;
    this.speedButton.setText(`${speed}x`);
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

      // Update hero HP in RunManager
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

      // Check if boss was defeated
      const node = rm.getMap()[this.nodeIndex];
      if (node.type === 'boss') {
        this.time.delayedCall(1500, () => {
          this.scene.start('VictoryScene');
        });
      } else {
        this.time.delayedCall(1500, () => {
          this.scene.start('RewardScene', { result });
        });
      }
    } else {
      this.time.delayedCall(1500, () => {
        this.scene.start('GameOverScene');
      });
    }

    // Show result text
    const text = isVictory ? '胜利！' : '战败...';
    const color = isVictory ? '#44ff44' : '#ff4444';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, text, {
      fontSize: '28px',
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
  }
}

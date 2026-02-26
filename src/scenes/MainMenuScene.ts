import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Title
    this.add.text(GAME_WIDTH / 2, 100, 'ROGUELIKE\nAUTO BATTLER', {
      fontSize: '32px',
      color: '#ff8844',
      fontFamily: 'monospace',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 180, '自动战斗 · 策略搭配 · 随机冒险', {
      fontSize: '12px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // New Game button
    new Button(this, GAME_WIDTH / 2, 260, '新游戏', 180, 45, () => {
      this.startNewGame();
    });

    // Version
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'v0.1.0 - Phase 1-5 MVP', {
      fontSize: '9px',
      color: '#555577',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private startNewGame(): void {
    const rm = RunManager.getInstance();
    rm.newRun();
    this.scene.start('MapScene');
  }
}

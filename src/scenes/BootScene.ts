import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Loading bar
    const barWidth = 300;
    const barHeight = 20;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;

    const progressBg = this.add.rectangle(GAME_WIDTH / 2, barY, barWidth, barHeight, 0x333333);
    progressBg.setStrokeStyle(1, 0x666666);

    const progressBar = this.add.rectangle(barX + 2, barY, 0, barHeight - 4, 0x4488ff);
    progressBar.setOrigin(0, 0.5);

    const loadingText = this.add.text(GAME_WIDTH / 2, barY - 30, 'Loading...', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.width = (barWidth - 4) * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Loading complete!');
    });

    // No actual assets to load yet — using placeholder shapes
    // When we have real assets, load them here:
    // this.load.spritesheet('hero_warrior', 'assets/sprites/heroes/warrior.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}

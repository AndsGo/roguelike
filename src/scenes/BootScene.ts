import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { AudioManager, BGM_KEYS, SFX_KEYS } from '../systems/AudioManager';
import { SaveManager } from '../managers/SaveManager';

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

    // Load audio assets (placeholder .ogg files)
    for (const key of BGM_KEYS) {
      this.load.audio(key, `audio/${key}.ogg`);
    }
    for (const key of SFX_KEYS) {
      this.load.audio(key, `audio/${key}.ogg`);
    }
  }

  create(): void {
    // Check localStorage availability
    if (!SaveManager.isStorageAvailable()) {
      this.showStorageWarning();
    }

    // Initialize audio manager
    AudioManager.getInstance().init(this.game);

    this.scene.start('MainMenuScene');
  }

  private showStorageWarning(): void {
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40,
      '⚠ 存储不可用 - 游戏进度将无法保存', {
        fontSize: '12px',
        color: '#ff8844',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      msg.destroy();
    });
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { ParticleManager } from '../systems/ParticleManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Ambient particles
    const particles = new ParticleManager(this);
    // Spread some ambient particles across the menu
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 800, () => {
        particles.createBuffEffect(
          100 + Math.random() * (GAME_WIDTH - 200),
          100 + Math.random() * (GAME_HEIGHT - 200),
          Theme.colors.primary,
        );
      });
    }

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 100, 'ROGUELIKE\nAUTO BATTLER', {
      fontSize: '32px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Title pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 175, 'Auto Battle  |  Strategy  |  Adventure', {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // New Game button
    new Button(this, GAME_WIDTH / 2, 250, 'NEW GAME', 180, 45, () => {
      this.startNewGame();
    }, Theme.colors.primary);

    // Version
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'v0.2.0 - Phase B', {
      fontSize: '9px',
      color: '#555577',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private startNewGame(): void {
    const rm = RunManager.getInstance();
    rm.newRun();
    SceneTransition.fadeTransition(this, 'MapScene');
  }
}

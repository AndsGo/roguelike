import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { ParticleManager } from '../systems/ParticleManager';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Celebration particles
    const particles = new ParticleManager(this);
    particles.createLevelUpEffect(GAME_WIDTH / 2 - 100, 60);
    particles.createLevelUpEffect(GAME_WIDTH / 2 + 100, 60);

    const title = this.add.text(GAME_WIDTH / 2, 75, 'VICTORY!', {
      fontSize: '40px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Title glow pulse
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500,
    });

    this.add.text(GAME_WIDTH / 2, 135, 'You defeated the final Boss!', {
      fontSize: '13px',
      color: colorToString(Theme.colors.success),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Final team
    this.add.text(GAME_WIDTH / 2, 175, 'Final Team:', {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      this.add.text(GAME_WIDTH / 2, 200 + i * 22, `${data.name} Lv.${hero.level}`, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, 200 + heroes.length * 22 + 20, `Final Gold: ${rm.getGold()}`, {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 55, 'Main Menu', 180, 45, () => {
      SceneTransition.fadeTransition(this, 'MainMenuScene');
    }, Theme.colors.secondary);
  }
}

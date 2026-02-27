import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';

export class RestScene extends Phaser.Scene {
  private nodeIndex!: number;

  constructor() {
    super({ key: 'RestScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Campfire glow
    const particles = new ParticleManager(this);
    particles.createBuffEffect(GAME_WIDTH / 2, 80, 0xff6633);

    this.add.text(GAME_WIDTH / 2, 55, 'REST', {
      fontSize: '20px',
      color: '#4488cc',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 100, 'Your team rests by the campfire...', {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Show current HP
    const heroes = rm.getHeroes();
    this.add.text(GAME_WIDTH / 2, 140, 'Team Status:', {
      fontSize: '10px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const ratio = hero.currentHp / maxHp;
      const hpColor = ratio > 0.6 ? '#44ff44' : ratio > 0.3 ? '#ffaa00' : '#ff4444';

      this.add.text(GAME_WIDTH / 2, 165 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
        fontSize: '10px',
        color: hpColor,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    new Button(this, GAME_WIDTH / 2, 290, `Rest (Heal ${Math.round(REST_HEAL_PERCENT * 100)}% HP)`, 240, 40, () => {
      rm.healAllHeroes(REST_HEAL_PERCENT);
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();

      // Show healed status
      this.children.removeAll();
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

      const healParticles = new ParticleManager(this);
      healParticles.createHealEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Team Restored!', {
        fontSize: '18px',
        color: colorToString(Theme.colors.success),
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const healedHeroes = rm.getHeroes();
      healedHeroes.forEach((hero, i) => {
        const data = rm.getHeroData(hero.id);
        const maxHp = rm.getMaxHp(hero, data);
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
          fontSize: '10px',
          color: colorToString(Theme.colors.success),
          fontFamily: 'monospace',
        }).setOrigin(0.5);
      });

      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Continue', 140, 40, () => {
        SceneTransition.fadeTransition(this, 'MapScene');
      });
    }, Theme.colors.success);
  }
}

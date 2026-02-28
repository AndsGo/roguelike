import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';
import { UI } from '../i18n';

export class RestScene extends Phaser.Scene {
  private nodeIndex!: number;
  private resting = false;

  constructor() {
    super({ key: 'RestScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.resting = false;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Campfire glow
    const particles = new ParticleManager(this);
    particles.createBuffEffect(GAME_WIDTH / 2, 80, 0xff6633);

    this.add.text(GAME_WIDTH / 2, 55, UI.rest.title, {
      fontSize: '20px',
      color: colorToString(Theme.colors.node.rest),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 100, UI.rest.campfireText, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Show current HP
    const heroes = rm.getHeroes();
    this.add.text(GAME_WIDTH / 2, 140, UI.rest.teamStatus, {
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

    new Button(this, GAME_WIDTH / 2, 290, UI.rest.restBtn(Math.round(REST_HEAL_PERCENT * 100)), 240, 40, () => {
      if (this.resting) return;
      this.resting = true;

      rm.healAllHeroes(REST_HEAL_PERCENT);
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();

      // Fade out current content, then show healed status
      const allChildren = this.children.getAll();
      this.tweens.add({
        targets: allChildren,
        alpha: 0,
        duration: 300,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.children.removeAll(true);
          this.showHealedStatus(rm);
        },
      });
    }, Theme.colors.success);
  }

  shutdown(): void {
    this.tweens.killAll();
  }

  private showHealedStatus(rm: RunManager): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    const healParticles = new ParticleManager(this);
    healParticles.createHealEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, UI.rest.restored, {
      fontSize: '18px',
      color: colorToString(Theme.colors.success),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [title];

    const healedHeroes = rm.getHeroes();
    healedHeroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const heroText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
        fontSize: '10px',
        color: colorToString(Theme.colors.success),
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0);
      fadeTargets.push(heroText);
    });

    const btn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, UI.rest.continueBtn, 140, 40, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
    btn.setAlpha(0);
    fadeTargets.push(btn);

    // Fade in healed status content
    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString, getNodeColor } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';
import { UI } from '../i18n';
import { TutorialSystem } from '../systems/TutorialSystem';

export class RestScene extends Phaser.Scene {
  private nodeIndex!: number;
  private choiceMade = false;

  constructor() {
    super({ key: 'RestScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.choiceMade = false;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Campfire glow
    const particles = new ParticleManager(this);
    particles.createBuffEffect(GAME_WIDTH / 2, 80, 0xff6633);

    this.add.text(GAME_WIDTH / 2, 55, UI.rest.title, {
      fontSize: '20px',
      color: colorToString(getNodeColor('rest')),
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

    // 3 choice buttons
    const btnY = 290;
    const btnSpacing = 160;
    const btnStartX = GAME_WIDTH / 2 - btnSpacing;
    const healPercent = Math.round(REST_HEAL_PERCENT * 100);

    // Rest button
    new Button(this, btnStartX, btnY, UI.rest.restBtn(healPercent), 140, 40, () => {
      this.executeChoice('rest', rm);
    }, Theme.colors.success);

    this.add.text(btnStartX, btnY + 28, UI.rest.restDesc(healPercent), {
      fontSize: '9px', color: '#88aa88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Train button
    new Button(this, btnStartX + btnSpacing, btnY, UI.rest.trainBtn, 140, 40, () => {
      this.executeChoice('train', rm);
    }, Theme.colors.primary);

    this.add.text(btnStartX + btnSpacing, btnY + 28, UI.rest.trainDesc(REST_TRAIN_EXP), {
      fontSize: '9px', color: '#8888aa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Scavenge button
    new Button(this, btnStartX + btnSpacing * 2, btnY, UI.rest.scavengeBtn, 140, 40, () => {
      this.executeChoice('scavenge', rm);
    }, Theme.colors.secondary);

    this.add.text(btnStartX + btnSpacing * 2, btnY + 28, UI.rest.scavengeDesc(REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX), {
      fontSize: '9px', color: '#aaaa88', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  shutdown(): void {
    this.tweens.killAll();
  }

  private executeChoice(choice: 'rest' | 'train' | 'scavenge', rm: RunManager): void {
    if (this.choiceMade) return;
    this.choiceMade = true;

    rm.markNodeCompleted(this.nodeIndex);

    const allChildren = this.children.getAll();
    this.tweens.add({
      targets: allChildren,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.children.removeAll(true);
        switch (choice) {
          case 'rest':
            rm.healAllHeroes(REST_HEAL_PERCENT);
            this.showHealedStatus(rm);
            break;
          case 'train':
            this.executeTrain(rm);
            break;
          case 'scavenge':
            this.executeScavenge(rm);
            break;
        }
        SaveManager.autoSave();
      },
    });
  }

  private executeTrain(rm: RunManager): void {
    for (const hero of rm.getHeroes()) {
      rm.addExp(hero, REST_TRAIN_EXP);
    }
    this.showResultScreen(
      UI.rest.trainResult(REST_TRAIN_EXP),
      Theme.colors.primary,
      rm
    );
  }

  private executeScavenge(rm: RunManager): void {
    const rng = rm.getRng();
    const gold = rng.nextInt(REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX);
    rm.addGold(gold);
    this.showResultScreen(
      UI.rest.scavengeResult(gold),
      Theme.colors.secondary,
      rm
    );
  }

  private showHealedStatus(rm: RunManager): void {
    this.showResultScreen(UI.rest.restored, Theme.colors.success, rm);
  }

  private showResultScreen(message: string, color: number, rm: RunManager): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    const healParticles = new ParticleManager(this);
    healParticles.createHealEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, {
      fontSize: '18px',
      color: colorToString(color),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [title];

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const heroText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP (Lv.${hero.level})`, {
        fontSize: '10px',
        color: colorToString(color),
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0);
      fadeTargets.push(heroText);
    });

    const btn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, UI.rest.continueBtn, 140, 40, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
    btn.setAlpha(0);
    fadeTargets.push(btn);

    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    TutorialSystem.showTipIfNeeded(this, 'first_rest');
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX, INTEREST_PER_10_GOLD, INTEREST_CAP } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString, getNodeColor } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';
import { UI } from '../i18n';
import { TutorialSystem } from '../systems/TutorialSystem';
import { TextFactory } from '../ui/TextFactory';

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

    TextFactory.create(this, GAME_WIDTH / 2, 55, UI.rest.title, 'title', {
      color: colorToString(getNodeColor('rest')),
    }).setOrigin(0.5);

    TextFactory.create(this, GAME_WIDTH / 2, 100, UI.rest.campfireText, 'body', {
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Show current HP
    const heroes = rm.getHeroes();
    TextFactory.create(this, GAME_WIDTH / 2, 140, UI.rest.teamStatus, 'label', {
      color: '#8899cc',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const ratio = hero.currentHp / maxHp;
      const hpColor = ratio > 0.6 ? '#44ff44' : ratio > 0.3 ? '#ffaa00' : '#ff4444';

      TextFactory.create(this, GAME_WIDTH / 2, 165 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP`, 'label', {
        color: hpColor,
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

    TextFactory.create(this, btnStartX, btnY + 28, UI.rest.restDesc(healPercent), 'small', {
      color: '#88aa88',
    }).setOrigin(0.5);

    // Train button
    new Button(this, btnStartX + btnSpacing, btnY, UI.rest.trainBtn, 140, 40, () => {
      this.executeChoice('train', rm);
    }, Theme.colors.primary);

    TextFactory.create(this, btnStartX + btnSpacing, btnY + 28, UI.rest.trainDesc(REST_TRAIN_EXP), 'small', {
      color: '#8888aa',
    }).setOrigin(0.5);

    // Scavenge button
    new Button(this, btnStartX + btnSpacing * 2, btnY, UI.rest.scavengeBtn, 140, 40, () => {
      this.executeChoice('scavenge', rm);
    }, Theme.colors.secondary);

    TextFactory.create(this, btnStartX + btnSpacing * 2, btnY + 28, UI.rest.scavengeDesc(REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX), 'small', {
      color: '#aaaa88',
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
        // Interest: award gold based on current reserves
        const interest = Math.min(Math.floor(rm.getGold() / 10) * INTEREST_PER_10_GOLD, INTEREST_CAP);
        if (interest > 0) {
          rm.addGold(interest);
          // Append interest text to already-rendered result screen
          const heroCount = rm.getHeroes().length;
          const interestY = GAME_HEIGHT / 2 + heroCount * 22 + 8;
          const interestText = TextFactory.create(
            this, GAME_WIDTH / 2, interestY,
            UI.rest.interest(interest), 'label', {
              color: colorToString(Theme.colors.gold),
            }
          ).setOrigin(0.5).setAlpha(0);
          this.tweens.add({
            targets: interestText,
            alpha: 1,
            duration: 300,
            ease: 'Sine.easeOut',
          });
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

    const title = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, 'title', {
      color: colorToString(color),
    }).setOrigin(0.5).setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [title];

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const heroText = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP (Lv.${hero.level})`, 'label', {
        color: colorToString(color),
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

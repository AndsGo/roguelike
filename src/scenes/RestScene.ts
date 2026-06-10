import Phaser from 'phaser';
import { REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString, getNodeColor } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';
import { UI } from '../i18n';
import { TutorialSystem } from '../systems/TutorialSystem';
import { TextFactory } from '../ui/TextFactory';
import { applyUiCamera, fillBackground, onViewResize, restartOnResize, view } from '../ui/Viewport';

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

    onViewResize(this, () => applyUiCamera(this));
    restartOnResize(this, { nodeIndex: this.nodeIndex });
    const v = view(this);

    fillBackground(this, Theme.colors.background);

    // Campfire glow
    const particles = new ParticleManager(this);
    particles.createBuffEffect(v.cx, Math.round(v.vh * 0.15), 0xff6633);

    TextFactory.create(this, v.cx, Math.round(v.vh * 0.12), UI.rest.title, 'title', {
      color: colorToString(getNodeColor('rest')),
    }).setOrigin(0.5);

    TextFactory.create(this, v.cx, Math.round(v.vh * 0.22), UI.rest.campfireText, 'body', {
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Show current HP
    const heroes = rm.getHeroes();
    TextFactory.create(this, v.cx, Math.round(v.vh * 0.31), UI.rest.teamStatus, 'label', {
      color: '#8899cc',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const ratio = hero.currentHp / maxHp;
      const hpColor = ratio > 0.6 ? '#44ff44' : ratio > 0.3 ? '#ffaa00' : '#ff4444';

      TextFactory.create(this, v.cx, Math.round(v.vh * 0.31) + 25 + i * (v.compact ? 18 : 22), `${data.name}: ${hero.currentHp}/${maxHp} HP`, 'label', {
        color: hpColor,
      }).setOrigin(0.5);
    });

    // 3 choice buttons (anchored toward the bottom of the viewport)
    const btnY = v.vh - (v.compact ? 90 : 160);
    const btnSpacing = 160;
    const btnStartX = v.cx - btnSpacing;
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
        // Interest is now settled per battle victory (see BattleScene), not at rest.
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
    const v = view(this);
    fillBackground(this, Theme.colors.background);

    const healParticles = new ParticleManager(this);
    healParticles.createHealEffect(v.cx, v.cy - 40);

    const title = TextFactory.create(this, v.cx, v.cy - 40, message, 'title', {
      color: colorToString(color),
    }).setOrigin(0.5).setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [title];

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const heroText = TextFactory.create(this, v.cx, v.cy + i * (v.compact ? 18 : 22), `${data.name}: ${hero.currentHp}/${maxHp} HP (Lv.${hero.level})`, 'label', {
        color: colorToString(color),
      }).setOrigin(0.5).setAlpha(0);
      fadeTargets.push(heroText);
    });

    const btn = new Button(this, v.cx, v.vh - 40, UI.rest.continueBtn, 140, 40, () => {
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

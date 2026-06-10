import { RunManager } from '../managers/RunManager';
import { RunEndContext } from '../managers/MetaManager';
import { Theme, colorToString, getAccessibility } from '../ui/Theme';
import { ParticleManager } from '../systems/ParticleManager';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';
import heroesData from '../data/heroes.json';
import { TextFactory } from '../ui/TextFactory';
import { fillBackground, view } from '../ui/Viewport';

export class VictoryScene extends BaseEndScene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    const v = view(this);
    const rm = RunManager.getInstance();

    fillBackground(this, 0x0a0a1e);

    // Celebration particles
    const particles = new ParticleManager(this);
    particles.createLevelUpEffect(v.cx - 100, 60);
    particles.createLevelUpEffect(v.cx + 100, 60);

    const title = this.createTitle(UI.victory.title, 55, Theme.colors.gold, '40px');

    // Override the base scale-in with a Back.easeOut bounce (scale 1.15 → 1)
    this.tweens.killTweensOf(title);
    title.setScale(1.15);
    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Gold particles falling from top (12 particles, staggered)
    const reduceMotion = getAccessibility().reduceMotion;
    if (!reduceMotion) {
      for (let gi = 0; gi < 12; gi++) {
        const px = v.cx - 120 + Math.random() * 240;
        const particle = this.add.graphics();
        particle.fillStyle(Theme.colors.gold, 0.85);
        particle.fillRect(-2, -2, 4, 4);
        particle.setPosition(px, -8);
        this.tweens.add({
          targets: particle,
          y: 60 + Math.random() * 80,
          alpha: { from: 1, to: 0 },
          duration: 2000,
          delay: gi * 150,
          ease: 'Quad.easeIn',
          onComplete: () => particle.destroy(),
        });
      }
    }

    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 600,
    });

    this.createSubtitle(UI.victory.subtitle, 105, colorToString(Theme.colors.success));

    // Build run-end context for hero unlock checks
    const heroStates = rm.getHeroes();
    const context: RunEndContext = {
      partyHeroIds: heroStates.map(h => h.id),
      partyElements: heroStates.map(h => {
        const data = (heroesData as { id: string; element: string | null }[]).find(d => d.id === h.id);
        // temporaryElement (event-granted conversions) counts toward unlock
        // checks — it is the ONLY path into lightning-element unlocks, since
        // no default hero is lightning (the "thunder deadlock" fix).
        return h.temporaryElement ?? data?.element ?? undefined;
      }),
      partyRoles: heroStates.map(h => {
        const data = (heroesData as { id: string; role: string }[]).find(d => d.id === h.id);
        return data?.role ?? 'melee_dps';
      }),
      relicCount: rm.getRelics().length,
      difficulty: rm.getDifficulty(),
    };

    // Meta progression settlement
    const { metaReward, newAchievements } = this.settleRewards(true, rm.getFloor(), context);

    // Final team
    TextFactory.create(this, v.cx, 135, UI.victory.finalTeam, 'body', {
      color: '#8899cc',
    }).setOrigin(0.5);

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      TextFactory.create(this, v.cx, 155 + i * 18, `${data.name} Lv.${hero.level}`, 'label', {
        color: '#ffffff',
      }).setOrigin(0.5);
    });

    const rewardY = 155 + heroes.length * 18 + 15;

    TextFactory.create(this, v.cx, rewardY, UI.victory.finalGold(rm.getGold()), 'body', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5);

    this.createSoulsText(rewardY + 22, UI.victory.soulsEarned(metaReward));

    RunEndPanel.renderRewards(this, v.cx, rewardY + 45, newAchievements, UI.victory);

    // Daily challenge completion
    this.settleDailyChallenge(true, rewardY + 70);

    // Build review + main menu buttons — anchor from bottom
    this.createBuildReviewButton(v.vh - 80);
    this.createMainMenuButton(v.vh - 40, UI.victory.mainMenu, Theme.colors.secondary);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

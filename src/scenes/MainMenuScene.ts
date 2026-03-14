import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { SaveManager } from '../managers/SaveManager';
import { MetaManager } from '../managers/MetaManager';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { ParticleManager } from '../systems/ParticleManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { UI, UPGRADE_NAMES } from '../i18n';
import { AudioManager } from '../systems/AudioManager';
import { AchievementPanel } from '../ui/AchievementPanel';
import { HelpPanel } from '../ui/HelpPanel';
import { CodexPanel } from '../ui/CodexPanel';
import { DIFFICULTY_LEVELS } from '../config/difficulty';
import { DailyChallengeManager } from '../managers/DailyChallengeManager';
import { RunManager } from '../managers/RunManager';
import heroesData from '../data/heroes.json';
import { TextFactory } from '../ui/TextFactory';

export class MainMenuScene extends Phaser.Scene {
  private upgradePanel: Panel | null = null;
  private upgradeOverlay: Phaser.GameObjects.Rectangle | null = null;
  private upgradeCloseText: Phaser.GameObjects.Text | null = null;
  private upgradeCloseHit: Phaser.GameObjects.Rectangle | null = null;
  private achievementPanel: AchievementPanel | null = null;
  private helpPanel: HelpPanel | null = null;
  private codexPanel: CodexPanel | null = null;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.upgradePanel = null;
    this.achievementPanel = null;
    this.helpPanel = null;
    this.codexPanel = null;

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Ambient particles
    const particles = new ParticleManager(this);
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
    const title = TextFactory.create(this, GAME_WIDTH / 2, 80, UI.mainMenu.title, 'title', {
      color: colorToString(Theme.colors.secondary),
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

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
    TextFactory.create(this, GAME_WIDTH / 2, 155, UI.mainMenu.subtitle, 'body', {
      color: '#8899cc',
    }).setOrigin(0.5);

    // Button layout
    const btnSpacing = 44;
    let btnY = 200;

    // Continue button (if save exists)
    if (SaveManager.hasSave(0)) {
      const saveInfo = SaveManager.getSaveInfo(0);
      const saveLabel = saveInfo
        ? UI.mainMenu.continueBtn(saveInfo.floor, saveInfo.heroCount)
        : UI.mainMenu.continue;
      new Button(this, GAME_WIDTH / 2, btnY, saveLabel, 280, 36, () => {
        SaveManager.loadGame(0);
        SceneTransition.fadeTransition(this, 'MapScene');
      }, Theme.colors.success);
      btnY += btnSpacing;
    }

    // New Game button
    new Button(this, GAME_WIDTH / 2, btnY, UI.mainMenu.newGame, 180, 36, () => {
      if (SaveManager.hasSave(0)) {
        this.showNewGameConfirmation();
      } else {
        this.startNewGame();
      }
    }, Theme.colors.primary);
    btnY += btnSpacing;

    // Daily Challenge button
    const dailyCompleted = DailyChallengeManager.isCompletedToday();
    const dailyLabel = dailyCompleted ? UI.daily.completed : UI.daily.title;
    const dailyBtn = new Button(this, GAME_WIDTH / 2, btnY, dailyLabel, 180, 36, () => {
      if (dailyCompleted) return;
      this.startDailyChallenge();
    }, dailyCompleted ? 0x555555 : Theme.colors.gold);
    if (dailyCompleted) {
      dailyBtn.setAlpha(0.6);
    }
    btnY += btnSpacing;

    // Upgrades button
    new Button(this, GAME_WIDTH / 2, btnY, UI.mainMenu.upgrades, 180, 36, () => {
      this.showUpgradePanel();
    }, Theme.colors.panelBorder);
    btnY += btnSpacing;

    // Achievements button
    new Button(this, GAME_WIDTH / 2, btnY, '成就', 180, 36, () => {
      this.showAchievementPanel();
    }, Theme.colors.panelBorder);
    btnY += btnSpacing;

    // Help button
    new Button(this, GAME_WIDTH / 2, btnY, '帮助', 180, 36, () => {
      this.showHelpPanel();
    }, Theme.colors.panelBorder);
    btnY += btnSpacing;

    // Codex button
    new Button(this, GAME_WIDTH / 2, btnY, UI.codex.title, 180, 36, () => {
      this.showCodexPanel();
    }, Theme.colors.panelBorder);
    btnY += btnSpacing;

    // Audio toggle buttons (top-right corner)
    const audio = AudioManager.getInstance();
    const bgmLabel = audio.isBgmEnabled() ? UI.audio.bgmOn : UI.audio.bgmOff;
    const bgmBtn = TextFactory.create(this, GAME_WIDTH - 15, 12, bgmLabel, 'small', {
      color: audio.isBgmEnabled() ? '#88cc88' : '#888888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    bgmBtn.on('pointerup', () => {
      const enabled = audio.toggleBgm();
      bgmBtn.setText(enabled ? UI.audio.bgmOn : UI.audio.bgmOff);
      bgmBtn.setColor(enabled ? '#88cc88' : '#888888');
    });

    const sfxLabel = audio.isSfxEnabled() ? UI.audio.sfxOn : UI.audio.sfxOff;
    const sfxBtn = TextFactory.create(this, GAME_WIDTH - 15, 26, sfxLabel, 'small', {
      color: audio.isSfxEnabled() ? '#88cc88' : '#888888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    sfxBtn.on('pointerup', () => {
      const enabled = audio.toggleSfx();
      sfxBtn.setText(enabled ? UI.audio.sfxOn : UI.audio.sfxOff);
      sfxBtn.setColor(enabled ? '#88cc88' : '#888888');
    });

    // Settings gear button (top-right)
    const settingsBtn = TextFactory.create(this, GAME_WIDTH - 15, 44, '[设置]', 'small', {
      color: '#888888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerup', () => {
      SceneTransition.fadeTransition(this, 'SettingsScene', { returnScene: 'MainMenuScene' });
    });

    // Skip tutorial button (only shown if tutorials not yet skipped)
    TutorialSystem.init();
    if (!TutorialSystem.allSkipped()) {
      const skipBtn = TextFactory.create(this, GAME_WIDTH - 15, btnY - 10, UI.tutorial.skipAll, 'small', {
        color: '#666688',
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
      skipBtn.on('pointerup', () => {
        TutorialSystem.skipAll();
        skipBtn.setText(UI.tutorial.skipped);
        skipBtn.setColor('#44aa44');
        skipBtn.disableInteractive();
      });
    }

    // Meta stats at bottom
    const meta = MetaManager.getMetaData();
    const currency = MetaManager.getMetaCurrency();
    const statsStr = UI.mainMenu.stats(meta.totalRuns, meta.totalVictories, meta.unlockedHeroes.length, heroesData.length, currency);
    TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, statsStr, 'small', {
      color: '#666688',
    }).setOrigin(0.5);

    // Version
    TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT - 18, UI.mainMenu.version, 'small', {
      color: '#555577',
    }).setOrigin(0.5);
  }

  private startNewGame(): void {
    this.showDifficultySelection();
  }

  private startDailyChallenge(): void {
    const seed = DailyChallengeManager.getTodaysSeed();
    const modifiers = DailyChallengeManager.getDailyModifiers(seed);
    const rm = RunManager.getInstance();
    rm.newRun(seed, modifiers.difficulty, undefined, {
      title: modifiers.title,
      rules: modifiers.rules,
    });
    SceneTransition.fadeTransition(this, 'HeroDraftScene', {
      difficulty: modifiers.difficulty,
      isDaily: true,
    });
  }

  private showDifficultySelection(): void {
    const meta = MetaManager.getMetaData();
    const victories = meta.totalVictories;

    const panelW = 400;
    const panelH = 280;

    // Overlay — click outside panel to close
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive().setDepth(799);

    const panelBg = this.add.graphics().setDepth(800);
    panelBg.fillStyle(Theme.colors.panel, 0.95);
    panelBg.fillRoundedRect(GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT / 2 - panelH / 2, panelW, panelH, 8);
    panelBg.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panelBg.strokeRoundedRect(GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT / 2 - panelH / 2, panelW, panelH, 8);

    const titleText = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 + 22, UI.difficulty.title, 'subtitle', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5).setDepth(800);

    const allElements: Phaser.GameObjects.GameObject[] = [overlay, panelBg, titleText];
    const buttons: Button[] = [];

    const cleanup = () => {
      allElements.forEach(el => el.destroy());
      buttons.forEach(b => b.destroy());
    };

    // Click outside panel area to close
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hw = panelW / 2;
      const hh = panelH / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        cleanup();
      }
    });

    const startY = GAME_HEIGHT / 2 - panelH / 2 + 52;
    const rowH = 48;

    for (let i = 0; i < DIFFICULTY_LEVELS.length; i++) {
      const diff = DIFFICULTY_LEVELS[i];
      const y = startY + i * rowH;
      const leftX = GAME_WIDTH / 2 - panelW / 2 + 20;

      // Unlock requirements
      const unlockReqs: Record<string, number> = { normal: 0, hard: 0, nightmare: 1, hell: 3 };
      const reqVictories = unlockReqs[diff.id] ?? 0;
      const isLocked = victories < reqVictories;

      // Name
      const nameColor = isLocked ? '#666666' : '#ffffff';
      const nameText = TextFactory.create(this, leftX, y, diff.name, 'body', {
        color: nameColor, fontStyle: 'bold',
      }).setDepth(800);
      allElements.push(nameText);

      // Description + multiplier
      const descStr = isLocked
        ? UI.difficulty.locked(UI.difficulty.victoryReq(reqVictories))
        : `${diff.description}  ${UI.difficulty.multiplier(diff.enemyStatMultiplier)}  ${UI.difficulty.rewardMultiplier(diff.goldMultiplier)}`;
      const descText = TextFactory.create(this, leftX, y + 16, descStr, 'tiny', {
        color: isLocked ? '#555555' : '#8899aa',
      }).setDepth(800);
      allElements.push(descText);

      // Start button (right side)
      if (!isLocked) {
        const btn = new Button(this, GAME_WIDTH / 2 + panelW / 2 - 50, y + 10, UI.difficulty.start, 60, 26, () => {
          cleanup();
          // Go to hero draft scene with selected difficulty
          SceneTransition.fadeTransition(this, 'HeroDraftScene', { difficulty: diff.id });
        }, i === 0 ? Theme.colors.primary : Theme.colors.panelBorder);
        btn.setDepth(801);
        buttons.push(btn);
      } else {
        // Locked indicator
        const lockText = TextFactory.create(this, GAME_WIDTH / 2 + panelW / 2 - 50, y + 10, '\uD83D\uDD12', 'subtitle', {
          color: '#555555',
        }).setOrigin(0.5).setDepth(800);
        allElements.push(lockText);
      }
    }

    // Cancel/close button
    const cancelBtn = new Button(this, GAME_WIDTH / 2, startY + DIFFICULTY_LEVELS.length * rowH + 10, UI.mainMenu.close, 80, 26, () => {
      cleanup();
      cancelBtn.destroy();
    }, 0x555555);
    cancelBtn.setDepth(801);
    buttons.push(cancelBtn);
  }

  private showNewGameConfirmation(): void {
    // Overlay background
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive().setDepth(799);

    const panelBg = this.add.graphics().setDepth(800);
    panelBg.fillStyle(Theme.colors.panel, 0.95);
    panelBg.fillRoundedRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 55, 320, 110, 8);
    panelBg.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panelBg.strokeRoundedRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 55, 320, 110, 8);

    const msg = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25, UI.mainMenu.confirmOverwrite, 'body', {
      color: colorToString(Theme.colors.danger),
      align: 'center',
    }).setOrigin(0.5).setDepth(800);

    const confirmElements = [overlay, panelBg, msg];

    const cleanup = () => {
      confirmElements.forEach(el => el.destroy());
      yesBtn.destroy();
      noBtn.destroy();
    };

    // Click outside panel to close
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hw = 160;
      const hh = 55;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        cleanup();
      }
    });

    const yesBtn = new Button(this, GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 + 25, UI.mainMenu.yes, 80, 30, () => {
      cleanup();
      this.startNewGame();
    }, Theme.colors.danger);
    yesBtn.setDepth(801);

    const noBtn = new Button(this, GAME_WIDTH / 2 + 60, GAME_HEIGHT / 2 + 25, UI.mainMenu.no, 80, 30, () => {
      cleanup();
    }, Theme.colors.primary);
    noBtn.setDepth(801);
  }

  private showHelpPanel(): void {
    if (this.helpPanel) {
      this.helpPanel.close(() => { this.helpPanel = null; });
      return;
    }
    this.helpPanel = new HelpPanel(this, () => {
      this.helpPanel = null;
    });
  }

  private showAchievementPanel(): void {
    if (this.achievementPanel) {
      this.achievementPanel.close(() => { this.achievementPanel = null; });
      return;
    }
    this.achievementPanel = new AchievementPanel(this, () => {
      this.achievementPanel = null;
    });
  }

  private showCodexPanel(): void {
    if (this.codexPanel) {
      this.codexPanel.close(() => { this.codexPanel = null; });
      return;
    }
    this.codexPanel = new CodexPanel(this, () => {
      this.codexPanel = null;
    });
  }

  private closeUpgradePanel(): void {
    this.upgradeCloseText?.destroy();
    this.upgradeCloseText = null;
    this.upgradeCloseHit?.destroy();
    this.upgradeCloseHit = null;
    this.upgradePanel?.close(() => {
      this.upgradePanel = null;
      this.upgradeOverlay?.destroy();
      this.upgradeOverlay = null;
    });
  }

  private showUpgradePanel(): void {
    if (this.upgradePanel) {
      this.closeUpgradePanel();
      return;
    }

    // Full-screen overlay (click to close)
    this.upgradeOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5,
    ).setInteractive({ useHandCursor: true }).setDepth(799);
    this.upgradeOverlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only close when clicking outside the panel area
      const pw = 500 / 2;
      const ph = 340 / 2;
      if (pointer.x < GAME_WIDTH / 2 - pw || pointer.x > GAME_WIDTH / 2 + pw ||
          pointer.y < GAME_HEIGHT / 2 - ph || pointer.y > GAME_HEIGHT / 2 + ph) {
        this.closeUpgradePanel();
      }
    });

    const panel = new Panel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 340, {
      title: UI.mainMenu.upgradeTitle,
      animate: true,
    });
    panel.setDepth(800);
    this.upgradePanel = panel;

    this.renderUpgradeContent(panel);
  }

  shutdown(): void {
    this.tweens.killAll();
  }

  private renderUpgradeContent(panel: Panel): void {
    const upgrades = MetaManager.PERMANENT_UPGRADES;

    const UPGRADE_COSTS: Record<string, number[]> = {
      starting_gold: [50, 100, 200, 400, 800],
      starting_hp: [50, 100, 200, 400, 800],
      exp_bonus: [50, 100, 200, 400, 800],
      crit_bonus: [100, 300, 600],
      relic_chance: [100, 300, 600],
    };

    const currency = MetaManager.getMetaCurrency();

    // Currency display
    const currencyText = TextFactory.create(this, 0, -130, UI.mainMenu.souls(currency), 'body', {
      color: colorToString(Theme.colors.gold),
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.addContent(currencyText);

    upgrades.forEach((def, i) => {
      const y = -90 + i * 48;
      const current = MetaManager.getUpgrade(def.id);
      const level = current?.level ?? 0;
      const maxLevel = def.maxLevel;
      const isMaxed = level >= maxLevel;

      // Upgrade name
      const nameText = TextFactory.create(this, -220, y, UPGRADE_NAMES[def.id] ?? def.id, 'body', {
        color: '#ffffff',
      });
      panel.addContent(nameText);

      // Level pips
      let pipsStr = '';
      for (let l = 0; l < maxLevel; l++) {
        pipsStr += l < level ? '[*]' : '[ ]';
      }
      const pipsText = TextFactory.create(this, -40, y, pipsStr, 'small', {
        color: isMaxed ? colorToString(Theme.colors.success) : '#aaaaaa',
      });
      panel.addContent(pipsText);

      if (!isMaxed) {
        const costs = UPGRADE_COSTS[def.id];
        const cost = costs ? costs[level] : 999;
        const canAfford = currency >= cost;

        const costText = TextFactory.create(this, 140, y, `${cost} 灵魂`, 'small', {
          color: canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger),
        });
        panel.addContent(costText);

        // Buy button
        const buyBg = this.add.graphics();
        buyBg.fillStyle(canAfford ? Theme.colors.primary : 0x555555, 0.8);
        buyBg.fillRoundedRect(200, y - 8, 40, 20, 3);
        panel.addContent(buyBg);

        const buyText = TextFactory.create(this, 220, y + 2, UI.mainMenu.buy, 'small', {
          color: canAfford ? '#ffffff' : '#888888',
        }).setOrigin(0.5);
        panel.addContent(buyText);

        // Transparent hit area covering the full buy button background (padded for easier clicking)
        if (canAfford) {
          const buyHit = this.add.rectangle(220, y + 2, 56, 32, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
          buyHit.on('pointerdown', () => {
            if (MetaManager.purchaseUpgrade(def.id)) {
              // Refresh panel
              this.closeUpgradePanel();
              this.showUpgradePanel();
            }
          });
          panel.addContent(buyHit);
        }
      } else {
        const maxText = TextFactory.create(this, 180, y, UI.mainMenu.max, 'label', {
          color: colorToString(Theme.colors.success),
          fontStyle: 'bold',
        });
        panel.addContent(maxText);
      }
    });

    // ── Mutation Section ──
    const mutationStartY = -90 + upgrades.length * 48 + 20;

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x555555, 0.5);
    divider.lineBetween(-220, mutationStartY, 220, mutationStartY);
    panel.addContent(divider);

    // Section title
    const mutTitle = TextFactory.create(this, 0, mutationStartY + 12, UI.mutation.title, 'body', {
      color: '#cc44cc', fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.addContent(mutTitle);

    const tierUnlocked = MetaManager.isMutationTierUnlocked();

    if (!tierUnlocked) {
      const remaining = MetaManager.MUTATION_GATE - MetaManager.getTotalUpgradeLevels();
      const lockText = TextFactory.create(this, 0, mutationStartY + 36, UI.mutation.locked(remaining), 'label', {
        color: '#888888',
      }).setOrigin(0.5);
      panel.addContent(lockText);
    } else {
      const mutDefs = MetaManager.MUTATION_DEFS;
      mutDefs.forEach((def, i) => {
        const my = mutationStartY + 36 + i * 36;
        const owned = MetaManager.hasMutation(def.id);
        const mutStrings = UI.mutation as unknown as Record<string, string>;
        const name = mutStrings[def.id] ?? def.id;
        const desc = mutStrings[`desc_${def.id}`] ?? '';

        // Mutation name
        const nameText = TextFactory.create(this, -220, my, owned ? `✓ ${name}` : name, 'label', {
          color: owned ? '#44ff44' : '#ffffff',
          fontStyle: 'bold',
        });
        panel.addContent(nameText);

        // Description
        const descText = TextFactory.create(this, -220, my + 13, desc, 'tiny', {
          color: '#aaaaaa',
        });
        panel.addContent(descText);

        if (!owned) {
          // Cost
          const canAfford = currency >= def.cost;
          const costText = TextFactory.create(this, 140, my, `${def.cost} 灵魂`, 'small', {
            color: canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger),
          });
          panel.addContent(costText);

          // Buy button (matching existing upgrade button style)
          const buyBg = this.add.graphics();
          buyBg.fillStyle(canAfford ? Theme.colors.primary : 0x555555, 0.8);
          buyBg.fillRoundedRect(200, my - 8, 40, 20, 3);
          panel.addContent(buyBg);

          const buyText = TextFactory.create(this, 220, my + 2, UI.mainMenu.buy, 'small', {
            color: canAfford ? '#ffffff' : '#888888',
          }).setOrigin(0.5);
          panel.addContent(buyText);

          if (canAfford) {
            const buyHit = this.add.rectangle(220, my + 2, 56, 32, 0x000000, 0)
              .setInteractive({ useHandCursor: true });
            buyHit.on('pointerdown', () => {
              if (MetaManager.purchaseMutation(def.id)) {
                this.closeUpgradePanel();
                this.showUpgradePanel();
              }
            });
            panel.addContent(buyHit);
          }
        } else {
          const ownedText = TextFactory.create(this, 180, my, UI.mutation.unlocked, 'label', {
            color: '#44ff44',
          });
          panel.addContent(ownedText);
        }
      });
    }

    // Calculate total content height
    const baseHeight = upgrades.length * 48 + 80;
    const mutationHeight = tierUnlocked
      ? 50 + MetaManager.MUTATION_DEFS.length * 36
      : 60;
    panel.setContentHeight(baseHeight + mutationHeight);

    // Fixed close button (outside scrollable content, always visible)
    const panelHeight = 340;
    this.upgradeCloseText = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + panelHeight / 2 - 16, UI.mainMenu.close, 'label', {
      color: '#888888',
    }).setOrigin(0.5).setDepth(801);

    this.upgradeCloseHit = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + panelHeight / 2 - 16, 80, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(801);
    this.upgradeCloseHit.on('pointerdown', () => this.closeUpgradePanel());
  }
}

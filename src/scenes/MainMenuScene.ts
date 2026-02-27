import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { RunManager } from '../managers/RunManager';
import { SaveManager } from '../managers/SaveManager';
import { MetaManager } from '../managers/MetaManager';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { ParticleManager } from '../systems/ParticleManager';
import { UI, UPGRADE_NAMES } from '../i18n';

export class MainMenuScene extends Phaser.Scene {
  private upgradePanel: Panel | null = null;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.upgradePanel = null;

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
    const title = this.add.text(GAME_WIDTH / 2, 80, UI.mainMenu.title, {
      fontSize: '32px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      align: 'center',
      fontStyle: 'bold',
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
    this.add.text(GAME_WIDTH / 2, 155, UI.mainMenu.subtitle, {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Button layout
    let btnY = 210;

    // Continue button (if save exists)
    if (SaveManager.hasSave(0)) {
      const saveInfo = SaveManager.getSaveInfo(0);
      const saveLabel = saveInfo
        ? UI.mainMenu.continueBtn(saveInfo.floor, saveInfo.heroCount)
        : UI.mainMenu.continue;
      new Button(this, GAME_WIDTH / 2, btnY, saveLabel, 280, 40, () => {
        SaveManager.loadGame(0);
        SceneTransition.fadeTransition(this, 'MapScene');
      }, Theme.colors.success);
      btnY += 50;
    }

    // New Game button
    new Button(this, GAME_WIDTH / 2, btnY, UI.mainMenu.newGame, 180, 40, () => {
      if (SaveManager.hasSave(0)) {
        this.showNewGameConfirmation();
      } else {
        this.startNewGame();
      }
    }, Theme.colors.primary);
    btnY += 50;

    // Upgrades button
    new Button(this, GAME_WIDTH / 2, btnY, UI.mainMenu.upgrades, 180, 40, () => {
      this.showUpgradePanel();
    }, Theme.colors.panelBorder);
    btnY += 50;

    // Meta stats at bottom
    const meta = MetaManager.getMetaData();
    const currency = MetaManager.getMetaCurrency();
    const statsStr = UI.mainMenu.stats(meta.totalRuns, meta.totalVictories, meta.unlockedHeroes.length, currency);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 38, statsStr, {
      fontSize: '9px',
      color: '#666688',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Version
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, UI.mainMenu.version, {
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

  private showNewGameConfirmation(): void {
    // Overlay background
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive(); // blocks clicks to elements behind

    const panelBg = this.add.graphics();
    panelBg.fillStyle(Theme.colors.panel, 0.95);
    panelBg.fillRoundedRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 55, 320, 110, 8);
    panelBg.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panelBg.strokeRoundedRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 55, 320, 110, 8);

    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25, UI.mainMenu.confirmOverwrite, {
      fontSize: '13px',
      color: colorToString(Theme.colors.danger),
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    const confirmElements = [overlay, panelBg, msg];

    const yesBtn = new Button(this, GAME_WIDTH / 2 - 60, GAME_HEIGHT / 2 + 25, UI.mainMenu.yes, 80, 30, () => {
      confirmElements.forEach(el => el.destroy());
      yesBtn.destroy();
      noBtn.destroy();
      this.startNewGame();
    }, Theme.colors.danger);

    const noBtn = new Button(this, GAME_WIDTH / 2 + 60, GAME_HEIGHT / 2 + 25, UI.mainMenu.no, 80, 30, () => {
      confirmElements.forEach(el => el.destroy());
      yesBtn.destroy();
      noBtn.destroy();
    }, Theme.colors.primary);
  }

  private showUpgradePanel(): void {
    if (this.upgradePanel) {
      this.upgradePanel.close(() => { this.upgradePanel = null; });
      return;
    }

    const panel = new Panel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 340, {
      title: UI.mainMenu.upgradeTitle,
      animate: true,
    });
    this.upgradePanel = panel;

    this.renderUpgradeContent(panel);
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
    const currencyText = this.add.text(0, -130, UI.mainMenu.souls(currency), {
      fontSize: '13px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
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
      const nameText = this.add.text(-220, y, UPGRADE_NAMES[def.id] ?? def.id, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      panel.addContent(nameText);

      // Level pips
      let pipsStr = '';
      for (let l = 0; l < maxLevel; l++) {
        pipsStr += l < level ? '[*]' : '[ ]';
      }
      const pipsText = this.add.text(-40, y, pipsStr, {
        fontSize: '9px',
        color: isMaxed ? colorToString(Theme.colors.success) : '#aaaaaa',
        fontFamily: 'monospace',
      });
      panel.addContent(pipsText);

      if (!isMaxed) {
        const costs = UPGRADE_COSTS[def.id];
        const cost = costs ? costs[level] : 999;
        const canAfford = currency >= cost;

        const costText = this.add.text(140, y, `${cost} 灵魂`, {
          fontSize: '9px',
          color: canAfford ? colorToString(Theme.colors.gold) : colorToString(Theme.colors.danger),
          fontFamily: 'monospace',
        });
        panel.addContent(costText);

        // Buy button
        const buyBg = this.add.graphics();
        buyBg.fillStyle(canAfford ? Theme.colors.primary : 0x555555, 0.8);
        buyBg.fillRoundedRect(200, y - 8, 40, 20, 3);
        panel.addContent(buyBg);

        const buyText = this.add.text(220, y + 2, UI.mainMenu.buy, {
          fontSize: '9px',
          color: canAfford ? '#ffffff' : '#888888',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        panel.addContent(buyText);

        // Transparent hit area covering the full buy button background (padded for easier clicking)
        if (canAfford) {
          const buyHit = this.add.rectangle(220, y + 2, 56, 32, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
          buyHit.on('pointerdown', () => {
            if (MetaManager.purchaseUpgrade(def.id)) {
              // Refresh panel
              this.upgradePanel?.close(() => {
                this.upgradePanel = null;
                this.showUpgradePanel();
              });
            }
          });
          panel.addContent(buyHit);
        }
      } else {
        const maxText = this.add.text(180, y, UI.mainMenu.max, {
          fontSize: '10px',
          color: colorToString(Theme.colors.success),
          fontFamily: 'monospace',
          fontStyle: 'bold',
        });
        panel.addContent(maxText);
      }
    });

    // Close button — use zone for larger hit area
    const closeText = this.add.text(0, 135, UI.mainMenu.close, {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    panel.addContent(closeText);

    const closeHit = this.add.rectangle(0, 135, 80, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => {
      this.upgradePanel?.close(() => { this.upgradePanel = null; });
    });
    panel.addContent(closeHit);

    panel.setContentHeight(upgrades.length * 48 + 80);
  }
}

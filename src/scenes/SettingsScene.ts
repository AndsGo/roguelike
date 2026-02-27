import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { Theme, colorToString, getAccessibility, setAccessibility } from '../ui/Theme';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../managers/SaveManager';
import { MetaManager } from '../managers/MetaManager';
import { TutorialSystem } from '../systems/TutorialSystem';
import { UI } from '../i18n';
import { KeybindingConfig, KeyAction, ACTION_LABELS } from '../config/keybindings';

/**
 * Settings scene accessible from MainMenu and BattlePauseMenu.
 * Provides volume sliders, save management, tutorial/meta reset.
 */
export class SettingsScene extends Phaser.Scene {
  private returnScene: string = 'MainMenuScene';

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = data?.returnScene ?? 'MainMenuScene';
  }

  create(): void {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Title
    this.add.text(GAME_WIDTH / 2, 30, UI.settings.title, {
      fontSize: '20px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const leftCol = 160;
    const rightCol = 520;
    let y = 75;

    // ---- Audio Section ----
    y = this.createVolumeSlider(leftCol, y, UI.settings.bgmVolume,
      AudioManager.getInstance().getBgmVolume(),
      (v) => AudioManager.getInstance().setBgmVolume(v));

    y += 10;

    y = this.createVolumeSlider(leftCol, y, UI.settings.sfxVolume,
      AudioManager.getInstance().getSfxVolume(),
      (v) => AudioManager.getInstance().setSfxVolume(v));

    y += 20;

    // ---- Save Slots Section ----
    for (let slot = 0; slot < 3; slot++) {
      this.createSaveSlotRow(leftCol, y, slot);
      y += 36;
    }

    y += 10;

    // ---- Tutorial Reset ----
    const tutorialLabel = this.add.text(leftCol, y,
      UI.settings.resetTutorials, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

    const tutorialBtn = new Button(this, rightCol, y,
      TutorialSystem.allSkipped() ? UI.settings.resetTutorialsDone : UI.settings.resetTutorials,
      120, 28, () => {
        TutorialSystem.resetTips();
        tutorialBtn.setText(UI.settings.resetTutorialsDone);
        tutorialBtn.setEnabled(false);
      }, Theme.colors.panelBorder);
    if (TutorialSystem.allSkipped()) {
      // Still allow reset even if all skipped
    }

    y += 44;

    // ---- Colorblind Mode ----
    const cbSettings = getAccessibility();
    this.add.text(leftCol, y, '色盲模式', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    const cbLabel = cbSettings.colorblindMode ? UI.settings.on : UI.settings.off;
    const cbBtn = new Button(this, rightCol, y, cbLabel, 80, 28, () => {
      const current = getAccessibility();
      const toggled = { ...current, colorblindMode: !current.colorblindMode };
      setAccessibility(toggled);
      cbBtn.setText(toggled.colorblindMode ? UI.settings.on : UI.settings.off);
    }, cbSettings.colorblindMode ? Theme.colors.success : Theme.colors.panelBorder);

    y += 40;

    // ---- Keybindings Section ----
    this.add.text(leftCol, y, UI.settings.keybindings, {
      fontSize: '11px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const resetKbBtn = new Button(this, rightCol, y, '重置', 60, 24, () => {
      KeybindingConfig.resetToDefaults();
      // Refresh the scene to show updated bindings
      this.scene.restart({ returnScene: this.returnScene });
    }, Theme.colors.panelBorder);

    y += 22;

    // Show rebindable keybindings (compact: 2 columns for skills, then pause/cancel)
    const rebindableActions: KeyAction[] = [
      'skill1', 'skill2', 'skill3', 'skill4',
      'skill5', 'skill6', 'skill7', 'skill8',
      'pause', 'cancel',
    ];

    // Layout in 2 columns for skill keys
    for (let i = 0; i < rebindableActions.length; i++) {
      const action = rebindableActions[i];
      const col = i < 8 ? (i % 2 === 0 ? leftCol : leftCol + 180) : leftCol;
      const row = i < 8 ? Math.floor(i / 2) : (4 + (i - 8));
      const rowY = y + row * 18;

      this.add.text(col, rowY, ACTION_LABELS[action], {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

      const keyText = this.add.text(col + 80, rowY,
        `[${KeybindingConfig.getDisplayKey(action)}]`, {
          fontSize: '9px',
          color: colorToString(Theme.colors.gold),
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

      keyText.on('pointerup', () => {
        this.startRebind(action, keyText);
      });
    }

    const totalRows = 4 + 2; // 4 rows of skill pairs + pause + cancel
    y += totalRows * 18 + 14;

    // ---- Meta Reset ----
    this.createMetaResetRow(leftCol, rightCol, y);

    // ---- Back Button ----
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 35, UI.settings.back,
      140, 36, () => {
        this.scene.start(this.returnScene);
      }, Theme.colors.primary);
  }

  private createVolumeSlider(
    x: number, y: number, label: string,
    initialValue: number,
    onChange: (value: number) => void,
  ): number {
    // Label
    this.add.text(x, y, label, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    const sliderX = 320;
    const sliderWidth = 200;
    const sliderY = y;

    // Track background
    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x333333, 1);
    trackBg.fillRoundedRect(sliderX, sliderY - 4, sliderWidth, 8, 4);

    // Filled portion
    const trackFill = this.add.graphics();
    this.drawSliderFill(trackFill, sliderX, sliderY, sliderWidth, initialValue);

    // Value text
    const valueText = this.add.text(sliderX + sliderWidth + 16, sliderY,
      `${Math.round(initialValue * 100)}%`, {
        fontSize: '10px',
        color: colorToString(Theme.colors.secondary),
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

    // Handle
    const handleX = sliderX + sliderWidth * initialValue;
    const handle = this.add.circle(handleX, sliderY, 8, Theme.colors.primary);
    handle.setStrokeStyle(2, 0xffffff);
    handle.setInteractive({ draggable: true, useHandCursor: true });

    // Hit zone for clicking on the track
    const hitZone = this.add.rectangle(
      sliderX + sliderWidth / 2, sliderY,
      sliderWidth + 16, 24, 0x000000, 0,
    ).setInteractive({ useHandCursor: true });

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const ratio = Phaser.Math.Clamp((pointer.x - sliderX) / sliderWidth, 0, 1);
      handle.x = sliderX + sliderWidth * ratio;
      this.drawSliderFill(trackFill, sliderX, sliderY, sliderWidth, ratio);
      valueText.setText(`${Math.round(ratio * 100)}%`);
      onChange(ratio);
    });

    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderWidth);
      handle.x = clampedX;
      const ratio = (clampedX - sliderX) / sliderWidth;
      this.drawSliderFill(trackFill, sliderX, sliderY, sliderWidth, ratio);
      valueText.setText(`${Math.round(ratio * 100)}%`);
      onChange(ratio);
    });

    return y + 34;
  }

  private drawSliderFill(
    graphics: Phaser.GameObjects.Graphics,
    x: number, y: number, width: number, ratio: number,
  ): void {
    graphics.clear();
    graphics.fillStyle(Theme.colors.primary, 1);
    graphics.fillRoundedRect(x, y - 4, width * ratio, 8, 4);
  }

  private createSaveSlotRow(x: number, y: number, slot: number): void {
    const hasSave = SaveManager.hasSave(slot);
    const info = hasSave ? SaveManager.getSaveInfo(slot) : null;

    const labelText = info
      ? UI.settings.saveInfo(slot, info.floor, info.heroCount)
      : UI.settings.saveEmpty(slot);

    const label = this.add.text(x, y, labelText, {
      fontSize: '10px',
      color: hasSave ? '#ffffff' : '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    if (hasSave) {
      const deleteBtn = new Button(this, 580, y,
        UI.settings.deleteSave(slot), 100, 24, () => {
          this.showDeleteConfirmation(slot, label, deleteBtn);
        }, Theme.colors.danger);
    }
  }

  private showDeleteConfirmation(
    slot: number,
    label: Phaser.GameObjects.Text,
    deleteBtn: Button,
  ): void {
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5,
    ).setInteractive();

    const panelBg = this.add.graphics();
    panelBg.fillStyle(Theme.colors.panel, 0.95);
    panelBg.fillRoundedRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 - 45, 300, 90, 8);
    panelBg.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panelBg.strokeRoundedRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 - 45, 300, 90, 8);

    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15,
      UI.settings.deleteSaveConfirm(slot), {
        fontSize: '12px',
        color: colorToString(Theme.colors.danger),
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);

    const elements = [overlay, panelBg, msg];

    const yesBtn = new Button(this, GAME_WIDTH / 2 - 55, GAME_HEIGHT / 2 + 20,
      UI.mainMenu.yes, 70, 26, () => {
        SaveManager.deleteSave(slot);
        label.setText(UI.settings.saveEmpty(slot));
        label.setColor('#666666');
        deleteBtn.destroy();
        elements.forEach(e => e.destroy());
        yesBtn.destroy();
        noBtn.destroy();
      }, Theme.colors.danger);

    const noBtn = new Button(this, GAME_WIDTH / 2 + 55, GAME_HEIGHT / 2 + 20,
      UI.mainMenu.no, 70, 26, () => {
        elements.forEach(e => e.destroy());
        yesBtn.destroy();
        noBtn.destroy();
      }, Theme.colors.primary);
  }

  /** Enter rebind mode: next key press reassigns the action */
  private startRebind(action: KeyAction, keyText: Phaser.GameObjects.Text): void {
    const originalText = keyText.text;
    keyText.setText('[按键...]');
    keyText.setColor(colorToString(Theme.colors.danger));

    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      const keyName = KeybindingConfig.keyCodeToName(event.keyCode);
      if (keyName) {
        KeybindingConfig.rebind(action, keyName);
        keyText.setText(`[${KeybindingConfig.getDisplayKey(action)}]`);
      } else {
        keyText.setText(originalText);
      }
      keyText.setColor(colorToString(Theme.colors.gold));
      this.game.canvas.removeEventListener('keydown', handler);
    };

    this.game.canvas.addEventListener('keydown', handler);

    // Also cancel on ESC with a timeout fallback
    this.time.delayedCall(5000, () => {
      keyText.setColor(colorToString(Theme.colors.gold));
      if (keyText.text === '[按键...]') {
        keyText.setText(originalText);
        this.game.canvas.removeEventListener('keydown', handler);
      }
    });
  }

  private createMetaResetRow(leftCol: number, rightCol: number, y: number): void {
    this.add.text(leftCol, y, UI.settings.resetMeta, {
      fontSize: '11px',
      color: colorToString(Theme.colors.danger),
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    let confirmStep = 0;
    const metaBtn = new Button(this, rightCol, y,
      UI.settings.resetMeta, 120, 28, () => {
        if (confirmStep === 0) {
          confirmStep = 1;
          metaBtn.setText(UI.settings.resetMetaConfirm);
          // Auto-revert after 3 seconds
          this.time.delayedCall(3000, () => {
            if (confirmStep === 1) {
              confirmStep = 0;
              metaBtn.setText(UI.settings.resetMeta);
            }
          });
        } else {
          MetaManager.resetAll();
          metaBtn.setText(UI.settings.resetMetaDone);
          metaBtn.setEnabled(false);
          confirmStep = 2;
        }
      }, Theme.colors.danger);
  }
}

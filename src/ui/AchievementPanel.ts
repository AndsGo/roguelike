import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString } from './Theme';
import { AchievementManager, AchievementDef } from '../managers/AchievementManager';
import { MetaManager } from '../managers/MetaManager';
import { ACHIEVEMENT_ICONS } from '../i18n';

const ROW_HEIGHT = 40;

/**
 * Full-screen achievement list panel accessible from MainMenuScene.
 * Shows all achievements with unlock status, icon, description, and reward.
 */
export class AchievementPanel {
  private panel: Panel;
  private scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Rectangle;
  private closeText: Phaser.GameObjects.Text;
  private closeHit: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;

  private static readonly PANEL_WIDTH = 520;
  private static readonly PANEL_HEIGHT = 380;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop (click to close)
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.5,
    ).setInteractive({ useHandCursor: true }).setDepth(799);
    this.backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only close when clicking outside the panel area
      const hw = AchievementPanel.PANEL_WIDTH / 2;
      const hh = AchievementPanel.PANEL_HEIGHT / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        this.close();
      }
    });

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, AchievementPanel.PANEL_WIDTH, AchievementPanel.PANEL_HEIGHT, {
      title: '成就列表',
      animate: true,
    });
    this.panel.setDepth(800);

    const achievements = AchievementManager.getAll();
    const unlocked = new Set(AchievementManager.getUnlocked());

    let y = -150;

    // Summary line
    const unlockedCount = unlocked.size;
    const totalCount = achievements.length;
    const summaryText = scene.add.text(0, y, `已解锁: ${unlockedCount}/${totalCount}`, {
      fontSize: '11px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.panel.addContent(summaryText);
    y += 22;

    // Achievement rows
    for (const ach of achievements) {
      const isUnlocked = unlocked.has(ach.id);
      this.renderRow(ach, isUnlocked, y);
      y += ROW_HEIGHT;
    }

    this.panel.setContentHeight(achievements.length * ROW_HEIGHT + 80);

    // Fixed close button (outside scrollable content, always visible)
    this.closeText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + AchievementPanel.PANEL_HEIGHT / 2 - 16, '[ 关闭 ]', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + AchievementPanel.PANEL_HEIGHT / 2 - 16, 80, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(801);
    this.closeHit.on('pointerdown', () => this.close());
  }

  private renderRow(ach: AchievementDef, isUnlocked: boolean, y: number): void {
    const scene = this.scene;
    const leftX = -230;

    // Row background (subtle)
    const rowBg = scene.add.graphics();
    rowBg.fillStyle(isUnlocked ? 0x223322 : 0x222233, 0.3);
    rowBg.fillRoundedRect(leftX, y - 6, 460, ROW_HEIGHT - 4, 3);
    this.panel.addContent(rowBg);

    // Icon (map text icon name to emoji)
    const iconChar = ACHIEVEMENT_ICONS[ach.icon] ?? ach.icon;
    const iconText = scene.add.text(leftX + 6, y + 2, iconChar, {
      fontSize: '16px',
      color: isUnlocked ? '#ffffff' : '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.panel.addContent(iconText);

    // Name
    const nameText = scene.add.text(leftX + 30, y - 4, ach.name, {
      fontSize: '10px',
      color: isUnlocked ? '#ffffff' : '#888888',
      fontFamily: 'monospace',
      fontStyle: isUnlocked ? 'bold' : 'normal',
    });
    this.panel.addContent(nameText);

    // Description
    const descText = scene.add.text(leftX + 30, y + 10, ach.description, {
      fontSize: '8px',
      color: isUnlocked ? '#aabbcc' : '#555566',
      fontFamily: 'monospace',
      wordWrap: { width: 320 },
    });
    this.panel.addContent(descText);

    // Status badge
    const statusText = isUnlocked ? '✓ 已完成' : '未完成';
    const statusColor = isUnlocked ? colorToString(Theme.colors.success) : '#666666';
    const badge = scene.add.text(leftX + 380, y - 4, statusText, {
      fontSize: '9px',
      color: statusColor,
      fontFamily: 'monospace',
    });
    this.panel.addContent(badge);

    // Reward info
    if (ach.reward) {
      let rewardStr = '';
      switch (ach.reward.type) {
        case 'meta_currency':
          rewardStr = `灵魂 +${ach.reward.value}`;
          break;
        case 'unlock_hero':
          rewardStr = `解锁英雄`;
          break;
        case 'unlock_relic':
          rewardStr = `解锁遗物`;
          break;
      }
      const rewardText = scene.add.text(leftX + 380, y + 10, rewardStr, {
        fontSize: '8px',
        color: isUnlocked ? colorToString(Theme.colors.gold) : '#555555',
        fontFamily: 'monospace',
      });
      this.panel.addContent(rewardText);
    }
  }

  close(onComplete?: () => void): void {
    this.backdrop.destroy();
    this.closeText.destroy();
    this.closeHit.destroy();
    this.panel.close(() => {
      this.onCloseCallback();
      if (onComplete) onComplete();
    });
  }
}

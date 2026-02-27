import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString } from './Theme';
import { AchievementManager, AchievementDef } from '../managers/AchievementManager';
import { MetaManager } from '../managers/MetaManager';

const ROW_HEIGHT = 40;

/**
 * Full-screen achievement list panel accessible from MainMenuScene.
 * Shows all achievements with unlock status, icon, description, and reward.
 */
export class AchievementPanel {
  private panel: Panel;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 380, {
      title: '成就列表',
      animate: true,
    });

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

    // Close button
    const closeText = scene.add.text(0, y + 10, '[ 关闭 ]', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.panel.addContent(closeText);

    const closeHit = scene.add.rectangle(0, y + 10, 80, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => {
      this.panel.close(onClose);
    });
    this.panel.addContent(closeHit);

    this.panel.setContentHeight(achievements.length * ROW_HEIGHT + 80);
  }

  private renderRow(ach: AchievementDef, isUnlocked: boolean, y: number): void {
    const scene = this.scene;
    const leftX = -230;

    // Row background (subtle)
    const rowBg = scene.add.graphics();
    rowBg.fillStyle(isUnlocked ? 0x223322 : 0x222233, 0.3);
    rowBg.fillRoundedRect(leftX, y - 6, 460, ROW_HEIGHT - 4, 3);
    this.panel.addContent(rowBg);

    // Icon
    const iconText = scene.add.text(leftX + 6, y + 2, ach.icon, {
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
    this.panel.close(onComplete);
  }
}

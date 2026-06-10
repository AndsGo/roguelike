import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { ErrorHandler } from './ErrorHandler';
import { SaveManager } from '../managers/SaveManager';
import { TextFactory } from '../ui/TextFactory';
import { viewBounds } from '../ui/Viewport';

/** A tutorial tip shown once to the player */
export interface TutorialTip {
  id: string;
  trigger: string;   // scene key or event name
  title: string;
  message: string;
  position?: { x: number; y: number };
  /** Optional highlight region — shows a spotlight cutout instead of full backdrop */
  highlight?: { x: number; y: number; width: number; height: number };
}

const TIPS_KEY = 'roguelike_seen_tips';

/**
 * Tutorial/hint system that shows one-time tips to new players.
 * Tips are triggered by scene entry or EventBus events.
 * Seen tips are persisted in localStorage.
 */
export class TutorialSystem {
  private static seenTips: Set<string> = new Set();
  private static initialized = false;
  private static activeScene: Phaser.Scene | null = null;

  static TIPS: TutorialTip[] = [
    {
      id: 'first_battle',
      trigger: 'BattleScene',
      title: '战斗基础',
      message: '英雄会自动战斗！使用1x/2x/3x按钮调整战斗速度。',
      highlight: { x: 340, y: 410, width: 120, height: 30 },
    },
    {
      id: 'first_shop',
      trigger: 'ShopScene',
      title: '商店',
      message: '用金币购买装备来提升英雄的属性。',
      highlight: { x: 100, y: 100, width: 600, height: 250 },
    },
    {
      id: 'first_event',
      trigger: 'EventScene',
      title: '事件',
      message: '做出选择！每个选项都有不同的风险和奖励。',
    },
    {
      id: 'first_rest',
      trigger: 'RestScene',
      title: '休息站',
      message: '休息可恢复每个英雄30%的最大生命值。',
    },
    {
      id: 'first_map',
      trigger: 'MapScene',
      title: '冒险地图',
      message: '选择下一个节点前进。不同节点类型提供战斗、商店、事件和休息。',
      highlight: { x: 50, y: 60, width: 200, height: 80 },
    },
    {
      id: 'first_element',
      trigger: 'element:reaction',
      title: '元素反应',
      message: '不同元素组合可以触发强大的元素反应！',
    },
    {
      id: 'first_synergy',
      trigger: 'synergy_activated',
      title: '羁绊',
      message: '拥有相同种族或职业的英雄可以激活羁绊加成！',
    },
    {
      id: 'first_relic',
      trigger: 'relic:acquire',
      title: '遗物',
      message: '遗物提供强大的被动效果，持续整个冒险！',
    },
    {
      id: 'first_elite',
      trigger: 'elite_battle',
      title: '精英战斗',
      message: '精英敌人更强大，但会掉落更好的奖励！',
    },
    {
      id: 'first_boss',
      trigger: 'boss_battle',
      title: '首领战斗',
      message: '首领战是每章的终极挑战，做好准备！',
    },
  ];

  /** Load seen tips from localStorage and register EventBus listeners */
  static init(): void {
    if (TutorialSystem.initialized) return;
    TutorialSystem.initialized = true;

    // Load persisted tips
    const saved = SaveManager.loadData<string[]>(TIPS_KEY);
    if (saved) {
      TutorialSystem.seenTips = new Set(saved);
    }

    TutorialSystem.registerEventListeners();
  }

  /**
   * Register the EventBus listeners for event-triggered tips
   * (`first_element`, `first_relic`).
   *
   * MUST be re-called after every `EventBus.reset()` (see
   * `GameLifecycle.prepareNewRun`). `newRun()` resets the bus before the player
   * ever triggers a reaction or picks up a relic, so without re-registration
   * these two tips would never fire for the entire session.
   */
  static registerEventListeners(): void {
    const bus = EventBus.getInstance();
    bus.on('element:reaction', () => {
      if (TutorialSystem.activeScene) {
        TutorialSystem.showTipIfNeeded(TutorialSystem.activeScene, 'first_element');
      }
    });
    bus.on('relic:acquire', () => {
      if (TutorialSystem.activeScene) {
        TutorialSystem.showTipIfNeeded(TutorialSystem.activeScene, 'first_relic');
      }
    });
  }

  /** Set the currently active scene for event-triggered tips */
  static setScene(scene: Phaser.Scene): void {
    TutorialSystem.activeScene = scene;
  }

  /**
   * Show a tip if the player hasn't seen it yet.
   * Call this from scenes when entering or on specific triggers.
   */
  static showTipIfNeeded(scene: Phaser.Scene, tipId: string): void {
    TutorialSystem.activeScene = scene;
    if (TutorialSystem.seenTips.has(tipId)) return;

    const tip = TutorialSystem.TIPS.find(t => t.id === tipId);
    if (!tip) return;

    TutorialSystem.markSeen(tipId);
    TutorialSystem.renderTip(scene, tip);
  }

  /** Mark a tip as seen and persist */
  static markSeen(tipId: string): void {
    TutorialSystem.seenTips.add(tipId);
    SaveManager.saveData(TIPS_KEY, [...TutorialSystem.seenTips]);
  }

  /** Check if a tip has been seen */
  static hasSeen(tipId: string): boolean {
    return TutorialSystem.seenTips.has(tipId);
  }

  /** Mark all tips as seen (skip all tutorials) */
  static skipAll(): void {
    for (const tip of TutorialSystem.TIPS) {
      TutorialSystem.seenTips.add(tip.id);
    }
    SaveManager.saveData(TIPS_KEY, [...TutorialSystem.seenTips]);
  }

  /** Check if all tips have been seen */
  static allSkipped(): boolean {
    return TutorialSystem.TIPS.every(t => TutorialSystem.seenTips.has(t.id));
  }

  /** Reset all seen tips (e.g., from settings) */
  static resetTips(): void {
    TutorialSystem.seenTips.clear();
    SaveManager.saveData(TIPS_KEY, []);
  }

  /** Render a tip as a Phaser overlay panel */
  private static renderTip(scene: Phaser.Scene, tip: TutorialTip): void {
    const panelWidth = 320;
    const panelHeight = 120;
    const allElements: Phaser.GameObjects.GameObject[] = [];
    // Visible design rect — correct under both UI and world cameras
    const vb = viewBounds(scene);

    if (tip.highlight) {
      // Spotlight mode: 4 dark rectangles around the highlight region + border
      const hl = tip.highlight;
      const alpha = 0.5;
      const vRight = vb.x + vb.w;
      const vBottom = vb.y + vb.h;

      // Top
      const top = scene.add.rectangle(vb.cx, (vb.y + hl.y) / 2, vb.w, Math.max(0, hl.y - vb.y), 0x000000, alpha)
        .setDepth(900).setInteractive({ useHandCursor: true });
      // Bottom
      const bottomY = hl.y + hl.height;
      const bottom = scene.add.rectangle(vb.cx, (bottomY + vBottom) / 2, vb.w, Math.max(0, vBottom - bottomY), 0x000000, alpha)
        .setDepth(900).setInteractive({ useHandCursor: true });
      // Left
      const left = scene.add.rectangle((vb.x + hl.x) / 2, hl.y + hl.height / 2, Math.max(0, hl.x - vb.x), hl.height, 0x000000, alpha)
        .setDepth(900).setInteractive({ useHandCursor: true });
      // Right
      const rightX = hl.x + hl.width;
      const right = scene.add.rectangle((rightX + vRight) / 2, hl.y + hl.height / 2, Math.max(0, vRight - rightX), hl.height, 0x000000, alpha)
        .setDepth(900).setInteractive({ useHandCursor: true });

      // Highlight border
      const border = scene.add.graphics().setDepth(901);
      border.lineStyle(2, 0x4488ff, 1);
      border.strokeRect(hl.x, hl.y, hl.width, hl.height);

      allElements.push(top, bottom, left, right, border);

      // Position panel above or below the highlight
      const panelAbove = hl.y > panelHeight + 20;
      const panelCx = Math.min(Math.max(hl.x + hl.width / 2, vb.x + panelWidth / 2 + 10), vb.x + vb.w - panelWidth / 2 - 10);
      const panelCy = panelAbove
        ? hl.y - panelHeight / 2 - 10
        : hl.y + hl.height + panelHeight / 2 + 10;

      const panelBg = scene.add.rectangle(panelCx, panelCy, panelWidth, panelHeight, 0x1a1a2e, 0.95)
        .setDepth(901).setStrokeStyle(2, 0x4488ff);
      allElements.push(panelBg);

      const title = TextFactory.create(scene, panelCx, panelCy - 35, tip.title, 'subtitle', {
        color: '#ffdd44',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(title);

      const message = TextFactory.create(scene, panelCx, panelCy + 5, tip.message, 'body', {
        color: '#ccccdd',
        wordWrap: { width: panelWidth - 30 }, align: 'center',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(message);

      const closeText = TextFactory.create(scene, panelCx, panelCy + 45, '[ 点击继续 ]', 'label', {
        color: '#888899',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(closeText);

      // Dismiss on clicking any dark region
      const dismiss = (): void => {
        for (const el of allElements) el.destroy();
      };
      top.on('pointerdown', dismiss);
      bottom.on('pointerdown', dismiss);
      left.on('pointerdown', dismiss);
      right.on('pointerdown', dismiss);
      panelBg.setInteractive({ useHandCursor: true }).on('pointerdown', dismiss);

      scene.time.delayedCall(8000, () => {
        if (top.active) dismiss();
      });
    } else {
      // Original full-screen mode
      const cx = tip.position?.x ?? vb.cx;
      const cy = tip.position?.y ?? vb.cy;

      const backdrop = scene.add.rectangle(
        vb.cx, vb.cy,
        vb.w + 4, vb.h + 4,
        0x000000, 0.4,
      ).setDepth(900).setInteractive({ useHandCursor: true });
      allElements.push(backdrop);

      const panel = scene.add.rectangle(cx, cy, panelWidth, panelHeight, 0x1a1a2e, 0.95)
        .setDepth(901).setStrokeStyle(2, 0x4488ff);
      allElements.push(panel);

      const title = TextFactory.create(scene, cx, cy - 35, tip.title, 'subtitle', {
        color: '#ffdd44',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(title);

      const message = TextFactory.create(scene, cx, cy + 5, tip.message, 'body', {
        color: '#ccccdd',
        wordWrap: { width: panelWidth - 30 }, align: 'center',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(message);

      const closeText = TextFactory.create(scene, cx, cy + 45, '[ 点击继续 ]', 'label', {
        color: '#888899',
      }).setOrigin(0.5).setDepth(902);
      allElements.push(closeText);

      const dismiss = (): void => {
        for (const el of allElements) el.destroy();
      };

      backdrop.on('pointerdown', dismiss);
      panel.setInteractive({ useHandCursor: true }).on('pointerdown', dismiss);

      scene.time.delayedCall(8000, () => {
        if (backdrop.active) dismiss();
      });
    }
  }
}

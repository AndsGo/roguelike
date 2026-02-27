import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/balance';

/** A tutorial tip shown once to the player */
export interface TutorialTip {
  id: string;
  trigger: string;   // scene key or event name
  title: string;
  message: string;
  position?: { x: number; y: number };
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

  static TIPS: TutorialTip[] = [
    {
      id: 'first_battle',
      trigger: 'BattleScene',
      title: '战斗基础',
      message: '英雄会自动战斗！使用1x/2x/3x按钮调整战斗速度。',
    },
    {
      id: 'first_shop',
      trigger: 'ShopScene',
      title: '商店',
      message: '用金币购买装备来提升英雄的属性。',
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
    try {
      const raw = localStorage.getItem(TIPS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        TutorialSystem.seenTips = new Set(arr);
      }
    } catch {
      TutorialSystem.seenTips = new Set();
    }

    // Register EventBus listeners for event-triggered tips
    const bus = EventBus.getInstance();
    const eventTips = TutorialSystem.TIPS.filter(t => t.trigger.includes(':'));
    for (const tip of eventTips) {
      // Only listen to known GameEventType triggers
      if (tip.trigger === 'element:reaction') {
        bus.on('element:reaction', () => {
          // We can't show the tip without a scene reference here,
          // so we mark it as pending and let the scene check
        });
      }
      if (tip.trigger === 'relic:acquire') {
        bus.on('relic:acquire', () => {
          // Same - scene must call showTipIfNeeded
        });
      }
    }
  }

  /**
   * Show a tip if the player hasn't seen it yet.
   * Call this from scenes when entering or on specific triggers.
   */
  static showTipIfNeeded(scene: Phaser.Scene, tipId: string): void {
    if (TutorialSystem.seenTips.has(tipId)) return;

    const tip = TutorialSystem.TIPS.find(t => t.id === tipId);
    if (!tip) return;

    TutorialSystem.markSeen(tipId);
    TutorialSystem.renderTip(scene, tip);
  }

  /** Mark a tip as seen and persist */
  static markSeen(tipId: string): void {
    TutorialSystem.seenTips.add(tipId);
    try {
      localStorage.setItem(TIPS_KEY, JSON.stringify([...TutorialSystem.seenTips]));
    } catch {
      // Ignore storage errors
    }
  }

  /** Check if a tip has been seen */
  static hasSeen(tipId: string): boolean {
    return TutorialSystem.seenTips.has(tipId);
  }

  /** Reset all seen tips (e.g., from settings) */
  static resetTips(): void {
    TutorialSystem.seenTips.clear();
    try {
      localStorage.removeItem(TIPS_KEY);
    } catch {
      // Ignore
    }
  }

  /** Render a tip as a Phaser overlay panel */
  private static renderTip(scene: Phaser.Scene, tip: TutorialTip): void {
    const cx = tip.position?.x ?? GAME_WIDTH / 2;
    const cy = tip.position?.y ?? GAME_HEIGHT / 2;

    const panelWidth = 320;
    const panelHeight = 120;

    // Semi-transparent backdrop
    const backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.4,
    ).setDepth(900).setInteractive({ useHandCursor: true });

    // Panel background
    const panel = scene.add.rectangle(cx, cy, panelWidth, panelHeight, 0x1a1a2e, 0.95)
      .setDepth(901)
      .setStrokeStyle(2, 0x4488ff);

    // Title
    const title = scene.add.text(cx, cy - 35, tip.title, {
      fontSize: '16px',
      color: '#ffdd44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(902);

    // Message
    const message = scene.add.text(cx, cy + 5, tip.message, {
      fontSize: '11px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      wordWrap: { width: panelWidth - 30 },
      align: 'center',
    }).setOrigin(0.5).setDepth(902);

    // Close button / instruction
    const closeText = scene.add.text(cx, cy + 45, '[ 点击继续 ]', {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(902);

    // Click to dismiss
    const dismiss = (): void => {
      backdrop.destroy();
      panel.destroy();
      title.destroy();
      message.destroy();
      closeText.destroy();
    };

    backdrop.on('pointerdown', dismiss);
    panel.setInteractive({ useHandCursor: true }).on('pointerdown', dismiss);

    // Auto-dismiss after 8 seconds
    scene.time.delayedCall(8000, () => {
      if (backdrop.active) dismiss();
    });
  }
}

import Phaser from 'phaser';
import { MapNode, BattleNodeData, EventNodeData } from '../types';
import { Theme, colorToString } from './Theme';
import { UI } from '../i18n';
import enemiesData from '../data/enemies.json';
import eventsData from '../data/events.json';

const TOOLTIP_MAX_WIDTH = 180;
const PADDING = 6;

/**
 * Tooltip shown when hovering over map nodes.
 * Shows enemy composition for battle/elite/boss, event title, or item count.
 */
export class NodeTooltip extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, node: MapNode) {
    super(scene, x, y);
    this.setDepth(500);

    const lines = this.buildLines(node);
    if (lines.length === 0) return;

    const text = scene.add.text(0, 0, lines.join('\n'), {
      fontSize: '9px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      lineSpacing: 2,
      wordWrap: { width: TOOLTIP_MAX_WIDTH - PADDING * 2 },
    });

    const bg = scene.add.graphics();
    const w = Math.min(text.width + PADDING * 2, TOOLTIP_MAX_WIDTH);
    const h = text.height + PADDING * 2;

    // Position above the node, with clamping
    this.y = y - h - 10;
    if (this.y < 5) this.y = y + 20; // flip below if too high

    bg.fillStyle(Theme.colors.panel, 0.95);
    bg.fillRoundedRect(-w / 2, 0, w, h, 4);
    bg.lineStyle(1, Theme.colors.panelBorder, 0.7);
    bg.strokeRoundedRect(-w / 2, 0, w, h, 4);

    text.setPosition(-w / 2 + PADDING, PADDING);

    this.add(bg);
    this.add(text);
  }

  private buildLines(node: MapNode): string[] {
    const lines: string[] = [];
    const typeName = UI.nodeType[node.type] ?? node.type;
    lines.push(typeName);

    switch (node.type) {
      case 'battle':
      case 'elite':
      case 'boss': {
        const battleData = node.data as BattleNodeData | undefined;
        if (battleData?.enemies) {
          for (const e of battleData.enemies) {
            const enemyDef = (enemiesData as { id: string; name: string }[]).find(ed => ed.id === e.id);
            const name = enemyDef?.name ?? e.id;
            lines.push(`  ${name} Lv.${e.level}`);
          }
        }
        break;
      }
      case 'event': {
        const eventData = node.data as EventNodeData | undefined;
        if (eventData?.eventId) {
          const eventDef = (eventsData as { id: string; title: string }[]).find(ed => ed.id === eventData.eventId);
          if (eventDef) {
            lines.push(`  ${eventDef.title}`);
          }
        }
        break;
      }
      case 'shop':
        lines.push('  浏览和购买装备');
        break;
      case 'rest':
        lines.push('  恢复队伍生命');
        break;
    }

    return lines;
  }
}

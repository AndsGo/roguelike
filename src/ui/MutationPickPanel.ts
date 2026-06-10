import Phaser from 'phaser';
import { viewBounds } from './Viewport';
import { Theme, colorToString } from './Theme';
import { Button } from './Button';
import { UI } from '../i18n';
import { TextFactory } from './TextFactory';
import { AudioManager } from '../systems/AudioManager';
import { MetaManager } from '../managers/MetaManager';

/**
 * Per-run mutation pick: once the player owns 3+ mutations, each run starts
 * by choosing ONE of three randomly offered unlocked mutations (the others
 * stay dormant this run). Gives runs a "same heroes, different rules" axis —
 * the Hades Pact-style variety the replayability review asked for.
 */
export class MutationPickPanel {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private onPick: (mutationId: string) => void;

  constructor(scene: Phaser.Scene, offeredIds: string[], onPick: (mutationId: string) => void) {
    this.scene = scene;
    this.onPick = onPick;
    this.build(offeredIds);
  }

  private build(offeredIds: string[]): void {
    const b = viewBounds(this.scene);
    const cx = b.cx;
    const cy = b.cy;
    const panelW = Math.min(540, b.w - 16);
    const panelH = Math.min(300, b.h - 16);

    // Backdrop — a pick is mandatory, no click-outside close
    const backdrop = this.scene.add.rectangle(cx, cy, b.w + 4, b.h + 4, 0x000000, Theme.modalBackdropAlpha)
      .setInteractive().setDepth(899);
    this.elements.push(backdrop);

    const bg = this.scene.add.graphics().setDepth(900);
    bg.fillStyle(Theme.colors.panel, 0.97);
    bg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    bg.lineStyle(2, 0xcc44cc, 0.8);
    bg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    this.elements.push(bg);

    const title = TextFactory.create(this.scene, cx, cy - panelH / 2 + 22, '本局变异 — 三选一', 'subtitle', {
      color: '#cc66cc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(901);
    this.elements.push(title);

    const hint = TextFactory.create(this.scene, cx, cy - panelH / 2 + 42, '已解锁的变异中,本局仅生效你选择的一项', 'small', {
      color: '#9988aa',
    }).setOrigin(0.5).setDepth(901);
    this.elements.push(hint);

    const cardW = Math.floor((panelW - 48) / 3);
    const cardH = panelH - 110;
    const cardY = cy - panelH / 2 + 58;
    const mutStrings = UI.mutation as unknown as Record<string, string>;

    offeredIds.forEach((id, i) => {
      const x = cx - panelW / 2 + 12 + i * (cardW + 12);
      const cardBg = this.scene.add.graphics().setDepth(900);
      cardBg.fillStyle(Theme.colors.panel, 0.9);
      cardBg.fillRoundedRect(x, cardY, cardW, cardH, 6);
      cardBg.lineStyle(1, 0xcc44cc, 0.5);
      cardBg.strokeRoundedRect(x, cardY, cardW, cardH, 6);
      this.elements.push(cardBg);

      const name = TextFactory.create(this.scene, x + cardW / 2, cardY + 18, mutStrings[id] ?? id, 'body', {
        color: '#ffffff', fontStyle: 'bold',
        wordWrap: { width: cardW - 12, useAdvancedWrap: true },
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(901);
      this.elements.push(name);

      const desc = TextFactory.create(this.scene, x + cardW / 2, cardY + 52, mutStrings[`desc_${id}`] ?? '', 'small', {
        color: '#aaaacc',
        wordWrap: { width: cardW - 14, useAdvancedWrap: true },
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(901);
      this.elements.push(desc);

      const btn = new Button(this.scene, x + cardW / 2, cardY + cardH - 22, '选择', Math.min(96, cardW - 16), 28, () => {
        this.pick(id);
      }, 0x8844aa);
      btn.setDepth(901);
      this.elements.push(btn);
    });
  }

  private pick(id: string): void {
    AudioManager.getInstance().playSfx('sfx_levelup');
    this.onPick(id);
    this.destroy();
  }

  destroy(): void {
    for (const el of this.elements) el.destroy();
    this.elements = [];
  }

  /** Offer 3 random unlocked mutations (or null if fewer than 3 unlocked).
   *  Uses Math.random intentionally — the run RNG doesn't exist yet at draft
   *  time, and mutation offers shouldn't consume seeded-run randomness. */
  static rollOffers(): string[] | null {
    const unlocked = MetaManager.getMutations();
    if (unlocked.length < 3) return null;
    const pool = [...unlocked];
    const offers: string[] = [];
    while (offers.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      offers.push(pool.splice(idx, 1)[0]);
    }
    return offers;
  }
}

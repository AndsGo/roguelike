import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, getRoleColor } from './Theme';
import { Button } from './Button';
import { HeroState } from '../types';
import { RunManager, autoFormationByRole } from '../managers/RunManager';
import { getOrCreateTexture, ChibiConfig } from '../systems/UnitRenderer';
import { UI } from '../i18n';

const PANEL_W = 400;
const PANEL_H = 280;

export class FormationPanel {
  private scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private onClose?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.build();
  }

  private build(): void {
    this.clearObjects();
    const scene = this.scene;
    const panelX = (GAME_WIDTH - PANEL_W) / 2;
    const panelY = (GAME_HEIGHT - PANEL_H) / 2;

    // Backdrop
    const backdrop = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setDepth(799).setInteractive();
    backdrop.on('pointerup', (p: Phaser.Input.Pointer) => {
      const px = p.x, py = p.y;
      if (px < panelX || px > panelX + PANEL_W || py < panelY || py > panelY + PANEL_H) {
        this.close();
      }
    });
    this.objects.push(backdrop);

    // Panel background
    const bg = scene.add.graphics().setDepth(800);
    bg.fillStyle(Theme.colors.panel, 0.95);
    bg.fillRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 8);
    bg.lineStyle(2, Theme.colors.panelBorder, 1);
    bg.strokeRoundedRect(panelX, panelY, PANEL_W, PANEL_H, 8);
    this.objects.push(bg);

    // Title
    const title = scene.add.text(GAME_WIDTH / 2, panelY + 20, UI.formation.title, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(800);
    this.objects.push(title);

    // Tip
    const tip = scene.add.text(GAME_WIDTH / 2, panelY + 38, UI.formation.tip, {
      fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(800);
    this.objects.push(tip);

    // Column labels — front on right (closer to enemies visually), back on left
    const frontX = GAME_WIDTH / 2 + 80;
    const backX = GAME_WIDTH / 2 - 80;

    const frontLabel = scene.add.text(frontX, panelY + 58, UI.formation.front, {
      fontSize: '11px', color: '#ff8844', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(800);
    this.objects.push(frontLabel);

    const backLabel = scene.add.text(backX, panelY + 58, UI.formation.back, {
      fontSize: '11px', color: '#44aaff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(800);
    this.objects.push(backLabel);

    // Divider line
    const divider = scene.add.graphics().setDepth(800);
    divider.lineStyle(1, 0x555555, 0.5);
    divider.lineBetween(GAME_WIDTH / 2, panelY + 70, GAME_WIDTH / 2, panelY + PANEL_H - 50);
    this.objects.push(divider);

    // Draw heroes in their columns
    const rm = RunManager.getInstance();
    const heroes = rm.getHeroes();
    const frontHeroes = heroes.filter(h => rm.getHeroFormation(h.id) === 'front');
    const backHeroes = heroes.filter(h => rm.getHeroFormation(h.id) === 'back');

    this.drawColumn(frontHeroes, frontX, panelY + 80);
    this.drawColumn(backHeroes, backX, panelY + 80);

    // Auto-assign button
    const autoBtn = new Button(scene, GAME_WIDTH / 2, panelY + PANEL_H - 28,
      UI.formation.autoAssign, 100, 24, () => {
        this.autoAssignAll();
      });
    autoBtn.setDepth(801);
    this.objects.push(autoBtn);

    // Close button
    const closeBtn = new Button(scene, panelX + PANEL_W - 20, panelY + 12,
      '✕', 24, 24, () => {
        this.close();
      });
    closeBtn.setDepth(801);
    this.objects.push(closeBtn);
  }

  private drawColumn(heroes: HeroState[], x: number, startY: number): void {
    const rm = RunManager.getInstance();

    heroes.forEach((hero, i) => {
      const spacing = Math.min(55, (PANEL_H - 130) / Math.max(heroes.length, 1));
      const y = startY + i * spacing;
      const data = rm.getHeroData(hero.id);

      // Chibi sprite
      const config: ChibiConfig = {
        role: data.role as ChibiConfig['role'],
        race: (data.race ?? 'human') as ChibiConfig['race'],
        classType: (data.class ?? 'warrior') as ChibiConfig['classType'],
        fillColor: getRoleColor(data.role),
        borderColor: 0x000000,
        isHero: true,
        isBoss: false,
      };
      const textureKey = getOrCreateTexture(this.scene, config);
      const sprite = this.scene.add.image(x, y, textureKey).setDepth(800);
      this.objects.push(sprite);

      // Name
      const name = this.scene.add.text(x, y + 22, data.name, {
        fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(800);
      this.objects.push(name);

      // Hit zone for tap-to-toggle
      const hitZone = this.scene.add.rectangle(x, y + 5, 60, 50, 0x000000, 0)
        .setInteractive({ useHandCursor: true }).setDepth(801);
      hitZone.on('pointerup', () => {
        const current = rm.getHeroFormation(hero.id);
        rm.setHeroFormation(hero.id, current === 'front' ? 'back' : 'front');
        this.build(); // rebuild to refresh layout
      });
      this.objects.push(hitZone);
    });
  }

  private autoAssignAll(): void {
    const rm = RunManager.getInstance();
    const heroes = rm.getHeroes();
    for (const hero of heroes) {
      const data = rm.getHeroData(hero.id);
      rm.setHeroFormation(hero.id, autoFormationByRole(data.role));
    }
    this.build(); // rebuild
  }

  private clearObjects(): void {
    for (const obj of this.objects) {
      obj.destroy();
    }
    this.objects = [];
  }

  close(): void {
    this.clearObjects();
    if (this.onClose) this.onClose();
  }
}

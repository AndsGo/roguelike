import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { DEPTH } from '../config/visual';
import { viewBounds } from '../ui/Viewport';

/** Standard transition durations (ms) */
export const TRANSITION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Scene transition utility.
 * Provides fade and slide transitions between scenes.
 */
export class SceneTransition {
  /**
   * Fade out current scene, start target scene, fade in.
   */
  static fadeTransition(
    scene: Phaser.Scene,
    targetScene: string,
    data?: object,
    duration: number = TRANSITION.NORMAL,
  ): void {
    // Create black overlay
    const b = viewBounds(scene);
    const overlay = scene.add.rectangle(
      b.cx, b.cy,
      b.w + 4, b.h + 4,
      0x000000, 0,
    ).setDepth(DEPTH.SCENE_OVERLAY);

    // Fade to black
    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: duration / 2,
      ease: 'Sine.easeIn',
      onComplete: () => {
        AudioManager.getInstance().onSceneStart(targetScene);
        scene.scene.start(targetScene, data);
      },
    });
  }

  /**
   * Slide current scene out and start target scene.
   */
  static slideTransition(
    scene: Phaser.Scene,
    targetScene: string,
    direction: 'left' | 'right' | 'up' | 'down' = 'left',
    data?: object,
    duration: number = TRANSITION.NORMAL,
  ): void {
    const b = viewBounds(scene);
    const overlay = scene.add.rectangle(
      b.cx, b.cy,
      b.w + 4, b.h + 4,
      0x000000, 0,
    ).setDepth(DEPTH.SCENE_OVERLAY);

    let camX = 0;
    let camY = 0;
    switch (direction) {
      case 'left': camX = b.w; break;
      case 'right': camX = -b.w; break;
      case 'up': camY = b.h; break;
      case 'down': camY = -b.h; break;
    }

    // Slide camera and fade overlay
    scene.tweens.add({
      targets: scene.cameras.main,
      scrollX: camX,
      scrollY: camY,
      duration,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        scene.cameras.main.scrollX = 0;
        scene.cameras.main.scrollY = 0;
        AudioManager.getInstance().onSceneStart(targetScene);
        scene.scene.start(targetScene, data);
      },
    });
  }
}

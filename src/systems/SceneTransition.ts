import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

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
    duration: number = 400,
  ): void {
    // Create black overlay
    const overlay = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0,
    ).setDepth(9999);

    // Fade to black
    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: duration / 2,
      ease: 'Sine.easeIn',
      onComplete: () => {
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
    duration: number = 400,
  ): void {
    const overlay = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0,
    ).setDepth(9999);

    let camX = 0;
    let camY = 0;
    switch (direction) {
      case 'left': camX = GAME_WIDTH; break;
      case 'right': camX = -GAME_WIDTH; break;
      case 'up': camY = GAME_HEIGHT; break;
      case 'down': camY = -GAME_HEIGHT; break;
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
        scene.scene.start(targetScene, data);
      },
    });
  }
}

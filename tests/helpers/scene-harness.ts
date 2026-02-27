/**
 * Test harness for Phaser Scenes.
 * Provides utilities to instantiate scenes with mocked Phaser,
 * run frame ticks, and query rendered content.
 */
import Phaser from 'phaser';

export class SceneTestHarness {
  /**
   * Create and initialise a Scene subclass with the mock Phaser environment.
   * Calls `init(initData)` and `create()` automatically.
   */
  static createScene<T extends Phaser.Scene>(
    SceneClass: new () => T,
    initData?: Record<string, unknown>,
  ): T {
    const scene = new SceneClass();

    // Wire up mock scene internals
    (scene as any).sys = {
      game: {
        config: {},
        events: { on: () => {}, off: () => {}, emit: () => {} },
        sound: { add: () => ({ play: () => {}, stop: () => {}, destroy: () => {} }) },
      },
      settings: { active: true },
    };

    // Ensure `add`, `tweens`, `cameras`, `time`, etc. exist from the base stub
    const base = new Phaser.Scene();
    for (const key of Object.keys(base)) {
      if (!(key in scene) || (scene as any)[key] == null) {
        (scene as any)[key] = (base as any)[key];
      }
    }

    // Call lifecycle
    if (typeof (scene as any).init === 'function') {
      (scene as any).init(initData ?? {});
    }
    if (typeof (scene as any).create === 'function') {
      (scene as any).create();
    }

    return scene;
  }

  /**
   * Simulate `count` frames of the scene's update loop.
   * @param delta  milliseconds per frame (default 16.67 ≈ 60 fps)
   */
  static tickFrames(scene: Phaser.Scene, count: number, delta: number = 16.67): void {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      if (typeof (scene as any).update === 'function') {
        (scene as any).update(now + i * delta, delta);
      }
    }
  }

  /**
   * Search all Text game objects (recursively through containers) whose
   * `.text` field contains the given substring.
   */
  static findText(scene: Phaser.Scene, substring: string): any[] {
    const results: any[] = [];
    const search = (obj: any) => {
      if (obj && typeof obj.text === 'string' && obj.text.includes(substring)) {
        results.push(obj);
      }
      // Recurse into containers
      if (obj && Array.isArray(obj.list)) {
        for (const child of obj.list) {
          search(child);
        }
      }
    };

    // Search scene's children if available
    if ((scene as any).children?.getAll) {
      for (const child of (scene as any).children.getAll()) {
        search(child);
      }
    }

    return results;
  }
}

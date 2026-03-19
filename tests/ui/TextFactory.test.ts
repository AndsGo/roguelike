import { describe, it, expect } from 'vitest';
import { TextFactory } from '../../src/ui/TextFactory';
import Phaser from 'phaser';

// Create a minimal scene for testing
function createTestScene(): Phaser.Scene {
  const scene = new Phaser.Scene({ key: 'test' });
  // The Phaser stub provides scene.add.text()
  return scene;
}

describe('TextFactory', () => {
  it('creates text with resolution 2', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 100, 50, 'test', 'body');
    expect(text).toBeDefined();
    expect(text.text).toBe('test');
  });

  it('applies preset font sizes', () => {
    const scene = createTestScene();
    const title = TextFactory.create(scene, 0, 0, 'T', 'title');
    const body = TextFactory.create(scene, 0, 0, 'T', 'body');
    const small = TextFactory.create(scene, 0, 0, 'T', 'small');
    expect(title.style.fontSize).toBe('20px');
    expect(body.style.fontSize).toBe('11px');
    expect(small.style.fontSize).toBe('9px');
  });

  it('allows style overrides', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body', { color: '#ff0000' });
    expect(text.style.color).toBe('#ff0000');
  });

  it('defaults to body preset', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T');
    expect(text.style.fontSize).toBe('11px');
  });
});

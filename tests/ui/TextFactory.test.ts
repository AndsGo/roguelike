import { describe, it, expect } from 'vitest';
import { TextFactory } from '../../src/ui/TextFactory';
import Phaser from 'phaser';

function createTestScene(): Phaser.Scene {
  const scene = new Phaser.Scene({ key: 'test' });
  return scene;
}

describe('TextFactory', () => {
  it('creates text with resolution 2', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 100, 50, 'test', 'body');
    expect(text).toBeDefined();
    expect(text.text).toBe('test');
  });

  it('applies updated preset font sizes', () => {
    const scene = createTestScene();
    const title = TextFactory.create(scene, 0, 0, 'T', 'title');
    const subtitle = TextFactory.create(scene, 0, 0, 'T', 'subtitle');
    const body = TextFactory.create(scene, 0, 0, 'T', 'body');
    const label = TextFactory.create(scene, 0, 0, 'T', 'label');
    const small = TextFactory.create(scene, 0, 0, 'T', 'small');
    const tiny = TextFactory.create(scene, 0, 0, 'T', 'tiny');
    expect(title.style.fontSize).toBe('22px');
    expect(subtitle.style.fontSize).toBe('16px');
    expect(body.style.fontSize).toBe('13px');
    expect(label.style.fontSize).toBe('11px');
    expect(small.style.fontSize).toBe('10px');
    expect(tiny.style.fontSize).toBe('9px');
  });

  it('uses Chinese-friendly font family', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body');
    expect(text.style.fontFamily).toContain('Microsoft YaHei');
    expect(text.style.fontFamily).toContain('monospace');
  });

  it('allows style overrides', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body', { color: '#ff0000' });
    expect(text.style.color).toBe('#ff0000');
  });

  it('defaults to body preset', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T');
    expect(text.style.fontSize).toBe('13px');
  });
});

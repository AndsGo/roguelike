import Phaser from 'phaser';
import { getVisualSpriteFrame, getVisualSpriteSheet, VisualSpriteSheetKey } from '../systems/VisualSpriteAssets';
import { TextFactory } from './TextFactory';

export interface VisualIconOptions {
  sheetKey: VisualSpriteSheetKey;
  frameName: string;
  x: number;
  y: number;
  size: number;
  alpha?: number;
  tint?: number;
  fallbackText: string;
  fallbackStyle?: 'tiny' | 'small' | 'label' | 'body';
}

export function createVisualIcon(
  scene: Phaser.Scene,
  options: VisualIconOptions,
): Phaser.GameObjects.GameObject {
  const sheet = getVisualSpriteSheet(options.sheetKey);
  const frame = getVisualSpriteFrame(options.sheetKey, options.frameName);
  const alpha = options.alpha ?? 1;

  if (
    sheet &&
    frame !== undefined &&
    scene.textures?.exists(sheet.textureKey) &&
    scene.add.sprite
  ) {
    const sprite = scene.add.sprite(options.x, options.y, sheet.textureKey, frame)
      .setDisplaySize(options.size, options.size)
      .setOrigin(0.5)
      .setAlpha(alpha);
    if (options.tint !== undefined) {
      sprite.setTint(options.tint);
    }
    return sprite;
  }

  return TextFactory.create(scene, options.x, options.y, options.fallbackText, options.fallbackStyle ?? 'small', {
    color: '#ffffff',
  }).setOrigin(0.5).setAlpha(alpha);
}

import Phaser from 'phaser';
import { getRoleColor } from './Theme';
import { TextFactory } from './TextFactory';
import { HeroData, EnemyData, UnitRole, RaceType, ClassType } from '../types';
import { getDisplaySize, getOrCreateTexture, ChibiConfig } from '../systems/UnitRenderer';
import { getUnitSpriteSheet } from '../systems/UnitSpriteAssets';

export function createCodexUnitPortrait(
  scene: Phaser.Scene,
  data: HeroData | EnemyData,
  isHero: boolean,
  x: number,
  y: number,
  targetHeight: number,
): Phaser.GameObjects.GameObject {
  const sheet = getUnitSpriteSheet(data.spriteKey);
  if (sheet && scene.textures?.exists(sheet.textureKey) && scene.add.image) {
    const size = Math.min(targetHeight, Math.max(sheet.displayWidth, sheet.displayHeight));
    return scene.add.image(x, y, sheet.textureKey, 0)
      .setOrigin(0.5)
      .setDisplaySize(size, size);
  }

  try {
    const isBoss = !isHero && !!(data as EnemyData).isBoss;
    const config: ChibiConfig = {
      role: data.role as UnitRole,
      race: (data.race ?? 'human') as RaceType,
      classType: ((data as HeroData).class ?? 'warrior') as ClassType,
      fillColor: getRoleColor(data.role),
      borderColor: 0x222222,
      isHero,
      isBoss,
    };
    const textureKey = getOrCreateTexture(scene, config);
    const displaySize = getDisplaySize(data.role as UnitRole, isBoss);
    const scale = Math.min(2, targetHeight / displaySize.h);
    return scene.add.image(x, y, textureKey).setScale(scale);
  } catch {
    return TextFactory.create(scene, x, y, '?', 'title', {
      color: '#555555',
    }).setOrigin(0.5);
  }
}

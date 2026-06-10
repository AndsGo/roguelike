import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MapScene } from './scenes/MapScene';
import { BattleScene } from './scenes/BattleScene';
import { ShopScene } from './scenes/ShopScene';
import { EventScene } from './scenes/EventScene';
import { RestScene } from './scenes/RestScene';
import { RewardScene } from './scenes/RewardScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { SettingsScene } from './scenes/SettingsScene';
import { HeroDraftScene } from './scenes/HeroDraftScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  scale: {
    parent: 'game-container',
    // RESIZE: the canvas always matches the container (device/window) size.
    // World content renders under a fit-scaled worldRoot; UI renders under a
    // boost-scaled uiRoot (see src/ui/Viewport.ts). 800×450 below is only the
    // pre-boot initial size.
    mode: Phaser.Scale.RESIZE,
    // No dpr-scaled resolution: logical px == CSS px, browser upscales to
    // physical. Correct for pixel art; text stays crisp via setResolution(2).
    min: { width: 320, height: 180 },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    MapScene,
    BattleScene,
    ShopScene,
    EventScene,
    RestScene,
    RewardScene,
    GameOverScene,
    VictoryScene,
    SettingsScene,
    HeroDraftScene,
  ],
  backgroundColor: '#1a1a2e',
};

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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Intentionally NO dpr-scaled resolution: the backing store stays
    // 800×450 and the browser stretches it. Correct for this pixel-art
    // style (CSS image-rendering: pixelated); text stays crisp separately
    // via TextFactory's setResolution(2).
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

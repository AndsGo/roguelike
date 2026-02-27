import Phaser from 'phaser';
import { gameConfig } from './config';

declare global {
  interface Window {
    __PHASER_GAME__?: Phaser.Game;
  }
}

const game = new Phaser.Game(gameConfig);
window.__PHASER_GAME__ = game;

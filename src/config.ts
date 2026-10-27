import Phaser from 'phaser';
import { GAME_SIZE, PLAYER } from './data/balance';
import { PALETTE } from './data/palette';
import { BootScene } from './scenes/BootScene';
import { DeathScene } from './scenes/DeathScene';
import { GameScene } from './scenes/GameScene';
import { IntroScene } from './scenes/IntroScene';
import { RelicChoiceScene } from './scenes/RelicChoiceScene';
import { PauseScene } from './scenes/PauseScene';
import { RoadChoiceScene } from './scenes/RoadChoiceScene';
import { SanctuaryScene } from './scenes/SanctuaryScene';
import { TitleScene } from './scenes/TitleScene';
import { VictoryScene } from './scenes/VictoryScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_SIZE.width,
  height: GAME_SIZE.height,
  backgroundColor: PALETTE.void,
  pixelArt: true,
  roundPixels: true,
  scale: {
    // O zoom é ajustado em src/main.ts para o jogo ocupar a janela toda
    mode: Phaser.Scale.NONE,
    zoom: Phaser.Scale.MAX_ZOOM,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: PLAYER.gravityY }, debug: false },
  },
  // Necessário para o Phaser expor o controle (this.input.gamepad)
  input: { gamepad: true },
  // A ordem é a de desenho: as telas que abrem por cima do jogo (morte, troca de relíquia,
  // santuário, vitória, pausa) vêm depois dele
  scene: [
    BootScene,
    TitleScene,
    IntroScene,
    GameScene,
    DeathScene,
    RelicChoiceScene,
    RoadChoiceScene,
    SanctuaryScene,
    VictoryScene,
    PauseScene,
  ],
};

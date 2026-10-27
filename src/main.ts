import '@fontsource/press-start-2p'; // fonte pixel (OFL), ver ASSETS-LICENSES.md
import Phaser from 'phaser';
import { gameConfig } from './config';
import { GAME_SIZE } from './data/balance';
import './styles/touch.css';
import { TouchControls } from './systems/TouchControls';
import { isTouchDevice } from './utils/touch';
import { fillZoom } from './utils/zoom';

const game = new Phaser.Game(gameConfig);

// Celular e tablet: controles na tela
const touch = isTouchDevice(window);
if (touch) {
  game.registry.set('touch', true);
  new TouchControls(game);
}

/** O jogo ocupa a janela toda (a escala pode ser fracionária), no computador e no celular. */
function fitZoom(): void {
  game.scale.setZoom(fillZoom(innerWidth, innerHeight, GAME_SIZE));
}
fitZoom();
window.addEventListener('resize', fitZoom);

// Em desenvolvimento, expõe o jogo no console para depurar (ex.: window.__game)
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

import '@fontsource/press-start-2p'; // fonte pixel (OFL), ver ASSETS-LICENSES.md
import Phaser from 'phaser';
import { gameConfig } from './config';
import { GAME_SIZE } from './data/balance';
import { integerDeviceZoom } from './utils/zoom';

const game = new Phaser.Game(gameConfig);

/**
 * Escala inteira EM PIXELS DO MONITOR (não do CSS). Com a escala do Windows em 125% ou 150%, um
 * zoom "inteiro" em pixels CSS vira fracionário no monitor e alguns pixels do jogo ficam maiores
 * que outros (borrão e tremida nas linhas). Aqui o zoom é um número inteiro de pixels do monitor
 * e a divisão pela densidade só converte para o tamanho CSS do canvas.
 */
function fitIntegerZoom(): void {
  const density = window.devicePixelRatio || 1;
  const zoom = integerDeviceZoom(innerWidth, innerHeight, density, GAME_SIZE);
  game.scale.setZoom(zoom / density);
}
fitIntegerZoom();
window.addEventListener('resize', fitIntegerZoom);

// Em desenvolvimento, expõe o jogo no console para depurar (ex.: window.__game)
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

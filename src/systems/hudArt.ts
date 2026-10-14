import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PALETTE } from '../data/palette';
import { HUD, PANEL } from '../data/ui';
import { canvasTexture, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Peças de arte da HUD em pixel art: o painel de pedra e ferro (a "moldura" de tudo), o
 * quadradinho de tecla e o rebite. As texturas são feitas sob demanda, uma por tamanho e cor.
 */

/** Chave da textura de um painel de `width` x `height` (e cor de destaque opcional). */
export function panelKey(width: number, height: number, accent?: number): string {
  return `hud-panel-${width}x${height}-${accent === undefined ? 'n' : accent.toString(16)}`;
}

/** Painel: contorno escuro com cantos cortados, chanfro claro em cima/esquerda e escuro embaixo/direita. */
function drawPanel(ctx: Ctx, width: number, height: number, accent: number | undefined): void {
  const light = accent === undefined ? PANEL.light : mix(PANEL.light, accent, 0.55);
  const dark = accent === undefined ? PANEL.dark : mix(PANEL.dark, accent, 0.25);
  // Preenchimento (sem os quatro pixels dos cantos, que ficam arredondados)
  rect(ctx, PANEL.fill, 1, 1, width - 2, height - 2, PANEL.fillAlpha);
  rect(ctx, PANEL.border, 1, 0, width - 2, 1);
  rect(ctx, PANEL.border, 1, height - 1, width - 2, 1);
  rect(ctx, PANEL.border, 0, 1, 1, height - 2);
  rect(ctx, PANEL.border, width - 1, 1, 1, height - 2);
  // Chanfro
  rect(ctx, light, 2, 1, width - 4, 1);
  rect(ctx, light, 1, 2, 1, height - 4);
  rect(ctx, dark, 2, height - 2, width - 4, 1);
  rect(ctx, dark, width - 2, 2, 1, height - 4);
  rect(ctx, mix(PANEL.fill, 0x000000, 0.35), 2, 2, width - 4, 1, 0.5); // sombra logo abaixo da luz
  // Rebites nos quatro cantos
  for (const [x, y] of [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ] as const) {
    rect(ctx, accent ?? PANEL.rivet, x, y, 1, 1, 0.75);
  }
}

/** Garante que a textura do painel exista e devolve a chave dela. */
export function ensurePanelTexture(
  scene: Phaser.Scene,
  width: number,
  height: number,
  accent?: number,
): string {
  const key = panelKey(width, height, accent);
  canvasTexture(scene, key, width, height, (ctx) => drawPanel(ctx, width, height, accent));
  return key;
}

/** Cria (se preciso) e devolve a imagem de um painel fixo na tela, com a origem no canto. */
export function panelImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  accent?: number,
  depth: number = DEPTH.hud,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, ensurePanelTexture(scene, width, height, accent))
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(depth);
}

export const KEYCAP_KEY = 'hud-keycap';

function drawKeycap(ctx: Ctx): void {
  const s = HUD.keycap.size;
  // Borda clara com os cantos cortados, miolo escuro (a letra clara fica bem legível) e uma
  // "sombra" mais grossa embaixo, como num teclado de verdade
  rect(ctx, PALETTE.bone, 1, 0, s - 2, s - 1);
  rect(ctx, PALETTE.bone, 0, 1, s, s - 3);
  rect(ctx, PALETTE.stoneDark, 1, 1, s - 2, s - 4);
  rect(ctx, PALETTE.stone, 1, 1, s - 2, 1, 0.9);
  rect(ctx, PALETTE.mist, 1, s - 2, s - 2, 1);
  rect(ctx, PALETTE.void, 1, s - 1, s - 2, 1);
}

/** Tecla (quadradinho) sob o `letter`, que o chamador escreve por cima com a fonte de pixels. */
export function createHudTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, KEYCAP_KEY, HUD.keycap.size, HUD.keycap.size, drawKeycap);
}

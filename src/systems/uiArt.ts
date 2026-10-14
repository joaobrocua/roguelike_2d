import Phaser from 'phaser';
import { canvasTexture, rect, type Ctx } from './pixelCanvas';

/**
 * Enfeites de interface em pixel art, brancos para serem pintados com tint: o divisor com um
 * losango no centro (telas de morte e vitória) e um pisca-pisca de aviso para o "aperte um botão".
 */
export const UI_TEXTURE = { divider: 'ui-divider' } as const;

const DIVIDER = { width: 128, height: 7 } as const;

function drawDivider(ctx: Ctx): void {
  const { width, height } = DIVIDER;
  const mid = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  // Linhas que somem nas pontas (dithering em xadrez)
  for (let x = 0; x < mid - 8; x++) {
    const t = x / (mid - 8);
    if (t < 0.3 && x % 2 === 1) continue; // pontas em pontilhado
    rect(ctx, 0xffffff, x, cy, 1, 1, 0.35 + t * 0.65);
    rect(ctx, 0xffffff, width - 1 - x, cy, 1, 1, 0.35 + t * 0.65);
  }
  // Losango central com pontos de cada lado
  rect(ctx, 0xffffff, mid - 1, 0, 2, 1);
  rect(ctx, 0xffffff, mid - 2, 1, 4, 1);
  rect(ctx, 0xffffff, mid - 3, 2, 6, 1);
  rect(ctx, 0xffffff, mid - 4, cy, 8, 1);
  rect(ctx, 0xffffff, mid - 3, 4, 6, 1);
  rect(ctx, 0xffffff, mid - 2, 5, 4, 1);
  rect(ctx, 0xffffff, mid - 1, 6, 2, 1);
  rect(ctx, 0x000000, mid - 1, cy, 2, 1, 0.45);
  rect(ctx, 0xffffff, mid - 12, cy, 2, 1);
  rect(ctx, 0xffffff, mid + 10, cy, 2, 1);
}

export function createUiTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, UI_TEXTURE.divider, DIVIDER.width, DIVIDER.height, drawDivider);
}

/** Faz um texto ou imagem pulsar devagar (convite para apertar um botão). */
export function pulse(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  low = 0.35,
  periodMs = 900,
): void {
  scene.tweens.add({
    targets: target,
    alpha: { from: 1, to: low },
    duration: periodMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

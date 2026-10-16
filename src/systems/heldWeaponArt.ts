import type Phaser from 'phaser';
import { WEAPON_HOLD, heldWeaponKey } from '../data/weapons';
import { RELIC_IDS, RELICS, type RelicId } from '../data/relics';
import { PALETTE } from '../data/palette';
import { drawAdaga, drawLamina } from './heldWeapons/blades';
import { drawMachado, drawMangual, drawMartelo } from './heldWeapons/hafted';
import type { HeldDrawer } from './heldWeapons/kit';
import { drawArco, drawFoice, drawLanca } from './heldWeapons/polearms';
import { canvasTexture, type Ctx } from './pixelCanvas';

/**
 * As armas empunhadas, desenhadas em código: uma textura por relíquia (menos o Tomo, que flutua
 * e usa o ícone), com a ponta para cima e o ponto de empunhadura em `WEAPON_HOLD[id].sprite`.
 * Cada função de desenho pinta a arma sem contorno; o contorno de 1 px é feito aqui, igual para todas.
 */
export const HELD_WEAPON_DRAWERS: Readonly<Partial<Record<RelicId, HeldDrawer>>> = {
  lamina: drawLamina,
  martelo: drawMartelo,
  foice: drawFoice,
  adaga: drawAdaga,
  lanca: drawLanca,
  machado: drawMachado,
  arco: drawArco,
  mangual: drawMangual,
};

/** Contorno de 1 px nos pixels transparentes que encostam na arma. */
function outline(ctx: Ctx, width: number, height: number, color: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const opaque = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && (data[(y * width + x) * 4 + 3] ?? 0) > 40;
  const marks: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        marks.push((y * width + x) * 4);
      }
    }
  }
  for (const i of marks) {
    data[i] = (color >> 16) & 0xff;
    data[i + 1] = (color >> 8) & 0xff;
    data[i + 2] = color & 0xff;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/** Cria (uma vez) a textura de cada arma empunhada. */
export function createHeldWeaponTextures(scene: Phaser.Scene): void {
  for (const id of RELIC_IDS) {
    if (RELICS[id].floatingWeapon) continue;
    const draw = HELD_WEAPON_DRAWERS[id];
    if (!draw) continue;
    const { width, height } = WEAPON_HOLD[id].sprite;
    canvasTexture(scene, heldWeaponKey(id), width, height, (ctx) => {
      draw(ctx);
      outline(ctx, width, height, PALETTE.void);
    });
  }
}

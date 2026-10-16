import { mix, rect, type Ctx } from '../pixelCanvas';

/** Função que desenha uma arma empunhada numa textura do tamanho de `WEAPON_HOLD[id].sprite`. */
export type HeldDrawer = (ctx: Ctx) => void;

/** Um pixel. */
export function px(ctx: Ctx, color: number, x: number, y: number): void {
  rect(ctx, color, x, y, 1, 1);
}

/** Cor mais clara de uma base (luz). */
export function lighten(color: number, t = 0.3): number {
  return mix(color, 0xffffff, t);
}

/** Cor mais escura de uma base (sombra). */
export function darken(color: number, t = 0.35): number {
  return mix(color, 0x000000, t);
}

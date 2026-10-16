/**
 * Como cada relíquia é empunhada: o estilo de cada golpe do combo, o jeito de segurar fora dos
 * golpes e o tamanho e o ponto de empunhadura da arma desenhada (src/systems/heldWeaponArt.ts).
 * Só dados: os quadros dos golpes ficam em src/data/hero.ts.
 */
import type { AttackStyle } from './hero';
import type { RelicId } from './relics';

export interface WeaponSprite {
  /** Tamanho da textura (px). A arma é desenhada com a PONTA PARA CIMA (ângulo 0). */
  width: number;
  height: number;
  /** Ponto de empunhadura (px dentro da textura): onde fica a mão da frente; é o pivô de rotação. */
  gripX: number;
  gripY: number;
}

export interface WeaponHold {
  /** Estilo de cada golpe do combo básico, em ordem (repete se o combo for mais longo que a lista). */
  styles: readonly AttackStyle[];
  /** Estilo do golpe especial. */
  special: AttackStyle;
  /** Soma (rad) ao ângulo da arma fora dos golpes (parada, correndo, no ar). */
  restBias: number;
  sprite: WeaponSprite;
  /** Deixa um rastro de imagens (a arma borra durante o golpe). false para arco e tomo. */
  trail: boolean;
}

export const WEAPON_HOLD: Readonly<Record<RelicId, WeaponHold>> = {
  lamina: {
    styles: ['slashA', 'slashB', 'slashA'],
    special: 'lunge',
    restBias: 0,
    sprite: { width: 11, height: 32, gripX: 5, gripY: 25 },
    trail: true,
  },
  martelo: {
    styles: ['overhead'],
    special: 'overhead',
    restBias: 0.1,
    sprite: { width: 14, height: 34, gripX: 7, gripY: 27 },
    trail: true,
  },
  foice: {
    styles: ['sweep', 'slashB'],
    special: 'sweep',
    restBias: 0,
    sprite: { width: 20, height: 42, gripX: 6, gripY: 32 },
    trail: true,
  },
  tomo: {
    styles: ['cast'],
    special: 'cast',
    restBias: 0,
    sprite: { width: 16, height: 16, gripX: 8, gripY: 8 },
    trail: false,
  },
  adaga: {
    styles: ['slashA', 'slashB', 'slashA', 'slashB'],
    special: 'lunge',
    restBias: 0.3,
    sprite: { width: 9, height: 18, gripX: 4, gripY: 14 },
    trail: true,
  },
  lanca: {
    styles: ['thrust'],
    special: 'thrust',
    restBias: -0.35,
    sprite: { width: 9, height: 44, gripX: 4, gripY: 30 },
    trail: true,
  },
  machado: {
    styles: ['overhead', 'sweep'],
    special: 'sweep',
    restBias: 0,
    sprite: { width: 15, height: 34, gripX: 5, gripY: 26 },
    trail: true,
  },
  arco: {
    styles: ['bow'],
    special: 'bow',
    restBias: 0,
    sprite: { width: 12, height: 30, gripX: 3, gripY: 15 },
    trail: false,
  },
  mangual: {
    styles: ['slashA', 'sweep'],
    special: 'sweep',
    restBias: 0,
    sprite: { width: 12, height: 36, gripX: 5, gripY: 29 },
    trail: true,
  },
};

export function heldWeaponKey(id: RelicId): string {
  return `weapon-held-${id}`;
}

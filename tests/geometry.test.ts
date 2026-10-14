import { describe, expect, it } from 'vitest';
import { boxesOverlap, createBox, placeHitbox } from '../src/logic/geometry';
import { approachZero } from '../src/utils/math';

describe('boxesOverlap', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };

  it('detecta sobreposição', () => {
    expect(boxesOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });

  it('encostar na borda não conta', () => {
    expect(boxesOverlap(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
    expect(boxesOverlap(a, { x: 0, y: 10, width: 5, height: 5 })).toBe(false);
  });

  it('caixas distantes não se sobrepõem', () => {
    expect(boxesOverlap(a, { x: 50, y: 50, width: 5, height: 5 })).toBe(false);
  });
});

describe('placeHitbox', () => {
  const shape = { width: 20, height: 10, offsetY: 2 };

  it('projeta a hitbox para a direita, a partir da borda do corpo', () => {
    const box = createBox();
    placeHitbox(box, 100, 50, 6, 1, shape);
    expect(box).toEqual({ x: 106, y: 47, width: 20, height: 10 });
  });

  it('espelha a hitbox para a esquerda', () => {
    const box = createBox();
    placeHitbox(box, 100, 50, 6, -1, shape);
    expect(box).toEqual({ x: 74, y: 47, width: 20, height: 10 });
  });
});

describe('approachZero', () => {
  it('reduz o módulo sem passar de zero', () => {
    expect(approachZero(10, 3)).toBe(7);
    expect(approachZero(-10, 3)).toBe(-7);
    expect(approachZero(2, 5)).toBe(0);
    expect(approachZero(-2, 5)).toBe(0);
    expect(approachZero(0, 5)).toBe(0);
  });
});

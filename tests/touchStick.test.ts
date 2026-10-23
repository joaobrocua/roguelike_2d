import { describe, expect, it } from 'vitest';
import { clampToRadius, stickDirections, type StickDirections } from '../src/logic/touchStick';

const fresh = (): StickDirections => ({ left: false, right: false, up: false, down: false });

describe('stickDirections', () => {
  it('dentro da zona morta não aperta nada', () => {
    expect(stickDirections(5, -5, 14, fresh())).toEqual(fresh());
    expect(stickDirections(14, 14, 14, fresh())).toEqual(fresh()); // o limite exato não conta
  });

  it('arrastar para os lados aperta esquerda ou direita', () => {
    expect(stickDirections(20, 0, 14, fresh()).right).toBe(true);
    expect(stickDirections(-20, 0, 14, fresh()).left).toBe(true);
    expect(stickDirections(20, 0, 14, fresh()).left).toBe(false);
  });

  it('cada eixo vale sozinho e a diagonal aperta os dois', () => {
    const diagonal = stickDirections(30, -30, 14, fresh());
    expect(diagonal).toEqual({ left: false, right: true, up: true, down: false });
    expect(stickDirections(0, 30, 14, fresh()).down).toBe(true);
  });

  it('reaproveita o objeto recebido (sem alocar)', () => {
    const out = fresh();
    expect(stickDirections(30, 0, 14, out)).toBe(out);
    stickDirections(-30, 0, 14, out);
    expect(out.left).toBe(true);
    expect(out.right).toBe(false); // o aperto anterior não fica
  });
});

describe('clampToRadius', () => {
  it('dentro do círculo não mexe', () => {
    expect(clampToRadius(10, 20, 46)).toEqual({ x: 10, y: 20 });
    expect(clampToRadius(0, 0, 46)).toEqual({ x: 0, y: 0 });
  });

  it('fora do círculo traz de volta para a borda, na mesma direção', () => {
    const r = clampToRadius(100, 0, 46);
    expect(r.x).toBeCloseTo(46);
    expect(r.y).toBeCloseTo(0);
    const d = clampToRadius(60, 80, 50); // comprimento 100 -> 50
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(50);
    expect(d.x / d.y).toBeCloseTo(60 / 80);
  });
});

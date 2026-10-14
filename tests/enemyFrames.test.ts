import { describe, expect, it } from 'vitest';
import { enemyCellSize, enemyDrawers } from '../src/systems/enemySprites';

/**
 * Canvas de mentira que só guarda onde cada retângulo caiu (já com giro e deslocamento), para
 * conferir que nenhum quadro desenhado vaza do seu espaço e perde a borda do contorno.
 */
function createRecorder() {
  let m = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const ctx = {
    fillStyle: '',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    save: () => stack.push([...m]),
    restore: () => {
      m = stack.pop() ?? m;
    },
    translate: (tx: number, ty: number) => {
      m = [
        m[0]!,
        m[1]!,
        m[2]!,
        m[3]!,
        m[0]! * tx + m[2]! * ty + m[4]!,
        m[1]! * tx + m[3]! * ty + m[5]!,
      ];
    },
    rotate: (a: number) => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      m = [
        m[0]! * c + m[2]! * s,
        m[1]! * c + m[3]! * s,
        -m[0]! * s + m[2]! * c,
        -m[1]! * s + m[3]! * c,
        m[4]!,
        m[5]!,
      ];
    },
    scale: (sx: number, sy: number) => {
      m = [m[0]! * sx, m[1]! * sx, m[2]! * sy, m[3]! * sy, m[4]!, m[5]!];
    },
    clearRect: () => undefined,
    fillRect: (x: number, y: number, w: number, h: number) => {
      for (const [px, py] of [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ] as const) {
        const tx = m[0]! * px + m[2]! * py + m[4]!;
        const ty = m[1]! * px + m[3]! * py + m[5]!;
        box.minX = Math.min(box.minX, tx);
        box.minY = Math.min(box.minY, ty);
        box.maxX = Math.max(box.maxX, tx);
        box.maxY = Math.max(box.maxY, ty);
      }
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, box };
}

describe('enquadramento dos quadros dos inimigos', () => {
  for (const drawer of enemyDrawers()) {
    it(`${drawer.sheet.id}: todo quadro cabe no espaço, com 1 px livre para o contorno`, () => {
      const cell = enemyCellSize(drawer);
      for (const { name, pose } of drawer.sheet.frames) {
        const { ctx, box } = createRecorder();
        drawer.draw(ctx, pose);
        const where = `${drawer.sheet.id}:${name}`;
        expect(box.minX, `${where} esquerda`).toBeGreaterThanOrEqual(1);
        expect(box.minY, `${where} topo`).toBeGreaterThanOrEqual(1);
        expect(box.maxX, `${where} direita`).toBeLessThanOrEqual(cell.width - 1);
        expect(box.maxY, `${where} base`).toBeLessThanOrEqual(cell.height - 1);
      }
    });
  }

  it('o desenho em pé fica perto do centro do corpo de colisão (o espelhamento não dá pulo)', () => {
    for (const drawer of enemyDrawers()) {
      const cell = enemyCellSize(drawer);
      const first = drawer.sheet.frames[0];
      if (!first) continue;
      const { ctx, box } = createRecorder();
      drawer.draw(ctx, first.pose as never);
      const center = (box.minX + box.maxX) / 2;
      expect(Math.abs(center - cell.width / 2), drawer.sheet.id).toBeLessThanOrEqual(2.5);
    }
  });
});

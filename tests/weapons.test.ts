import { describe, expect, it } from 'vitest';
import { ATTACK_STYLES } from '../src/data/hero';
import { RELIC_IDS, RELICS } from '../src/data/relics';
import { WEAPON_HOLD, heldWeaponKey } from '../src/data/weapons';
import { HELD_OFFHAND_DRAWERS, HELD_WEAPON_DRAWERS } from '../src/systems/heldWeaponArt';

/**
 * Canvas de mentira que só guarda onde cada retângulo caiu (e quantos pixels), para conferir que
 * o desenho de cada arma cabe na textura, com 1 px livre em volta para o contorno.
 */
function createRecorder() {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const colors = new Set<string>();
  let rects = 0;
  const ctx = {
    fillStyle: '',
    globalAlpha: 1,
    fillRect: (x: number, y: number, w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      rects++;
      colors.add(String(ctx.fillStyle));
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x + w);
      box.maxY = Math.max(box.maxY, y + h);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, box, colors, count: () => rects };
}

describe('armas empunhadas (dados)', () => {
  it('toda relíquia tem entrada, com estilos válidos', () => {
    for (const id of RELIC_IDS) {
      const hold = WEAPON_HOLD[id];
      expect(hold, id).toBeDefined();
      expect(hold.styles.length, id).toBeGreaterThan(0);
      for (const style of [...hold.styles, hold.special]) {
        expect(ATTACK_STYLES, `${id}:${style}`).toContain(style);
      }
    }
  });

  it('há um estilo para cada passo do combo (ou a lista cobre o combo e repete)', () => {
    for (const id of RELIC_IDS) {
      const steps = RELICS[id].basic.steps.length;
      expect(WEAPON_HOLD[id].styles.length, id).toBeGreaterThan(0);
      expect(WEAPON_HOLD[id].styles.length, id).toBeLessThanOrEqual(Math.max(steps, 1) + 1);
    }
  });

  it('o ponto de empunhadura está dentro da textura e a arma é maior que o ícone de 16 px', () => {
    for (const id of RELIC_IDS) {
      const { sprite } = WEAPON_HOLD[id];
      expect(sprite.gripX, id).toBeGreaterThanOrEqual(1);
      expect(sprite.gripX, id).toBeLessThan(sprite.width - 1);
      expect(sprite.gripY, id).toBeGreaterThanOrEqual(1);
      expect(sprite.gripY, id).toBeLessThan(sprite.height - 1);
      if (!RELICS[id].floatingWeapon) {
        expect(Math.max(sprite.width, sprite.height), id).toBeGreaterThan(16);
      }
    }
  });

  it('restBias é pequeno, chaves de textura únicas, e arco e tomo não deixam rastro', () => {
    const keys = RELIC_IDS.map(heldWeaponKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const id of RELIC_IDS) {
      expect(Math.abs(WEAPON_HOLD[id].restBias), id).toBeLessThanOrEqual(0.5);
    }
    expect(WEAPON_HOLD.arco.trail).toBe(false);
    expect(WEAPON_HOLD.tomo.trail).toBe(false);
    expect(WEAPON_HOLD.lamina.trail).toBe(true);
  });
});

describe('armas empunhadas (desenho)', () => {
  it('toda arma que se empunha tem um desenho (o Tomo flutua e usa o ícone)', () => {
    for (const id of RELIC_IDS) {
      if (RELICS[id].floatingWeapon) expect(HELD_WEAPON_DRAWERS[id], id).toBeUndefined();
      else expect(HELD_WEAPON_DRAWERS[id], id).toBeDefined();
    }
  });

  it('cada desenho cabe na textura, com 1 px livre para o contorno, e tem detalhe', () => {
    for (const id of RELIC_IDS) {
      const draw = HELD_WEAPON_DRAWERS[id];
      if (!draw) continue;
      const { sprite } = WEAPON_HOLD[id];
      const { ctx, box, colors, count } = createRecorder();
      draw(ctx);
      expect(box.minX, `${id} esquerda`).toBeGreaterThanOrEqual(1);
      expect(box.minY, `${id} topo`).toBeGreaterThanOrEqual(1);
      expect(box.maxX, `${id} direita`).toBeLessThanOrEqual(sprite.width - 1);
      expect(box.maxY, `${id} base`).toBeLessThanOrEqual(sprite.height - 1);
      // O desenho ocupa boa parte da textura e usa vários tons (luz, sombra, detalhes)
      expect(box.maxY - box.minY, `${id} altura desenhada`).toBeGreaterThanOrEqual(
        sprite.height * 0.75,
      );
      expect(colors.size, `${id} tons`).toBeGreaterThanOrEqual(6);
      expect(count(), `${id} retângulos`).toBeGreaterThanOrEqual(14);
    }
  });

  it('a empunhadura cai sobre o desenho (a mão segura a arma, não o ar)', () => {
    for (const id of RELIC_IDS) {
      const draw = HELD_WEAPON_DRAWERS[id];
      if (!draw) continue;
      const { sprite } = WEAPON_HOLD[id];
      const painted: Array<[number, number, number, number]> = [];
      const ctx = {
        fillStyle: '',
        globalAlpha: 1,
        fillRect: (x: number, y: number, w: number, h: number) => painted.push([x, y, w, h]),
      } as unknown as CanvasRenderingContext2D;
      draw(ctx);
      const covered = painted.some(
        ([x, y, w, h]) =>
          sprite.gripX >= x && sprite.gripX < x + w && sprite.gripY >= y && sprite.gripY < y + h,
      );
      expect(covered, id).toBe(true);
    }
  });
});

describe('segunda arma e escudo (mão de trás)', () => {
  it('quem tem offhand nos dados tem o desenho dele, e só esses', () => {
    for (const id of RELIC_IDS) {
      expect(Boolean(WEAPON_HOLD[id].offhand), id).toBe(Boolean(HELD_OFFHAND_DRAWERS[id]));
    }
    expect(WEAPON_HOLD.laminas.offhand).toBeDefined();
    expect(WEAPON_HOLD.escudo.offhand).toBeDefined();
  });

  it('cada desenho da mão de trás cabe na textura e a empunhadura cai sobre ele', () => {
    for (const id of RELIC_IDS) {
      const draw = HELD_OFFHAND_DRAWERS[id];
      const spec = WEAPON_HOLD[id].offhand;
      if (!draw || !spec) continue;
      const painted: Array<[number, number, number, number]> = [];
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const ctx = {
        fillStyle: '',
        globalAlpha: 1,
        fillRect: (x: number, y: number, w: number, h: number) => {
          if (w <= 0 || h <= 0) return;
          painted.push([x, y, w, h]);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        },
      } as unknown as CanvasRenderingContext2D;
      draw(ctx);
      const { sprite } = spec;
      expect(minX, `${id} esquerda`).toBeGreaterThanOrEqual(1);
      expect(minY, `${id} topo`).toBeGreaterThanOrEqual(1);
      expect(maxX, `${id} direita`).toBeLessThanOrEqual(sprite.width - 1);
      expect(maxY, `${id} base`).toBeLessThanOrEqual(sprite.height - 1);
      const covered = painted.some(
        ([x, y, w, h]) =>
          sprite.gripX >= x && sprite.gripX < x + w && sprite.gripY >= y && sprite.gripY < y + h,
      );
      expect(covered, `${id} empunhadura`).toBe(true);
    }
  });
});

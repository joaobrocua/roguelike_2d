import { describe, expect, it } from 'vitest';
import { TILE_VARIANTS } from '../src/data/atmosphere';
import { ALL_BIOMES, type BiomeId } from '../src/data/mapRules';
import { TILE_SIZE } from '../src/data/rooms';
import { parseRoom } from '../src/logic/roomParser';
import { TILE_EDGE, tileHash, tileLook, type TileKind } from '../src/logic/tileVariant';
import type { Ctx } from '../src/systems/pixelCanvas';
import { drawTile } from '../src/systems/tileArt';
import { lerpColor } from '../src/utils/color';

const room = parseRoom(['#####', '#...#', '#.P.#', '#####']);

describe('tileLook', () => {
  it('bloco com ar em cima é superfície; bloco com bloco em cima é interno', () => {
    expect(tileLook(room, 2, 3, 3).kind).toBe('top'); // chão da sala (ar acima)
    expect(tileLook(room, 2, 0, 3).kind).toBe('fill'); // teto (fora da sala conta como sólido)
    expect(tileLook(room, 0, 2, 3).kind).toBe('fill'); // parede com parede em cima
  });

  it('a variação é estável e fica dentro do limite', () => {
    for (let col = 0; col < 5; col++) {
      const a = tileLook(room, col, 3, 4);
      const b = tileLook(room, col, 3, 4);
      expect(a).toEqual(b);
      expect(a.variant).toBeGreaterThanOrEqual(0);
      expect(a.variant).toBeLessThan(4);
    }
  });

  it('variants menor que 1 vira uma única variação', () => {
    expect(tileLook(room, 1, 3, 0).variant).toBe(0);
  });

  it('o hash espalha as variações (não devolve sempre a mesma)', () => {
    const seen = new Set<number>();
    for (let col = 0; col < 40; col++) seen.add(tileHash(col, 7) % 3);
    expect(seen.size).toBe(3);
  });

  it('há quatro variações ou mais e a escolha usa todas elas', () => {
    expect(TILE_VARIANTS).toBeGreaterThanOrEqual(4);
    const seen = new Set<number>();
    for (let col = 0; col < 40; col++) seen.add(tileLook(room, col, 3, TILE_VARIANTS).variant);
    expect(seen.size).toBe(TILE_VARIANTS);
  });
});

describe('lados ao ar livre', () => {
  const ledge = parseRoom(['#######', '#.....#', '#.###.#', '#.#.#.#', '#######']);

  it('o chão da sala só tem ar em cima (nenhum lado aberto)', () => {
    expect(tileLook(room, 2, 3, 3).edges).toBe(0);
  });

  it('uma plataforma tem as quinas da esquerda e da direita e a base abertas', () => {
    expect(tileLook(ledge, 2, 2, 3).edges & TILE_EDGE.left).toBe(TILE_EDGE.left);
    expect(tileLook(ledge, 4, 2, 3).edges & TILE_EDGE.right).toBe(TILE_EDGE.right);
    expect(tileLook(ledge, 3, 2, 3).edges & TILE_EDGE.bottom).toBe(TILE_EDGE.bottom);
    expect(tileLook(ledge, 3, 2, 3).edges & TILE_EDGE.left).toBe(0);
  });

  it('fora da sala conta como parede (borda da sala não abre lados)', () => {
    expect(tileLook(ledge, 0, 0, 3).edges).toBe(0);
  });
});

describe('lerpColor', () => {
  it('devolve as pontas e o meio', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColor(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f);
  });

  it('mistura canal a canal e limita t a 0..1', () => {
    expect(lerpColor(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
    expect(lerpColor(0x102030, 0x405060, -3)).toBe(0x102030);
    expect(lerpColor(0x102030, 0x405060, 9)).toBe(0x405060);
  });
});

/** Canvas de mentira 16x16: mistura as cores como o de verdade e conta o que sai do bloco. */
class FakeCtx {
  /** RGBA de cada pixel (alfa de 0 a 1). */
  readonly px = new Float32Array(TILE_SIZE * TILE_SIZE * 4);
  fillStyle = '#000000';
  globalAlpha = 1;
  outside = 0;

  private visit(x: number, y: number, w: number, h: number, paint: (k: number) => void): void {
    if (x < 0 || y < 0 || x + w > TILE_SIZE || y + h > TILE_SIZE) this.outside++;
    for (let j = Math.max(0, y); j < Math.min(TILE_SIZE, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(TILE_SIZE, x + w); i++) {
        paint((j * TILE_SIZE + i) * 4);
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const rgb = [1, 3, 5].map((at) => parseInt(this.fillStyle.slice(at, at + 2), 16));
    const a = this.globalAlpha;
    this.visit(x, y, w, h, (k) => {
      const below = this.px[k + 3] ?? 0;
      const out = a + below * (1 - a);
      for (let c = 0; c < 3; c++) {
        this.px[k + c] = ((rgb[c] ?? 0) * a + (this.px[k + c] ?? 0) * below * (1 - a)) / out;
      }
      this.px[k + 3] = out;
    });
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.visit(x, y, w, h, (k) => this.px.fill(0, k, k + 4));
  }

  pixel(x: number, y: number): number[] {
    const k = (y * TILE_SIZE + x) * 4;
    return Array.from(this.px.slice(k, k + 4), (v) => Math.round(v * 100) / 100);
  }
}

function render(biome: BiomeId, kind: TileKind, variant: number, edges: number): FakeCtx {
  const ctx = new FakeCtx();
  drawTile(ctx as unknown as Ctx, biome, kind, variant, edges);
  return ctx;
}

function column(ctx: FakeCtx, x: number, y0 = 0, y1 = TILE_SIZE - 1): number[][] {
  const out: number[][] = [];
  for (let y = y0; y <= y1; y++) out.push(ctx.pixel(x, y));
  return out;
}

function changedPixels(a: FakeCtx, b: FakeCtx): number {
  let n = 0;
  for (let k = 0; k < a.px.length; k += 4) {
    const diff = [0, 1, 2, 3].some((c) => Math.abs((a.px[k + c] ?? 0) - (b.px[k + c] ?? 0)) > 1);
    if (diff) n++;
  }
  return n;
}

/** Quais pixels estão acima da luminância média: o "desenho" do bloco, sem a cor da área. */
function shape(ctx: FakeCtx): boolean[] {
  const lum: number[] = [];
  for (let k = 0; k < ctx.px.length; k += 4) {
    lum.push((ctx.px[k] ?? 0) * 0.3 + (ctx.px[k + 1] ?? 0) * 0.6 + (ctx.px[k + 2] ?? 0) * 0.1);
  }
  const mean = lum.reduce((sum, v) => sum + v, 0) / lum.length;
  return lum.map((v) => v > mean);
}

const BRICK_BIOMES: readonly BiomeId[] = ['muralhas', 'saloes', 'catacumbas'];
const KINDS = ['top', 'fill'] as const;

describe('arte dos blocos', () => {
  it('nenhum desenho sai do bloco de 16x16 (área, variação e lados)', () => {
    for (const biome of ALL_BIOMES) {
      for (const kind of KINDS) {
        for (let variant = 0; variant < TILE_VARIANTS; variant++) {
          for (let edges = 0; edges < 8; edges++) {
            const { outside } = render(biome, kind, variant, edges);
            expect(outside, `${biome} ${kind} ${variant} ${edges}`).toBe(0);
          }
        }
      }
    }
  });

  it('o bloco interno fechado não tem buracos (nada transparente)', () => {
    for (const biome of ALL_BIOMES) {
      for (let variant = 0; variant < TILE_VARIANTS; variant++) {
        const ctx = render(biome, 'fill', variant, 0);
        for (let k = 3; k < ctx.px.length; k += 4) expect(ctx.px[k]).toBeCloseTo(1, 5);
      }
    }
  });

  it('o desenho é sempre o mesmo para o mesmo bloco', () => {
    for (const biome of ALL_BIOMES) {
      expect(changedPixels(render(biome, 'top', 1, 5), render(biome, 'top', 1, 5))).toBe(0);
    }
  });

  it('as variações de uma área são bem diferentes entre si (quebram a repetição)', () => {
    for (const biome of ALL_BIOMES) {
      for (const kind of KINDS) {
        for (let a = 0; a < TILE_VARIANTS; a++) {
          for (let b = a + 1; b < TILE_VARIANTS; b++) {
            const diff = changedPixels(render(biome, kind, a, 0), render(biome, kind, b, 0));
            expect(diff, `${biome} ${kind} ${a} x ${b}`).toBeGreaterThanOrEqual(40);
          }
        }
      }
    }
  });

  it('cada área tem o seu desenho, não só outra cor', () => {
    for (const kind of KINDS) {
      for (let a = 0; a < ALL_BIOMES.length; a++) {
        for (let b = a + 1; b < ALL_BIOMES.length; b++) {
          const first = shape(render(ALL_BIOMES[a] ?? 'muralhas', kind, 0, 0));
          const second = shape(render(ALL_BIOMES[b] ?? 'muralhas', kind, 0, 0));
          const apart = first.filter((on, i) => on !== second[i]).length;
          expect(apart, `${ALL_BIOMES[a]} x ${ALL_BIOMES[b]} ${kind}`).toBeGreaterThanOrEqual(25);
        }
      }
    }
  });

  it('as bordas laterais emendam com o vizinho em qualquer variação', () => {
    for (const biome of ALL_BIOMES) {
      // Tijolos: a fiada de cima tem um tijolo de tom sorteado encostado na esquerda, então a
      // coluna da esquerda só é fixa da junta (linha 7) para baixo
      const firstRow = BRICK_BIOMES.includes(biome) ? 7 : 0;
      const ref = render(biome, 'fill', 0, 0);
      for (let variant = 1; variant < TILE_VARIANTS; variant++) {
        const other = render(biome, 'fill', variant, 0);
        expect(column(other, 0, firstRow), `${biome} ${variant} esquerda`).toEqual(
          column(ref, 0, firstRow),
        );
        expect(column(other, TILE_SIZE - 1), `${biome} ${variant} direita`).toEqual(
          column(ref, TILE_SIZE - 1),
        );
      }
    }
  });

  it('as superfícies também emendam: abaixo da relva as bordas laterais são fixas', () => {
    for (const biome of ALL_BIOMES) {
      const ref = render(biome, 'top', 0, 0);
      for (let variant = 1; variant < TILE_VARIANTS; variant++) {
        const other = render(biome, 'top', variant, 0);
        // Tijolos: a coluna da esquerda só é fixa da junta (linha 7) para baixo
        const firstRow = BRICK_BIOMES.includes(biome) ? 7 : 6;
        expect(column(other, 0, firstRow), `${biome} ${variant} esquerda`).toEqual(
          column(ref, 0, firstRow),
        );
        expect(column(other, TILE_SIZE - 1, 6), `${biome} ${variant} direita`).toEqual(
          column(ref, TILE_SIZE - 1, 6),
        );
      }
    }
  });

  it('abrir a base do bloco não mexe no resto do corpo', () => {
    for (const biome of ALL_BIOMES) {
      const closed = render(biome, 'fill', 2, 0);
      const open = render(biome, 'fill', 2, TILE_EDGE.bottom);
      for (let y = 0; y < 11; y++) {
        expect(open.pixel(5, y), `${biome} linha ${y}`).toEqual(closed.pixel(5, y));
      }
      expect(changedPixels(closed, open)).toBeGreaterThan(0);
    }
  });

  it('cada lado aberto muda o desenho (luz, sombra e franjas)', () => {
    for (const biome of ALL_BIOMES) {
      for (const bit of [TILE_EDGE.left, TILE_EDGE.right, TILE_EDGE.bottom]) {
        const closed = render(biome, 'top', 0, 0);
        const open = render(biome, 'top', 0, bit);
        expect(changedPixels(closed, open), `${biome} ${bit}`).toBeGreaterThan(3);
      }
    }
  });
});

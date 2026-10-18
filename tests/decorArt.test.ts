import { describe, expect, it } from 'vitest';
import { DECOR_RULES, type DecorKind } from '../src/data/decor';
import { ALL_BIOMES, type BiomeId } from '../src/data/mapRules';
import { DECOR_SIZE, drawDecor } from '../src/systems/decorArt';
import type { Ctx } from '../src/systems/pixelCanvas';

const KINDS = (Object.keys(DECOR_RULES) as DecorKind[]).filter((kind) => kind !== 'banner');
const FLOOR: readonly DecorKind[] = ['tuft', 'rubble', 'bone'];
const CEILING: readonly DecorKind[] = ['vine', 'chain', 'drip'];

interface Painted {
  /** Retângulos fora da textura. */
  outside: string[];
  /** Pixel -> "cor@opacidade" do último que o cobriu (só os visíveis). */
  pixels: Map<string, string>;
}

/** Contexto falso que só registra os retângulos pintados, para conferir o desenho sem navegador. */
function paint(biome: BiomeId, kind: DecorKind, variant: number): Painted {
  const { width, height } = DECOR_SIZE[kind];
  const painted: Painted = { outside: [], pixels: new Map() };
  const fake = {
    fillStyle: '',
    globalAlpha: 1,
    fillRect(x: number, y: number, w: number, h: number) {
      if (this.globalAlpha <= 0) return;
      if (x < 0 || y < 0 || x + w > width || y + h > height) {
        painted.outside.push(`${x},${y} ${w}x${h}`);
      }
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          painted.pixels.set(`${px},${py}`, `${this.fillStyle}@${this.globalAlpha.toFixed(2)}`);
        }
      }
    },
  };
  drawDecor(fake as unknown as Ctx, biome, kind, variant);
  return painted;
}

function signature(painted: Painted): string {
  return [...painted.pixels.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join(';');
}

function rowsTouched(painted: Painted): Set<number> {
  return new Set([...painted.pixels.keys()].map((key) => Number(key.split(',')[1])));
}

describe('decoração desenhada: margens e presença', () => {
  it('nada é pintado fora da textura e toda variante tem desenho', () => {
    const problems: string[] = [];
    for (const biome of ALL_BIOMES) {
      for (const kind of KINDS) {
        for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
          const painted = paint(biome, kind, variant);
          const id = `${biome}/${kind}/${variant}`;
          if (painted.outside.length > 0) problems.push(`${id} fora: ${painted.outside[0]}`);
          if (painted.pixels.size < 6) problems.push(`${id} quase vazio`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('peças de chão tocam a última linha e as penduradas tocam a primeira', () => {
    const problems: string[] = [];
    for (const biome of ALL_BIOMES) {
      for (const kind of [...FLOOR, ...CEILING]) {
        for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
          const rows = rowsTouched(paint(biome, kind, variant));
          const id = `${biome}/${kind}/${variant}`;
          if (FLOOR.includes(kind) && !rows.has(DECOR_SIZE[kind].height - 1)) {
            problems.push(`${id} flutua`);
          }
          if (CEILING.includes(kind) && !rows.has(0)) problems.push(`${id} não gruda no teto`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('cada peça de chão usa pelo menos 3 tons (luz, base e sombra)', () => {
    const problems: string[] = [];
    for (const biome of ALL_BIOMES) {
      for (const kind of FLOOR) {
        for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
          const colors = new Set(
            [...paint(biome, kind, variant).pixels.values()].map((v) => v.split('@')[0]),
          );
          if (colors.size < 3) problems.push(`${biome}/${kind}/${variant}: ${colors.size} cores`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('decoração desenhada: identidade de cada área', () => {
  it('o desenho é o mesmo a cada execução (sem Math.random)', () => {
    for (const biome of ALL_BIOMES) {
      for (const kind of KINDS) {
        expect(signature(paint(biome, kind, 1))).toBe(signature(paint(biome, kind, 1)));
      }
    }
  });

  it('tufos, entulho, trepadeiras e rachaduras têm forma própria em cada área', () => {
    const repeated: string[] = [];
    for (const kind of ['tuft', 'rubble', 'vine', 'crack'] as const) {
      for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
        const shapes = new Map<string, BiomeId>();
        for (const biome of ALL_BIOMES) {
          // Só a forma conta: as cores ficam de fora, então trocar a paleta não basta
          const shape = [...paint(biome, kind, variant).pixels.keys()].sort().join(';');
          const other = shapes.get(shape);
          if (other) repeated.push(`${kind}/${variant}: ${other} = ${biome}`);
          shapes.set(shape, biome);
        }
      }
    }
    expect(repeated).toEqual([]);
  });

  it('ossos, correntes, gotas e teias também variam entre as áreas', () => {
    for (const kind of ['bone', 'chain', 'drip', 'cobweb'] as const) {
      for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
        const sigs = new Set(ALL_BIOMES.map((biome) => signature(paint(biome, kind, variant))));
        expect(sigs.size, `${kind}/${variant}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('as variantes de um mesmo tipo e área são diferentes entre si', () => {
    const repeated: string[] = [];
    for (const biome of ALL_BIOMES) {
      for (const kind of KINDS) {
        const seen = new Set<string>();
        for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
          const sig = signature(paint(biome, kind, variant));
          if (seen.has(sig)) repeated.push(`${biome}/${kind}/${variant}`);
          seen.add(sig);
        }
      }
    }
    expect(repeated).toEqual([]);
  });
});

describe('regras de decoração', () => {
  it('nenhuma chance passa de 0,5 e o chão tem várias variantes', () => {
    for (const kind of KINDS) expect(DECOR_RULES[kind].chance, kind).toBeLessThanOrEqual(0.5);
    for (const kind of FLOOR) expect(DECOR_RULES[kind].variants, kind).toBeGreaterThanOrEqual(4);
  });
});

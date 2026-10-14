import { describe, expect, it } from 'vitest';
import { BIOME_LOOK, type StoneRamp } from '../src/data/biomeLook';
import { DECOR_RULES } from '../src/data/decor';
import { BIOME_ORDER } from '../src/data/mapRules';
import { DECOR_SIZE } from '../src/systems/decorArt';
import { bayer, mix } from '../src/systems/pixelCanvas';

/** Brilho percebido de uma cor 0xRRGGBB (0 a 255). */
function luma(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ordered(ramp: StoneRamp): number[] {
  return [ramp.deep, ramp.dark, ramp.base, ramp.light, ramp.highlight].map(luma);
}

describe('visual dos biomas', () => {
  it('todo bioma tem o seu visual', () => {
    for (const biome of BIOME_ORDER) expect(BIOME_LOOK[biome], biome).toBeDefined();
  });

  it('as rampas de pedra vão do escuro ao claro, sem se repetir', () => {
    for (const biome of BIOME_ORDER) {
      const look = BIOME_LOOK[biome];
      for (const ramp of [look.stone, look.back]) {
        const tones = ordered(ramp);
        for (let i = 1; i < tones.length; i++) {
          expect(tones[i], `${biome} tom ${i}`).toBeGreaterThan(tones[i - 1] ?? 0);
        }
      }
    }
  });

  it('o fundo é mais escuro que a pedra do chão (profundidade)', () => {
    for (const biome of BIOME_ORDER) {
      const look = BIOME_LOOK[biome];
      expect(luma(look.back.base), biome).toBeLessThan(luma(look.stone.base));
    }
  });

  it('o céu escurece do horizonte para o alto', () => {
    for (const biome of BIOME_ORDER) {
      const look = BIOME_LOOK[biome];
      expect(luma(look.skyTop), biome).toBeLessThan(luma(look.skyMid));
      expect(luma(look.skyMid), biome).toBeLessThanOrEqual(luma(look.skyLow));
    }
  });

  it('os biomas têm climas diferentes (ninguém repete a cor da luz ambiente)', () => {
    const ambient = new Set(BIOME_ORDER.map((biome) => BIOME_LOOK[biome].ambient));
    expect(ambient.size).toBe(BIOME_ORDER.length);
  });
});

describe('decoração desenhada', () => {
  it('todo tipo de decoração (menos o reservado) tem tamanho de desenho', () => {
    for (const kind of Object.keys(DECOR_RULES) as (keyof typeof DECOR_RULES)[]) {
      const size = DECOR_SIZE[kind];
      expect(size.width, kind).toBeGreaterThan(0);
      expect(size.height, kind).toBeGreaterThan(0);
    }
  });
});

describe('ferramentas de pixel', () => {
  it('mix devolve as pontas e o meio', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mix(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f);
    expect(mix(0x102030, 0x405060, -4)).toBe(0x102030);
  });

  it('a matriz de Bayer cobre 16 limiares distintos entre 0 e 1', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const value = bayer(x, y);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1);
        seen.add(value);
      }
    }
    expect(seen.size).toBe(16);
    expect(bayer(4, 4)).toBe(bayer(0, 0)); // repete a cada 4
  });
});

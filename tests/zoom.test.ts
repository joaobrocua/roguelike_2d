import { describe, expect, it } from 'vitest';
import { fillZoom } from '../src/utils/zoom';

const GAME = { width: 480, height: 270 };

describe('fillZoom', () => {
  it('ocupa a janela toda, mesmo com escala fracionária', () => {
    expect(fillZoom(960, 540, GAME)).toBe(2);
    expect(fillZoom(390, 844, GAME)).toBeCloseTo(390 / 480); // em pé: a largura limita
    expect(fillZoom(844, 390, GAME)).toBeCloseTo(390 / 270); // deitado: a altura limita
  });

  it('no computador, sem usar só escalas inteiras: a altura limita numa janela larga', () => {
    // Janela maximizada (1915x972): 3,6x em vez dos 3x inteiros que deixavam faixas grandes
    expect(fillZoom(1915, 972, GAME)).toBeCloseTo(972 / 270);
    expect(fillZoom(1920, 1080, GAME)).toBe(4);
  });

  it('janela inválida volta para 1', () => {
    expect(fillZoom(0, 0, GAME)).toBe(1);
  });
});

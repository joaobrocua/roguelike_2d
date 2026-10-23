import { describe, expect, it } from 'vitest';
import { fillZoom, integerDeviceZoom } from '../src/utils/zoom';

const GAME = { width: 480, height: 270 };

describe('integerDeviceZoom', () => {
  it('em tela de densidade 1, usa a maior escala inteira que cabe', () => {
    expect(integerDeviceZoom(1920, 1080, 1, GAME)).toBe(4);
    expect(integerDeviceZoom(1920, 950, 1, GAME)).toBe(3); // a altura limita
    expect(integerDeviceZoom(960, 540, 1, GAME)).toBe(2);
  });

  it('com 125% de escala do Windows conta pixels do monitor, não do CSS', () => {
    // Janela CSS de 1536x864 = 1920x1080 pixels do monitor: cabe 4x exato
    expect(integerDeviceZoom(1536, 864, 1.25, GAME)).toBe(4);
    // 1440x810 CSS = 1800x1012 no monitor: só 3x inteiro (3,75 não é inteiro)
    expect(integerDeviceZoom(1440, 810, 1.25, GAME)).toBe(3);
  });

  it('com 150% de escala também respeita o monitor', () => {
    expect(integerDeviceZoom(1280, 720, 1.5, GAME)).toBe(4);
  });

  it('densidades fracionárias (110% e 175%) também dão escala inteira de pixels do monitor', () => {
    // 1920x1080 reais com 175% de escala: janela CSS de 1920/1,75 x 1080/1,75 -> cabe 4x exato
    expect(integerDeviceZoom(1920 / 1.75, 1080 / 1.75, 1.75, GAME)).toBe(4);
    expect(integerDeviceZoom(1745, 982, 1.1, GAME)).toBe(3);
  });

  it('o limite exato conta e um pixel a menos não', () => {
    expect(integerDeviceZoom(960, 540, 1, GAME)).toBe(2);
    expect(integerDeviceZoom(959, 540, 1, GAME)).toBe(1);
    expect(integerDeviceZoom(960, 539, 1, GAME)).toBe(1);
  });

  it('nunca devolve menos que 1, nem com densidade inválida', () => {
    expect(integerDeviceZoom(200, 100, 1, GAME)).toBe(1);
    expect(integerDeviceZoom(1920, 1080, 0, GAME)).toBe(4);
  });
});

describe('fillZoom (celular e tablet)', () => {
  it('ocupa a janela toda, mesmo com escala fracionária', () => {
    expect(fillZoom(960, 540, GAME)).toBe(2);
    expect(fillZoom(390, 844, GAME)).toBeCloseTo(390 / 480); // em pé: a largura limita
    expect(fillZoom(844, 390, GAME)).toBeCloseTo(390 / 270); // deitado: a altura limita
  });

  it('janela inválida volta para 1', () => {
    expect(fillZoom(0, 0, GAME)).toBe(1);
  });
});

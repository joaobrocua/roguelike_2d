import { describe, expect, it } from 'vitest';
import { createSlowMo, triggerSlowMo, updateSlowMo } from '../src/logic/slowMo';

describe('slowMo', () => {
  it('começa parado e a escala é 1', () => {
    const s = createSlowMo();
    expect(s).toEqual({ remainingMs: 0 });
    expect(updateSlowMo(s, 16, 0.3)).toBe(1);
  });

  it('retorna a escala lenta enquanto houver tempo e desconta o dt real', () => {
    const s = createSlowMo();
    triggerSlowMo(s, 100);
    expect(updateSlowMo(s, 40, 0.3)).toBe(0.3);
    expect(s.remainingMs).toBe(60);
    expect(updateSlowMo(s, 40, 0.3)).toBe(0.3);
    expect(s.remainingMs).toBe(20);
  });

  it('o frame que zera o contador ainda roda lento, o seguinte volta a 1', () => {
    const s = createSlowMo();
    triggerSlowMo(s, 100);
    expect(updateSlowMo(s, 100, 0.3)).toBe(0.3);
    expect(s.remainingMs).toBe(0);
    expect(updateSlowMo(s, 16, 0.3)).toBe(1);
  });

  it('o contador não fica negativo com dt maior que o restante', () => {
    const s = createSlowMo();
    triggerSlowMo(s, 10);
    updateSlowMo(s, 500, 0.3);
    expect(s.remainingMs).toBe(0);
  });

  it('trigger não encurta uma câmera lenta em andamento', () => {
    const s = createSlowMo();
    triggerSlowMo(s, 200);
    triggerSlowMo(s, 50);
    expect(s.remainingMs).toBe(200);
  });

  it('trigger maior estende a câmera lenta', () => {
    const s = createSlowMo();
    triggerSlowMo(s, 100);
    updateSlowMo(s, 30, 0.3);
    triggerSlowMo(s, 150);
    expect(s.remainingMs).toBe(150);
  });
});

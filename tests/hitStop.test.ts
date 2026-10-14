import { describe, expect, it } from 'vitest';
import { createHitStop, triggerHitStop, updateHitStop } from '../src/logic/hitStop';

describe('hitStop', () => {
  it('começa sem congelar', () => {
    const s = createHitStop();
    expect(s).toEqual({ remainingMs: 0 });
    expect(updateHitStop(s, 16)).toBe(false);
    expect(s.remainingMs).toBe(0);
  });

  it('congela por ceil(duração/dt) frames, contando o frame que zera', () => {
    const s = createHitStop();
    triggerHitStop(s, 50);
    // 50 / 16 -> 4 frames: 50 -> 34 -> 18 -> 2 -> 0
    expect(updateHitStop(s, 16)).toBe(true);
    expect(s.remainingMs).toBe(34);
    expect(updateHitStop(s, 16)).toBe(true);
    expect(updateHitStop(s, 16)).toBe(true);
    expect(s.remainingMs).toBe(2);
    expect(updateHitStop(s, 16)).toBe(true);
    expect(s.remainingMs).toBe(0);
    expect(updateHitStop(s, 16)).toBe(false);
  });

  it('duração exata em múltiplo do dt congela exatamente esse número de frames', () => {
    const s = createHitStop();
    triggerHitStop(s, 32);
    expect(updateHitStop(s, 16)).toBe(true);
    expect(updateHitStop(s, 16)).toBe(true);
    expect(updateHitStop(s, 16)).toBe(false);
  });

  it('trigger menor não encurta um congelamento em andamento', () => {
    const s = createHitStop();
    triggerHitStop(s, 80);
    triggerHitStop(s, 30);
    expect(s.remainingMs).toBe(80);
  });

  it('trigger maior estende o congelamento', () => {
    const s = createHitStop();
    triggerHitStop(s, 40);
    updateHitStop(s, 10);
    triggerHitStop(s, 100);
    expect(s.remainingMs).toBe(100);
  });

  it('trigger com duração <= 0 é ignorado', () => {
    const s = createHitStop();
    triggerHitStop(s, 0);
    triggerHitStop(s, -20);
    expect(s.remainingMs).toBe(0);
    expect(updateHitStop(s, 16)).toBe(false);

    triggerHitStop(s, 60);
    triggerHitStop(s, -20);
    expect(s.remainingMs).toBe(60);
  });

  it('dt negativo é tratado como 0 e não aumenta o contador', () => {
    const s = createHitStop();
    triggerHitStop(s, 50);
    expect(updateHitStop(s, -16)).toBe(true);
    expect(s.remainingMs).toBe(50);
  });

  it('o contador não fica negativo com dt maior que o restante', () => {
    const s = createHitStop();
    triggerHitStop(s, 10);
    expect(updateHitStop(s, 500)).toBe(true);
    expect(s.remainingMs).toBe(0);
  });
});

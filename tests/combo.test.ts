import { describe, expect, it } from 'vitest';
import {
  advanceCombo,
  createCombo,
  openComboWindow,
  resetCombo,
  updateCombo,
} from '../src/logic/combo';

describe('createCombo', () => {
  it('começa sem golpe e sem janela', () => {
    expect(createCombo()).toEqual({ step: -1, windowMs: 0 });
  });
});

describe('advanceCombo', () => {
  it('o primeiro golpe é o passo 0', () => {
    const c = createCombo();
    expect(advanceCombo(c, 3)).toBe(0);
    expect(c.step).toBe(0);
  });

  it('percorre 0, 1, 2 quando cada golpe cai dentro da janela', () => {
    const c = createCombo();
    expect(advanceCombo(c, 3)).toBe(0);
    openComboWindow(c, 380);
    expect(advanceCombo(c, 3)).toBe(1);
    openComboWindow(c, 380);
    expect(advanceCombo(c, 3)).toBe(2);
  });

  it('volta ao 0 depois do último passo', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    expect(advanceCombo(c, 3)).toBe(0);
  });

  it('volta ao 0 se a janela fechou', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    updateCombo(c, 400);
    expect(advanceCombo(c, 3)).toBe(0);
  });

  it('a janela só abre quando o golpe termina: golpear de novo sem openComboWindow recomeça', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    expect(c.windowMs).toBe(0);
    expect(advanceCombo(c, 3)).toBe(0);
  });

  it('zera a janela ao escolher o passo', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    advanceCombo(c, 3);
    expect(c.windowMs).toBe(0);
  });

  it('stepCount 1 (ou menos) sempre devolve 0', () => {
    const c = createCombo();
    expect(advanceCombo(c, 1)).toBe(0);
    openComboWindow(c, 500);
    expect(advanceCombo(c, 1)).toBe(0);
    openComboWindow(c, 500);
    expect(advanceCombo(c, 0)).toBe(0);
  });
});

describe('openComboWindow', () => {
  it('abre a janela com o tempo pedido', () => {
    const c = createCombo();
    openComboWindow(c, 380);
    expect(c.windowMs).toBe(380);
  });

  it('janela <= 0 não abre (relíquia sem combo)', () => {
    const c = createCombo();
    advanceCombo(c, 1);
    openComboWindow(c, 0);
    expect(c.windowMs).toBe(0);
    openComboWindow(c, -10);
    expect(c.windowMs).toBe(0);
  });
});

describe('updateCombo', () => {
  it('desconta a janela sem mexer no passo enquanto ela está aberta', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    updateCombo(c, 100);
    expect(c.windowMs).toBe(280);
    expect(c.step).toBe(0);
  });

  it('ao fechar a janela, reseta o passo para -1', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    updateCombo(c, 379);
    expect(c.step).toBe(0);
    updateCombo(c, 1);
    expect(c.windowMs).toBe(0);
    expect(c.step).toBe(-1);
  });

  it('não reseta o passo de um golpe em andamento (janela ainda fechada)', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    advanceCombo(c, 3);
    updateCombo(c, 1000);
    expect(c.step).toBe(0);
  });

  it('dt negativo não altera a janela', () => {
    const c = createCombo();
    openComboWindow(c, 380);
    updateCombo(c, -50);
    expect(c.windowMs).toBe(380);
  });
});

describe('resetCombo', () => {
  it('limpa passo e janela', () => {
    const c = createCombo();
    advanceCombo(c, 3);
    openComboWindow(c, 380);
    resetCombo(c);
    expect(c).toEqual({ step: -1, windowMs: 0 });
  });
});

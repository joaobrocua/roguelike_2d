import { describe, expect, it } from 'vitest';
import {
  clearInputBuffer,
  consumePress,
  createInputBuffer,
  isBuffered,
  rememberPress,
  tickInputBuffer,
} from '../src/logic/inputBuffer';

describe('buffer de input', () => {
  it('começa vazio', () => {
    const buffer = createInputBuffer();
    for (const action of ['attack', 'special', 'roll'] as const) {
      expect(isBuffered(buffer, action)).toBe(false);
    }
  });

  it('um aperto guardado vale pelo tempo da janela e depois expira', () => {
    const buffer = createInputBuffer();
    rememberPress(buffer, 'attack', 120);
    expect(isBuffered(buffer, 'attack')).toBe(true);
    tickInputBuffer(buffer, 100);
    expect(isBuffered(buffer, 'attack')).toBe(true);
    tickInputBuffer(buffer, 20);
    expect(isBuffered(buffer, 'attack')).toBe(false);
  });

  it('cada ação tem a sua memória (guardar uma não mexe nas outras)', () => {
    const buffer = createInputBuffer();
    rememberPress(buffer, 'roll', 120);
    expect(isBuffered(buffer, 'roll')).toBe(true);
    expect(isBuffered(buffer, 'attack')).toBe(false);
    expect(isBuffered(buffer, 'special')).toBe(false);
  });

  it('consumir gasta o aperto (não vale duas vezes)', () => {
    const buffer = createInputBuffer();
    rememberPress(buffer, 'special', 120);
    consumePress(buffer, 'special');
    expect(isBuffered(buffer, 'special')).toBe(false);
  });

  it('apertar de novo renova a janela', () => {
    const buffer = createInputBuffer();
    rememberPress(buffer, 'attack', 120);
    tickInputBuffer(buffer, 100);
    rememberPress(buffer, 'attack', 120);
    tickInputBuffer(buffer, 100);
    expect(isBuffered(buffer, 'attack')).toBe(true);
  });

  it('dt negativo não adianta nem atrasa a janela, e limpar zera tudo', () => {
    const buffer = createInputBuffer();
    rememberPress(buffer, 'attack', 120);
    rememberPress(buffer, 'roll', 120);
    tickInputBuffer(buffer, -50);
    expect(buffer.attackMs).toBe(120);
    clearInputBuffer(buffer);
    expect(isBuffered(buffer, 'attack')).toBe(false);
    expect(isBuffered(buffer, 'roll')).toBe(false);
  });
});

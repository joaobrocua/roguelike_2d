import { describe, expect, it } from 'vitest';
import { toCssColor } from '../src/utils/color';

describe('toCssColor', () => {
  it('converte para hexadecimal com 6 dígitos', () => {
    expect(toCssColor(0xc0334a)).toBe('#c0334a');
    expect(toCssColor(0x000fff)).toBe('#000fff');
    expect(toCssColor(0)).toBe('#000000');
  });
});

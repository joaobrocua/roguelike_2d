/** Converte uma cor numérica (0xRRGGBB) para texto CSS ('#rrggbb'), usado nos textos do Phaser. */
export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Mistura duas cores 0xRRGGBB canal a canal; t = 0 devolve `from`, t = 1 devolve `to`. */
export function lerpColor(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Paleta fria e escura (máximo de 16 cores). Cores vibrantes ficam reservadas
 * ao que importa: jogador, inimigos, itens, vida e almas.
 */
export const PALETTE = {
  void: 0x0b0d14,
  deep: 0x141a2b,
  stoneDark: 0x1a1f2e,
  stone: 0x2a3144,
  stoneLight: 0x3d475f,
  mist: 0x5b6b8c,
  bone: 0xc9ccd6,
  // Destaques
  player: 0x7fd4e8,
  playerAccent: 0xe8f6fa,
  blood: 0xc0334a,
  bloodDark: 0x6e1d2b,
  ember: 0xe8892d,
  soul: 0x6fe3b0,
  venom: 0x8ac24a,
  wraith: 0x9a6bff,
  glow: 0xffc46b,
} as const;

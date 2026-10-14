/**
 * Decoração procedural das salas (sem lógica): o que pode aparecer, com que chance e quantas
 * variações de desenho existem. A lógica fica em logic/decor.ts e o desenho na camada Phaser.
 */

export type DecorKind =
  'tuft' | 'rubble' | 'bone' | 'vine' | 'chain' | 'drip' | 'cobweb' | 'crack' | 'banner';

export interface DecorRule {
  /** Chance (0..1) de nascer em cada posição candidata. */
  chance: number;
  /** Quantos desenhos diferentes existem (a variante sorteada vai de 0 a variants - 1). */
  variants: number;
}

/**
 * Onde cada tipo se "gruda": tuft/rubble/bone no chão; vine/chain/drip no teto; cobweb nos
 * cantos internos (só em blocos vazios); crack em blocos sólidos visíveis. banner é reservado
 * (chance 0: nunca é gerado).
 */
export const DECOR_RULES: Readonly<Record<DecorKind, DecorRule>> = {
  tuft: { chance: 0.32, variants: 3 },
  rubble: { chance: 0.14, variants: 3 },
  bone: { chance: 0.08, variants: 3 },
  vine: { chance: 0.22, variants: 3 },
  chain: { chance: 0.07, variants: 2 },
  drip: { chance: 0.1, variants: 2 },
  cobweb: { chance: 0.55, variants: 2 },
  crack: { chance: 0.12, variants: 3 },
  banner: { chance: 0, variants: 1 },
};

/**
 * Quantos blocos de ar precisam existir logo abaixo do teto para o item pendurado caber sem
 * atravessar o bloco de baixo (a trepadeira e a corrente são compridas; a gota é curta).
 */
export const DECOR_AIR_BELOW_TILES = { vine: 2, chain: 2, drip: 1 } as const;

/** Distância mínima (em blocos) entre dois itens do mesmo tipo na mesma linha ou coluna. */
export const DECOR_MIN_GAP_TILES = 2;

/** Nada é colocado a menos deste raio (em blocos) de um marcador da sala ou do nascimento. */
export const DECOR_CLEAR_RADIUS_TILES = 1;

/**
 * Folga (em blocos) além da faixa das portas onde também não nasce decoração, para a borda do
 * vão ficar limpa.
 */
export const DECOR_DOOR_MARGIN_TILES = 1;

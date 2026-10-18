/**
 * Decoração procedural das salas (sem lógica): o que pode aparecer, com que chance e quantas
 * variações de desenho existem. A lógica fica em logic/decor.ts e o desenho na camada Phaser.
 */

import type { BiomeId } from './mapRules';

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
 * (chance 0: nunca é gerado). Cada bioma desenha as suas próprias peças para cada tipo (ver
 * systems/decorArt.ts); a última variante de crack é um crescimento (musgo, cristais, fuligem...)
 * em vez de uma fenda. Nenhuma chance passa de 0,5 para o cenário não poluir.
 */
export const DECOR_RULES: Readonly<Record<DecorKind, DecorRule>> = {
  tuft: { chance: 0.4, variants: 4 },
  rubble: { chance: 0.2, variants: 4 },
  bone: { chance: 0.12, variants: 4 },
  vine: { chance: 0.3, variants: 4 },
  chain: { chance: 0.1, variants: 3 },
  drip: { chance: 0.16, variants: 3 },
  cobweb: { chance: 0.5, variants: 2 },
  crack: { chance: 0.2, variants: 4 },
  banner: { chance: 0, variants: 1 },
};

/** Teto da chance de qualquer tipo, mesmo depois do reforço da área (para não poluir o cenário). */
export const DECOR_MAX_CHANCE = 0.5;

/**
 * Multiplicador da chance de cada tipo por área (o que não está aqui vale 1). É o que dá a
 * "personalidade" de densidade: ossos por todo o cemitério e as catacumbas, veios nas minas,
 * fuligem na vila, lodo e gotas no pântano. O resultado nunca passa de DECOR_MAX_CHANCE.
 */
export const DECOR_BIOME_BOOST: Readonly<
  Record<BiomeId, Readonly<Partial<Record<DecorKind, number>>>>
> = {
  muralhas: { tuft: 1.1, vine: 1.2 },
  saloes: { tuft: 1.2, rubble: 1.3, cobweb: 0.8 },
  catacumbas: { bone: 1.8, drip: 1.5, rubble: 1.2 },
  floresta: { tuft: 1.15, vine: 1.3, rubble: 1.2 },
  pantano: { tuft: 1.2, drip: 1.4, bone: 1.3, vine: 1.2 },
  cemiterio: { bone: 2, rubble: 1.4, tuft: 1.1 },
  minas: { crack: 1.5, chain: 1.6, rubble: 1.3, drip: 1.2 },
  vila: { crack: 1.5, rubble: 1.3, tuft: 1.1, vine: 0.6 },
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

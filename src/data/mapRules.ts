/**
 * Regras do mapa da fortaleza: tamanho das "células", posição padrão das portas e tamanho dos
 * biomas. Os modelos de sala (data/roomTemplates) e o gerador (logic/map) seguem estas regras,
 * para que as portas de salas vizinhas sempre se encontrem.
 *
 * Uma célula é uma tela do jogo: 30 x 17 blocos. Uma sala ocupa 1 ou 2 células de largura e
 * sempre 1 de altura; salas vizinhas na grade se ligam por portas nas bordas.
 */

export const CELL = { cols: 30, rows: 17 } as const;

/**
 * Portas padrão (índices de linha/coluna dentro da célula):
 * - esquerda e direita: 3 linhas logo acima do chão (o chão são as linhas 15 e 16);
 * - em cima e embaixo: 4 colunas no centro da célula.
 */
export const DOOR = {
  horizontalRows: [12, 13, 14],
  verticalCols: [13, 14, 15, 16],
} as const;

export type BiomeId = 'muralhas' | 'saloes' | 'catacumbas';

export const BIOME_ORDER: readonly BiomeId[] = ['muralhas', 'saloes', 'catacumbas'];

export const BIOME_NAMES: Readonly<Record<BiomeId, string>> = {
  muralhas: 'Muralhas e Pátio',
  saloes: 'Salões e Capela',
  catacumbas: 'Catacumbas e Masmorra',
};

/** Tamanho de um bioma (em salas) e o que deve existir nele. */
export interface BiomeConfig {
  /** Total de salas, contando entrada e saída. */
  minRooms: number;
  maxRooms: number;
  /** Tamanho da grade (em células) onde as salas são colocadas. */
  gridCols: number;
  gridRows: number;
  /** Quantas salas de cada tipo extra (além de entrada, saída e combate). */
  chests: number;
  rests: number;
  secrets: number; // valor-base dos testes de gerador; numa run vale o que os upgrades liberam (começa em 0)
  /** Quantas ligações extras (laços/atalhos) além da árvore principal. */
  extraLinks: number;
}

export const BIOME_CONFIG: Readonly<Record<BiomeId, BiomeConfig>> = {
  muralhas: {
    minRooms: 6,
    maxRooms: 7,
    gridCols: 5,
    gridRows: 3,
    chests: 1,
    rests: 1,
    secrets: 1,
    extraLinks: 1,
  },
  saloes: {
    minRooms: 7,
    maxRooms: 8,
    gridCols: 5,
    gridRows: 3,
    chests: 1,
    rests: 1,
    secrets: 1,
    extraLinks: 1,
  },
  catacumbas: {
    minRooms: 7,
    maxRooms: 8,
    gridCols: 5,
    gridRows: 3,
    chests: 1,
    rests: 1,
    secrets: 1,
    extraLinks: 2,
  },
};

/** Alcance do pulo do jogador em blocos (usado para checar se as salas são percorríveis). */
export const JUMP_REACH = {
  /** Altura máxima que o pulo vence (o pulo real sobe ~3,5 blocos). */
  maxRise: 3,
  /** Vão horizontal máximo que se atravessa pulando. */
  maxGap: 5,
  /** Altura mínima livre para o jogador passar (o corpo mede ~1,4 bloco). */
  minClearance: 2,
} as const;

import type { BiomeId } from '../../data/mapRules';

export type { BiomeId };

export type Side = 'left' | 'right' | 'up' | 'down';

/** Tipo de sala. 'exit' leva ao próximo bioma; 'boss' só existe no último. */
export type RoomKind = 'start' | 'combat' | 'rest' | 'chest' | 'secret' | 'exit' | 'boss';

/** Uma porta de um modelo de sala: em que lado e em qual célula da sala (0 = a primeira). */
export interface ExitInfo {
  side: Side;
  /** Célula ao longo do lado: para left/right é sempre 0 (salas têm 1 célula de altura); para up/down é a coluna de célula (0 ou 1). */
  cell: number;
}

/** O que o gerador precisa saber de um modelo de sala (o desenho em si fica em data/roomTemplates). */
export interface TemplateInfo {
  id: string;
  biome: BiomeId | 'any';
  kind: RoomKind;
  /** Largura em células (1 ou 2). A altura é sempre 1 célula. */
  cellsW: number;
  exits: readonly ExitInfo[];
}

/** Uma sala colocada no mapa do bioma. (gx, gy) é a célula do canto esquerdo da sala na grade. */
export interface PlacedRoom {
  id: number;
  templateId: string;
  kind: RoomKind;
  gx: number;
  gy: number;
  cellsW: number;
}

/** Ligação entre duas salas: a porta `fromSide` da sala `from` encontra a porta oposta da sala `to`. */
export interface MapLink {
  from: number;
  to: number;
  fromSide: Side;
  /** Célula (ao longo do lado) da sala `from` onde fica a porta; vale para up/down. */
  fromCell: number;
  /** Célula da sala `to` onde fica a porta oposta. */
  toCell: number;
}

/** Mapa de um bioma: salas colocadas e ligações. */
export interface BiomeMap {
  seed: number;
  biome: BiomeId;
  rooms: PlacedRoom[];
  links: MapLink[];
  startId: number;
  /** Sala de saída do bioma ('exit', ou 'boss' no último). */
  endId: number;
}

export function oppositeSide(side: Side): Side {
  switch (side) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'up':
      return 'down';
    case 'down':
      return 'up';
  }
}

/**
 * Modelo de sala: o desenho em texto. Caracteres:
 *   '#' bloco   '.' vazio   'P' ponto de nascimento (só na sala 'start')
 *   'C' Carniçal  'A' Arqueiro Oco  'V' Vulto  'D' Cão de Ossos   'T' tocha de parede
 *   'L' Lobo Espectral  'R' Raiz Emboscadora (ela dorme como um monte de raízes até o herói chegar perto)
 *   'O' Sapo Peçonhento (pula e cospe veneno)  'W' Fogo-Fátuo (voa, como o 'V')
 *   'Q' Soldado Caído (escudo e lança)  'N' Necromante (orbes em leque, de longe)
 *   'U' Golem de Pedra (lento, bate no chão em volta)  'M' Morcego de Cristal (voa, como o 'V')
 *   'B' baú (só 'chest')   'F' fogueira de descanso (só 'rest')
 *   'X' porta para o próximo bioma (só 'exit')   'G' o chefe (só 'boss')
 * As dimensões são múltiplos da célula (src/data/mapRules.ts): largura 30 ou 60, altura 17.
 */
export interface RoomTemplate {
  id: string;
  biome: BiomeId | 'any';
  kind: RoomKind;
  layout: readonly string[];
}

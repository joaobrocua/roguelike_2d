/**
 * Escolha da ala de uma sala. As colunas da grade do bioma são divididas em faixas iguais, uma por
 * ala; a ordem das alas muda por semente. Lógica pura (sem Phaser).
 */
import { BIOME_CONFIG, type BiomeId } from '../data/mapRules';
import { WINGS, type WingDef } from '../data/wings';
import type { PlacedRoom } from './map/types';
import { createRng } from '../utils/rng';

/** As alas do bioma na ordem em que aparecem da esquerda para a direita nesta semente. */
export function wingOrder(biome: BiomeId, seed: number): readonly WingDef[] {
  const order = [...WINGS[biome]];
  const rng = createRng(seed);
  // Fisher-Yates: mesma semente, mesma ordem.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = order[i] as WingDef;
    order[i] = order[j] as WingDef;
    order[j] = a;
  }
  return order;
}

/**
 * Ala de uma sala pela posição na grade: usa o centro da sala (gx + cellsW / 2) para achar a
 * faixa de colunas. Salas vizinhas caem na mesma ala; atravessar o mapa troca de ala. Valores
 * fora da grade são limitados à primeira/última faixa.
 */
export function wingForRoom(
  biome: BiomeId,
  room: Pick<PlacedRoom, 'gx' | 'cellsW'>,
  seed: number,
): WingDef {
  const order = wingOrder(biome, seed);
  const count = order.length;
  const gridCols = BIOME_CONFIG[biome].gridCols;
  const center = room.gx + room.cellsW / 2;
  let strip = 0;
  if (count > 1 && gridCols > 0 && Number.isFinite(center)) {
    strip = Math.min(count - 1, Math.max(0, Math.floor((center * count) / gridCols)));
  }
  return order[strip] as WingDef;
}

import type { BiomeMap } from './types';

export type MinimapState = 'visited' | 'known';

export interface MinimapRoom {
  id: number;
  state: MinimapState;
}

/**
 * O que o minimapa mostra: as salas já visitadas e as vizinhas delas ainda não visitadas
 * ("conhecidas", desenhadas só com o contorno). Salas secretas só aparecem depois de visitadas.
 */
export function minimapRooms(map: BiomeMap, visited: ReadonlySet<number>): MinimapRoom[] {
  const result: MinimapRoom[] = [];
  const known = new Set<number>();
  for (const link of map.links) {
    if (visited.has(link.from)) known.add(link.to);
    if (visited.has(link.to)) known.add(link.from);
  }
  for (const room of map.rooms) {
    if (visited.has(room.id)) {
      result.push({ id: room.id, state: 'visited' });
    } else if (known.has(room.id) && room.kind !== 'secret') {
      result.push({ id: room.id, state: 'known' });
    }
  }
  return result;
}

/** Ligações que o minimapa desenha: todas as que unem duas salas visíveis (visitadas ou só conhecidas). */
export function minimapLinks(
  map: BiomeMap,
  visible: readonly MinimapRoom[],
): { from: number; to: number }[] {
  const shown = new Set(visible.map((room) => room.id));
  const links: { from: number; to: number }[] = [];
  for (const link of map.links) {
    if (shown.has(link.from) && shown.has(link.to)) links.push({ from: link.from, to: link.to });
  }
  return links;
}

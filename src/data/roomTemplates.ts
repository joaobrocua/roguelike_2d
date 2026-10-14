import type { RoomTemplate } from '../logic/map/types';
import { CATACUMBAS_TEMPLATES } from './templates/catacumbas';
import { MURALHAS_TEMPLATES } from './templates/muralhas';
import { SALOES_TEMPLATES } from './templates/saloes';

/**
 * Todos os modelos de sala do jogo. O desenho de cada um fica em data/templates/<bioma>.ts;
 * as regras (tamanho, portas, marcadores) estão em logic/map/types.ts e data/mapRules.ts.
 */
export const ROOM_TEMPLATES: readonly RoomTemplate[] = [
  ...MURALHAS_TEMPLATES,
  ...SALOES_TEMPLATES,
  ...CATACUMBAS_TEMPLATES,
];

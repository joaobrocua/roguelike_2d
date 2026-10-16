import type { RoomTemplate } from '../logic/map/types';
import { CATACUMBAS_TEMPLATES } from './templates/catacumbas';
import { CEMITERIO_TEMPLATES } from './templates/cemiterio';
import { FLORESTA_TEMPLATES } from './templates/floresta';
import { MINAS_TEMPLATES } from './templates/minas';
import { MURALHAS_TEMPLATES } from './templates/muralhas';
import { PANTANO_TEMPLATES } from './templates/pantano';
import { SALOES_TEMPLATES } from './templates/saloes';

/**
 * Todos os modelos de sala do jogo. O desenho de cada um fica em data/templates/<bioma>.ts;
 * as regras (tamanho, portas, marcadores) estão em logic/map/types.ts e data/mapRules.ts.
 */
export const ROOM_TEMPLATES: readonly RoomTemplate[] = [
  ...MURALHAS_TEMPLATES,
  ...SALOES_TEMPLATES,
  ...CATACUMBAS_TEMPLATES,
  ...FLORESTA_TEMPLATES,
  ...PANTANO_TEMPLATES,
  ...CEMITERIO_TEMPLATES,
  ...MINAS_TEMPLATES,
];

import { templateInfo } from './roomExits';
import type { RoomTemplate, TemplateInfo } from './types';

/** Modelos de sala prontos para uso: as informações para o gerador e a busca por id. */
export interface Catalog {
  infos: readonly TemplateInfo[];
  byId: ReadonlyMap<string, RoomTemplate>;
}

export function buildCatalog(templates: readonly RoomTemplate[]): Catalog {
  const byId = new Map<string, RoomTemplate>();
  for (const template of templates) {
    if (byId.has(template.id)) throw new Error(`Modelo de sala repetido: ${template.id}`);
    byId.set(template.id, template);
  }
  return { infos: templates.map(templateInfo), byId };
}

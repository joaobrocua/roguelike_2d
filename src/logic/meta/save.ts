/**
 * Save da meta-progressão: formato, validação ao carregar e gravação segura. Lógica pura: o
 * armazenamento (localStorage no jogo, um Map nos testes) entra por parâmetro.
 *
 * Garantias: o formato é só JSON (níveis num objeto simples), carregar nunca lança nem confia no
 * que leu (`sanitizeMetaSave`), e a gravação não deixa o save principal pela metade
 * (`writeMetaSave`: arquivo temporário conferido + cópia de segurança).
 */
import { META_STORAGE, UPGRADE_NODES } from '../../data/meta';
import type { UpgradeNode } from '../../data/meta';
import { RELIC_IDS } from '../../data/relics';
import type { RelicId } from '../../data/relics';
import { nodeLevel, unlockedRelicIds } from './tree';

export interface MetaSave {
  /** Versão do formato (META_STORAGE.version quando foi gravado). */
  version: number;
  /** Almas guardadas, ainda não gastas. */
  souls: number;
  /** Nível de cada nó da árvore (id -> nível). Nó ausente = nível 0. */
  levels: Record<string, number>;
  /** Relíquia escolhida para começar a run (exige o nó "chooseStart"); null = a padrão. */
  startRelic: RelicId | null;
  stats: { runs: number; victories: number; totalSouls: number };
}

/** O que precisamos do localStorage (e que um objeto falso implementa nos testes). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const BACKUP_SUFFIX = '.backup';
const TEMP_SUFFIX = '.tmp';

export function createMetaSave(): MetaSave {
  return {
    version: META_STORAGE.version,
    souls: 0,
    levels: {},
    startRelic: null,
    stats: { runs: 0, victories: 0, totalSouls: 0 },
  };
}

/** Inteiro finito >= 0 (arredonda para baixo); qualquer outra coisa vira 0. */
export function toCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRelicId(value: unknown): value is RelicId {
  return typeof value === 'string' && (RELIC_IDS as readonly string[]).includes(value);
}

/**
 * Transforma QUALQUER valor num save válido. Nunca lança. Descarta o que não faz sentido (nó
 * desconhecido, nível fora da faixa, nó sem pré-requisito, relíquia inicial não liberada).
 */
export function sanitizeMetaSave(
  raw: unknown,
  nodes: readonly UpgradeNode[] = UPGRADE_NODES,
): MetaSave {
  const save = createMetaSave();
  if (!isRecord(raw)) return save;

  // Migrações de formato entrariam aqui, antes da leitura dos campos: `raw.version` ausente ou
  // menor que META_STORAGE.version seria convertido passo a passo até a versão atual. Hoje só
  // existe a versão 1, então não há o que converter. Versão maior (save de um jogo mais novo):
  // lemos os campos que conhecemos, ignoramos o resto e devolvemos como a versão atual.
  save.souls = toCount(raw.souls);

  if (isRecord(raw.stats)) {
    save.stats.runs = toCount(raw.stats.runs);
    save.stats.victories = toCount(raw.stats.victories);
    save.stats.totalSouls = toCount(raw.stats.totalSouls);
  }

  if (isRecord(raw.levels)) {
    for (const node of nodes) {
      if (!Object.hasOwn(raw.levels, node.id)) continue;
      const level = Math.min(toCount(raw.levels[node.id]), Math.max(0, Math.floor(node.maxLevel)));
      if (level > 0) save.levels[node.id] = level;
    }
  }

  // Zera nós sem pré-requisito e repete até estabilizar: remover um nó pode soltar os que
  // dependiam dele (cadeias como arsenal1 -> arsenal2).
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (nodeLevel(save, node.id) < 1) continue;
      if (node.prerequisites.every((id) => nodeLevel(save, id) >= 1)) continue;
      delete save.levels[node.id];
      changed = true;
    }
  }

  const canChooseStart = nodes.some(
    (node) => node.effect.kind === 'chooseStart' && nodeLevel(save, node.id) >= 1,
  );
  if (
    canChooseStart &&
    isRelicId(raw.startRelic) &&
    unlockedRelicIds(save, nodes).includes(raw.startRelic)
  ) {
    save.startRelic = raw.startRelic;
  }

  return save;
}

export function serializeMetaSave(save: MetaSave): string {
  return JSON.stringify(save);
}

/** Lê e interpreta o JSON de uma chave; null se não existe, não é legível ou não é um objeto. */
function readRaw(storage: StorageLike, key: string): unknown {
  try {
    const text = storage.getItem(key);
    if (text === null) return null;
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Carrega o save. Nunca lança. Ordem: o principal, a cópia `.backup` e, por último, um `.tmp`
 * deixado por uma queda no meio da escrita. Sem nada legível, devolve um save novo.
 */
export function readMetaSave(
  storage: StorageLike,
  key: string = META_STORAGE.key,
  nodes: readonly UpgradeNode[] = UPGRADE_NODES,
): MetaSave {
  for (const candidate of [key, key + BACKUP_SUFFIX, key + TEMP_SUFFIX]) {
    const raw = readRaw(storage, candidate);
    if (raw !== null) return sanitizeMetaSave(raw, nodes);
  }
  return createMetaSave();
}

/** O texto guardado é de uma versão mais nova que esta (um save de um build futuro)? */
function isNewerSave(text: string | null): boolean {
  if (text === null) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const version = (parsed as { version?: unknown }).version;
    return typeof version === 'number' && version > META_STORAGE.version;
  } catch {
    return false;
  }
}

/**
 * Apaga o save e as cópias (principal, .backup e .tmp). Devolve false se o navegador não deixou
 * apagar tudo (aí o jogador ainda pode ter o progresso antigo guardado).
 */
export function clearMetaSave(storage: StorageLike, key: string = META_STORAGE.key): boolean {
  let ok = true;
  for (const name of [key, key + BACKUP_SUFFIX, key + TEMP_SUFFIX]) {
    try {
      storage.removeItem(name);
    } catch {
      ok = false;
    }
  }
  return ok;
}

/**
 * Grava o save em etapas: (a) escreve `.tmp` e confere lendo de volta; (b) copia o save atual
 * (se legível) para `.backup`; (c) grava o principal; (d) remove o `.tmp`. Qualquer exceção
 * (cota cheia, modo privado) devolve false; se a falha vem antes do passo (c) o principal fica
 * exatamente como estava.
 */
export function writeMetaSave(
  storage: StorageLike,
  save: MetaSave,
  key: string = META_STORAGE.key,
): boolean {
  const tempKey = key + TEMP_SUFFIX;
  const json = serializeMetaSave(save);

  try {
    if (isNewerSave(storage.getItem(key))) return false; // de uma versão futura do jogo: não apaga
    storage.setItem(tempKey, json);
    if (storage.getItem(tempKey) !== json) {
      storage.removeItem(tempKey);
      return false;
    }

    const current = storage.getItem(key);
    if (current !== null && readRaw(storage, key) !== null) {
      storage.setItem(key + BACKUP_SUFFIX, current);
    }

    storage.setItem(key, json);
  } catch {
    return false;
  }

  try {
    storage.removeItem(tempKey);
  } catch {
    // O save já foi gravado; um .tmp sobrando é inofensivo (só é lido se o resto sumir).
  }
  return true;
}

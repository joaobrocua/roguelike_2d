import { BIOME_CONFIG, BIOME_ORDER, type BiomeId } from '../data/mapRules';
import { generateBiomeMap } from './map/generateMap';
import type { BiomeMap, TemplateInfo } from './map/types';

/**
 * A sala do santuário em que o herói está. Ela fica entre dois biomas ('nextBiome') ou no despertar
 * depois de morrer ou vencer ('start': a porta leva ao começo de uma run nova). `biome` é o bioma
 * cujo visual a sala veste.
 */
export interface SanctuaryState {
  biome: BiomeId;
  leadsTo: 'start' | 'nextBiome';
}

/**
 * Estado de uma run (do começo ao fim da fortaleza): o mapa do bioma atual, a sala em que
 * o jogador está e o que já foi feito em cada sala. A cena do jogo é recriada a cada sala;
 * este objeto é o que sobrevive de uma sala para a outra.
 */
export interface RunState {
  seed: number;
  biomeIndex: number;
  map: BiomeMap;
  roomId: number;
  visited: Set<number>;
  /** Salas cujos inimigos já foram derrotados (não renascem). */
  cleared: Set<number>;
  /** Objetos já usados (baús abertos, fogueiras apagadas), por `${salaId}:${col},${linha}`. */
  usedProps: Set<string>;
  /** A run terminou (o chefe caiu): as portas deixam de funcionar e a tela final vem a seguir. */
  finished: boolean;
  /** Almas carregadas, ainda não guardadas (só vão para a base ao passar de bioma ou vencer). */
  souls: number;
  /** Salas secretas por bioma nesta run (vêm dos upgrades permanentes). */
  secretRooms: number;
  /** Almas que acabaram de ser guardadas ao passar de bioma (só para avisar na tela). */
  lastBanked: number;
  /** Está na sala do santuário (e não numa sala do mapa)? */
  sanctuary: SanctuaryState | null;
}

/** Opções da run vindas da meta-progressão. */
export interface RunOptions {
  secretRooms: number;
}

/** Semente de cada bioma: derivada da semente da run, então a run toda é reproduzível. */
export function biomeSeed(runSeed: number, biomeIndex: number): number {
  return (Math.imul(runSeed | 0, 2654435761) + biomeIndex * 40503) >>> 0;
}

export function biomeAt(index: number): BiomeId {
  const biome = BIOME_ORDER[index];
  if (!biome) throw new Error(`Bioma ${index} não existe.`);
  return biome;
}

export function isLastBiome(index: number): boolean {
  return index >= BIOME_ORDER.length - 1;
}

function mapFor(
  runSeed: number,
  index: number,
  catalog: readonly TemplateInfo[],
  secretRooms: number,
): BiomeMap {
  const biome = biomeAt(index);
  const config = { ...BIOME_CONFIG[biome], secrets: secretRooms };
  return generateBiomeMap(biomeSeed(runSeed, index), biome, catalog, config, {
    final: isLastBiome(index),
  });
}

export function createRun(
  seed: number,
  catalog: readonly TemplateInfo[],
  options: RunOptions = { secretRooms: 0 },
): RunState {
  const map = mapFor(seed, 0, catalog, options.secretRooms);
  return {
    seed,
    biomeIndex: 0,
    map,
    roomId: map.startId,
    visited: new Set([map.startId]),
    cleared: new Set(),
    usedProps: new Set(),
    finished: false,
    souls: 0,
    secretRooms: options.secretRooms,
    lastBanked: 0,
    sanctuary: null,
  };
}

/** Passa para a sala `roomId` do mapa atual (por uma porta). */
export function enterRoom(run: RunState, roomId: number): void {
  run.roomId = roomId;
  run.visited.add(roomId);
}

/**
 * Passa para o próximo bioma (porta de saída). Devolve false se o atual era o último
 * (a run termina). Os registros de sala são zerados: cada bioma tem as suas salas.
 */
export function advanceBiome(run: RunState, catalog: readonly TemplateInfo[]): boolean {
  if (isLastBiome(run.biomeIndex)) {
    run.finished = true;
    return false;
  }
  run.biomeIndex += 1;
  run.map = mapFor(run.seed, run.biomeIndex, catalog, run.secretRooms);
  run.roomId = run.map.startId;
  run.visited = new Set([run.map.startId]);
  run.cleared = new Set();
  run.usedProps = new Set();
  return true;
}

/** Entra no santuário entre dois biomas: a sala veste o bioma que acabou de ser vencido. */
export function enterSanctuaryBetweenBiomes(run: RunState): void {
  run.sanctuary = { biome: run.map.biome, leadsTo: 'nextBiome' };
}

/** Faz a run começar no santuário (despertar depois de morrer ou vencer), vestindo o bioma `biome`. */
export function startInSanctuary(run: RunState, biome: BiomeId): void {
  run.sanctuary = { biome, leadsTo: 'start' };
}

/**
 * Sai do santuário pela porta. Entre biomas passa para o próximo (devolve false se não há); no
 * despertar só marca que o herói saiu (a cena cria a run nova com o progresso já comprado).
 */
export function leaveSanctuary(run: RunState, catalog: readonly TemplateInfo[]): boolean {
  const sanctuary = run.sanctuary;
  run.sanctuary = null;
  if (sanctuary?.leadsTo === 'nextBiome') return advanceBiome(run, catalog);
  return true;
}

export function propKey(roomId: number, col: number, row: number): string {
  return `${roomId}:${col},${row}`;
}

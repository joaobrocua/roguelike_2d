import {
  BIOME_CONFIG,
  RUN_PLAN,
  SANCTUARY_BEFORE,
  type BiomeId,
  type RunStage,
} from '../data/mapRules';
import type { WingId } from '../data/wings';
import { generateBiomeMap } from './map/generateMap';
import type { BiomeMap, TemplateInfo } from './map/types';

/**
 * A sala do santuário em que o herói está. Ela fica entre duas áreas ('nextBiome') ou no despertar
 * depois de morrer ou vencer ('start': as passagens levam ao começo de uma run nova). `biome` é a
 * área cujo visual a sala veste; `options` são as áreas que as passagens oferecem (1 ou 2).
 */
export interface SanctuaryState {
  biome: BiomeId;
  leadsTo: 'start' | 'nextBiome';
  options: readonly BiomeId[];
}

/**
 * Estado de uma run (do começo ao fim do reino): o mapa da área atual, a sala em que
 * o jogador está e o que já foi feito em cada sala. A cena do jogo é recriada a cada sala;
 * este objeto é o que sobrevive de uma sala para a outra.
 */
export interface RunState {
  seed: number;
  /** Etapa da jornada (índice em RUN_PLAN): 0 é a primeira área, a última é a do chefe. */
  stage: number;
  /** As áreas já visitadas, uma por etapa (a última é a atual). */
  route: BiomeId[];
  /** A ala em que o herói está agora (para avisar quando ele muda de ambiente); null ao chegar numa área. */
  wingId: WingId | null;
  map: BiomeMap;
  roomId: number;
  visited: Set<number>;
  /** Salas cujos inimigos já foram derrotados (não renascem). */
  cleared: Set<number>;
  /** Objetos já usados (baús abertos, fogueiras apagadas), por `${salaId}:${col},${linha}`. */
  usedProps: Set<string>;
  /** A run terminou (o chefe caiu): as portas deixam de funcionar e a tela final vem a seguir. */
  finished: boolean;
  /** Almas carregadas, ainda não guardadas (só vão para a base ao passar de área ou vencer). */
  souls: number;
  /** Salas secretas por área nesta run (vêm dos upgrades permanentes). */
  secretRooms: number;
  /** Almas que acabaram de ser guardadas ao passar de área (só para avisar na tela). */
  lastBanked: number;
  /** Está na sala do santuário (e não numa sala do mapa)? */
  sanctuary: SanctuaryState | null;
}

/** Opções da run vindas da meta-progressão e da escolha do primeiro caminho. */
export interface RunOptions {
  secretRooms: number;
  /** Área escolhida na passagem do despertar (se o plano oferece mais de uma na primeira etapa). */
  firstBiome?: BiomeId | null;
}

/** Semente de cada etapa: derivada da semente da run, então a run toda é reproduzível. */
export function biomeSeed(runSeed: number, stage: number): number {
  return (Math.imul(runSeed | 0, 2654435761) + stage * 40503) >>> 0;
}

export function stageCount(plan: readonly RunStage[] = RUN_PLAN): number {
  return plan.length;
}

/** A etapa é a última da jornada (a do chefe)? */
export function isLastStage(stage: number, plan: readonly RunStage[] = RUN_PLAN): boolean {
  return stage >= plan.length - 1;
}

/**
 * As áreas que o jogador pode escolher ao chegar à etapa `stage`: as do plano, menos as que já
 * visitou nesta run. Se não sobrar nenhuma (plano com áreas repetidas), vale a lista inteira.
 * Etapa fora do plano: lista vazia.
 */
export function areaOptions(
  stage: number,
  route: readonly BiomeId[],
  plan: readonly RunStage[] = RUN_PLAN,
): readonly BiomeId[] {
  const options = plan[stage]?.options ?? [];
  const fresh = options.filter((biome) => !route.includes(biome));
  return fresh.length > 0 ? fresh : options;
}

/** A área escolhida, se for uma das ofertadas; senão a primeira. */
export function pickArea(options: readonly BiomeId[], chosen?: BiomeId | null): BiomeId {
  const first = options[0];
  if (first === undefined) throw new Error('Etapa sem áreas para escolher.');
  return chosen && options.includes(chosen) ? chosen : first;
}

function mapFor(
  runSeed: number,
  stage: number,
  biome: BiomeId,
  catalog: readonly TemplateInfo[],
  secretRooms: number,
  plan: readonly RunStage[],
): BiomeMap {
  const config = { ...BIOME_CONFIG[biome], secrets: secretRooms };
  return generateBiomeMap(biomeSeed(runSeed, stage), biome, catalog, config, {
    final: isLastStage(stage, plan),
  });
}

export function createRun(
  seed: number,
  catalog: readonly TemplateInfo[],
  options: RunOptions = { secretRooms: 0 },
  plan: readonly RunStage[] = RUN_PLAN,
): RunState {
  const biome = pickArea(areaOptions(0, [], plan), options.firstBiome);
  const map = mapFor(seed, 0, biome, catalog, options.secretRooms, plan);
  return {
    seed,
    stage: 0,
    route: [biome],
    wingId: null,
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
 * Passa para a próxima etapa, na área `chosen` (se não for uma das ofertadas, vale a primeira).
 * Devolve false se a etapa atual era a última (a run termina). Os registros de sala são zerados:
 * cada área tem as suas salas.
 */
export function advanceBiome(
  run: RunState,
  catalog: readonly TemplateInfo[],
  chosen?: BiomeId | null,
  plan: readonly RunStage[] = RUN_PLAN,
): boolean {
  if (isLastStage(run.stage, plan)) {
    run.finished = true;
    return false;
  }
  const next = run.stage + 1;
  const biome = pickArea(areaOptions(next, run.route, plan), chosen);
  run.stage = next;
  run.route.push(biome);
  run.wingId = null;
  run.map = mapFor(run.seed, next, biome, catalog, run.secretRooms, plan);
  run.roomId = run.map.startId;
  run.visited = new Set([run.map.startId]);
  run.cleared = new Set();
  run.usedProps = new Set();
  return true;
}

export function propKey(roomId: number, col: number, row: number): string {
  return `${roomId}:${col},${row}`;
}

/** Entra no santuário entre duas áreas: a sala veste a área que acabou e as passagens oferecem as próximas. */
export function enterSanctuaryBetweenBiomes(
  run: RunState,
  plan: readonly RunStage[] = RUN_PLAN,
): void {
  run.sanctuary = {
    biome: run.map.biome,
    leadsTo: 'nextBiome',
    options: areaOptions(run.stage + 1, run.route, plan),
  };
}

/**
 * Faz a run começar no santuário (despertar depois de morrer ou vencer), vestindo a área `biome`;
 * as passagens oferecem as áreas da primeira etapa.
 */
export function startInSanctuary(
  run: RunState,
  biome: BiomeId,
  plan: readonly RunStage[] = RUN_PLAN,
): void {
  run.sanctuary = { biome, leadsTo: 'start', options: areaOptions(0, [], plan) };
}

/**
 * Sai do santuário por uma passagem. Entre áreas passa para a próxima (devolve false se não há); no
 * despertar só marca que o herói saiu (a cena cria a run nova, com o progresso já comprado e a
 * área que a passagem escolheu).
 */
export function leaveSanctuary(
  run: RunState,
  catalog: readonly TemplateInfo[],
  chosen?: BiomeId | null,
  plan: readonly RunStage[] = RUN_PLAN,
): boolean {
  const sanctuary = run.sanctuary;
  run.sanctuary = null;
  if (sanctuary?.leadsTo === 'nextBiome') return advanceBiome(run, catalog, chosen, plan);
  return true;
}

/**
 * A saída desta área passa pelo santuário antes de chegar à próxima? Só quando a área seguinte
 * (a primeira das opções) é uma das que ficam atrás do "portão" (SANCTUARY_BEFORE): nas demais a
 * porta leva direto.
 */
export function passesThroughSanctuary(
  options: readonly BiomeId[],
  gated: readonly BiomeId[] = SANCTUARY_BEFORE,
): boolean {
  const first = options[0];
  return first !== undefined && gated.includes(first);
}

/**
 * Alcance do jogador dentro de um modelo de sala, em blocos. É uma simulação APROXIMADA e
 * conservadora (ver as simplificações em `canJump`): serve para barrar salas impossíveis de
 * percorrer, não para provar que um pulo exato é possível. Roda nos testes e ao carregar os
 * modelos, nunca por frame.
 */

import { CELL, DOOR, JUMP_REACH } from '../../data/mapRules';
import { detectExits } from './roomExits';
import type { ExitInfo } from './types';

/** Bloco vazio onde o jogador fica em pé: o de baixo é sólido. */
export interface StandPoint {
  col: number;
  row: number;
}

/** Marcadores que ficam em pé no chão e precisam ser alcançáveis. */
const REACHABLE_MARKERS = 'PBFXGCADLROQNU';

function pointKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Bloco sólido? Acima da sala e fora das laterais conta como sólido; abaixo da sala é vazio
 * (quem cai por uma porta 'down' sai da sala e não pousa).
 */
function isSolid(layout: readonly string[], col: number, row: number): boolean {
  if (row < 0) return true;
  const line = layout[row];
  if (line === undefined) return col < 0 || col >= (layout[0]?.length ?? 0);
  if (col < 0 || col >= line.length) return true;
  return line.charAt(col) === '#';
}

/** Todos os blocos da coluna entre `top` e `bottom` (inclusive) são livres? */
function columnFree(layout: readonly string[], col: number, top: number, bottom: number): boolean {
  for (let row = top; row <= bottom; row++) {
    if (isSolid(layout, col, row)) return false;
  }
  return true;
}

/**
 * O jogador pode ficar em pé em (col, row)? Precisa de chão embaixo e de `minClearance` blocos
 * livres de altura contando o próprio bloco (o corpo ocupa o bloco de pé e o de cima).
 */
function isStandable(layout: readonly string[], col: number, row: number): boolean {
  if (row < 0 || row + 1 >= layout.length) return false;
  if (!isSolid(layout, col, row + 1)) return false;
  return columnFree(layout, col, row - (JUMP_REACH.minClearance - 1), row);
}

/**
 * Dá para ir do ponto de pé `from` ao ponto de pé (col, row) com um pulo (ou caminhando/caindo,
 * que são pulos de subida 0 / descida)? Simplificações:
 * - o ápice do corpo fica na linha do mais alto entre origem e destino; nas colunas do meio só
 *   se exige que o corpo (minClearance blocos) caiba nessa linha, sem sólidos;
 * - na coluna de origem o corpo precisa subir livre até o ápice; na de destino, descer livre dele;
 * - o vão (colunas entre origem e destino) e a subida são checados separados, sem trocar um pelo
 *   outro: um pulo de subida máxima ainda pode cruzar o vão máximo.
 */
function canJump(layout: readonly string[], from: StandPoint, col: number, row: number): boolean {
  const apex = Math.min(from.row, row);
  const top = apex - (JUMP_REACH.minClearance - 1);
  const dir = Math.sign(col - from.col);
  if (!columnFree(layout, from.col, top, from.row)) return false;
  for (let x = from.col + dir; x !== col; x += dir) {
    if (!columnFree(layout, x, top, apex)) return false;
  }
  return columnFree(layout, col, top, row);
}

/**
 * Pontos onde o jogador pode ficar em pé em uma porta. Left/right: a linha mais baixa da faixa.
 * Up: o ponto de pé mais alto logo abaixo da abertura (descendo de cima em cada coluna da faixa).
 * Down: o chão ao lado da abertura, na linha mais baixa da faixa das portas laterais.
 * Devolve null se não achar.
 */
export function exitStandPoint(layout: readonly string[], exit: ExitInfo): StandPoint | null {
  const cols = layout[0]?.length ?? 0;
  const rows = layout.length;
  const floorRow = Math.max(...DOOR.horizontalRows);
  const base = CELL.cols * exit.cell;

  switch (exit.side) {
    case 'left':
      return isStandable(layout, 0, floorRow) ? { col: 0, row: floorRow } : null;
    case 'right':
      return isStandable(layout, cols - 1, floorRow) ? { col: cols - 1, row: floorRow } : null;
    case 'up': {
      let best: StandPoint | null = null;
      for (const offset of DOOR.verticalCols) {
        const col = base + offset;
        for (let row = 1; row < rows; row++) {
          if (isSolid(layout, col, row)) break;
          if (isStandable(layout, col, row)) {
            if (best === null || row < best.row) best = { col, row };
            break;
          }
        }
      }
      return best;
    }
    case 'down': {
      const left = base + Math.min(...DOOR.verticalCols) - 1;
      const right = base + Math.max(...DOOR.verticalCols) + 1;
      if (isStandable(layout, left, floorRow)) return { col: left, row: floorRow };
      if (isStandable(layout, right, floorRow)) return { col: right, row: floorRow };
      return null;
    }
  }
}

/**
 * Pontos de pé alcançáveis a partir de `from` (chave `${col},${row}`), incluindo o próprio.
 * Se `from` não é um ponto de pé válido, devolve o conjunto vazio.
 */
export function reachableFrom(layout: readonly string[], from: StandPoint): Set<string> {
  const reached = new Set<string>();
  if (!isStandable(layout, from.col, from.row)) return reached;
  const rows = layout.length;
  const queue: StandPoint[] = [from];
  reached.add(pointKey(from.col, from.row));

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === undefined) break;
    for (let dc = -(JUMP_REACH.maxGap + 1); dc <= JUMP_REACH.maxGap + 1; dc++) {
      if (dc === 0) continue;
      const col = current.col + dc;
      for (let row = Math.max(0, current.row - JUMP_REACH.maxRise); row < rows; row++) {
        const key = pointKey(col, row);
        if (reached.has(key)) continue;
        if (!isStandable(layout, col, row) || !canJump(layout, current, col, row)) continue;
        reached.add(key);
        queue.push({ col, row });
      }
    }
  }
  return reached;
}

function exitLabel(exit: ExitInfo): string {
  return exit.side === 'up' || exit.side === 'down' ? `${exit.side}[${exit.cell}]` : exit.side;
}

/**
 * Para todo par de portas do modelo, cada uma é alcançável a partir da outra? 0 ou 1 porta: ok.
 * Para sair por uma porta 'up' o jogador precisa subir do ponto de pé até a abertura: a distância
 * até a linha 0 não pode passar de JUMP_REACH.maxRise (senão a porta não serve de destino).
 * Entrar por ela, caindo, sempre é possível.
 */
export function exitsConnected(layout: readonly string[]): { ok: boolean; problems: string[] } {
  const exits = detectExits(layout);
  const problems: string[] = [];
  if (exits.length < 2) return { ok: true, problems };

  const points = exits.map((exit) => exitStandPoint(layout, exit));
  const reach = points.map((point) => (point === null ? null : reachableFrom(layout, point)));

  exits.forEach((exit, i) => {
    const point = points[i];
    if (point === null || point === undefined) {
      problems.push(`porta ${exitLabel(exit)}: sem ponto de pé.`);
    } else if (exit.side === 'up' && point.row > JUMP_REACH.maxRise) {
      problems.push(
        `porta ${exitLabel(exit)}: o ponto de pé (${point.col}, ${point.row}) fica alto demais para chegar à abertura (máx. ${JUMP_REACH.maxRise} blocos).`,
      );
    }
  });

  exits.forEach((from, i) => {
    exits.forEach((to, j) => {
      const target = points[j];
      const fromReach = reach[i];
      if (i === j || target === null || target === undefined) return;
      if (fromReach === null || fromReach === undefined) return;
      if (!fromReach.has(pointKey(target.col, target.row))) {
        problems.push(`a porta ${exitLabel(from)} não alcança a porta ${exitLabel(to)}.`);
      }
    });
  });

  return { ok: problems.length === 0, problems };
}

/**
 * Marcadores 'P','B','F','X','G','C','A','D' que não são alcançáveis a partir de nenhuma porta
 * (nem do 'P'). Cada item vem como `C(10,14)`. Marcador sem chão embaixo ou sem espaço livre
 * também conta como inalcançável.
 */
export function unreachableMarkers(layout: readonly string[]): string[] {
  const reached = new Set<string>();
  const markers: { char: string; col: number; row: number }[] = [];

  layout.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line.charAt(col);
      if (REACHABLE_MARKERS.includes(char)) markers.push({ char, col, row });
      if (char === 'P') {
        for (const key of reachableFrom(layout, { col, row })) reached.add(key);
      }
    }
  });
  for (const exit of detectExits(layout)) {
    const point = exitStandPoint(layout, exit);
    if (point === null) continue;
    for (const key of reachableFrom(layout, point)) reached.add(key);
  }

  return markers
    .filter(
      (marker) =>
        !isStandable(layout, marker.col, marker.row) ||
        !reached.has(pointKey(marker.col, marker.row)),
    )
    .map((marker) => `${marker.char}(${marker.col},${marker.row})`);
}

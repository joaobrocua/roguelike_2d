import { resetAiOutput, type AiOutput, type AiSense } from './types';

export type GroundMeleeMode = 'patrol' | 'chase' | 'attack' | 'cooldown';

export interface GroundMeleeConfig {
  /** px/s andando em patrulha. */
  patrolSpeed: number;
  /** px/s perseguindo. */
  chaseSpeed: number;
  /** Enxerga o alvo se |dx| <= sightRangeX e |dy| <= sightRangeY. */
  sightRangeX: number;
  sightRangeY: number;
  /** Histerese: depois de ver, só perde o alvo se |dx| > isto (ou |dy| > sightRangeY * 1.5). */
  loseSightRangeX: number;
  /** Pode atacar se |dx| <= attackRangeX e |dy| <= attackRangeY. */
  attackRangeX: number;
  attackRangeY: number;
  /** Pausa depois que um ataque termina. */
  attackCooldownMs: number;
  /** Pausa parado ao dar meia-volta na patrulha. */
  turnPauseMs: number;
  /** px/s na direção de facing durante a fase 'active' (0 = golpe parado; >0 = bote). */
  lungeSpeed: number;
  /**
   * Com attackAllowed false e |dx| < isto, o inimigo "ronda": recua (patrolSpeed * 2)
   * se |dx| < waitDistanceX * 0.6, senão fica parado olhando para o alvo.
   */
  waitDistanceX: number;
}

/** `timerMs` é o cooldown restante (mode 'cooldown') ou a pausa de virada (mode 'patrol'). */
export interface GroundMeleeState {
  mode: GroundMeleeMode;
  timerMs: number;
}

/** Quanto além de sightRangeY o alvo ainda é mantido na mira (histerese vertical). */
const LOSE_SIGHT_Y_FACTOR = 1.5;
/** Abaixo desta fração de waitDistanceX o inimigo em ronda recua em vez de ficar parado. */
const RETREAT_FRACTION = 0.6;
/** Multiplicador da patrolSpeed ao recuar na ronda. */
const RETREAT_SPEED_FACTOR = 2;

export function createGroundMelee(): GroundMeleeState {
  return { mode: 'patrol', timerMs: 0 };
}

function abs(n: number): number {
  return n < 0 ? -n : n;
}

/** Avista o alvo "do zero" (patrulha): alcance de visão normal. */
function seesTarget(sense: AiSense, cfg: GroundMeleeConfig): boolean {
  return sense.targetAlive && abs(sense.dx) <= cfg.sightRangeX && abs(sense.dy) <= cfg.sightRangeY;
}

/** Já estava de olho no alvo: só o perde além do alcance maior (histerese). */
function keepsTarget(sense: AiSense, cfg: GroundMeleeConfig): boolean {
  return (
    sense.targetAlive &&
    abs(sense.dx) <= cfg.loseSightRangeX &&
    abs(sense.dy) <= cfg.sightRangeY * LOSE_SIGHT_Y_FACTOR
  );
}

/** Movimento da patrulha, sem checar visão (quem chama já decidiu). */
function patrolMove(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: GroundMeleeConfig,
): void {
  // Pausa de virada em andamento: parado até o timer zerar, então vira.
  if (state.timerMs > 0) {
    state.timerMs = Math.max(0, state.timerMs - dtMs);
    if (state.timerMs > 0) return;
    out.facing = -out.facing;
    return;
  }

  if (sense.wallAhead || sense.ledgeAhead) {
    if (cfg.turnPauseMs > 0) {
      state.timerMs = cfg.turnPauseMs;
    } else {
      out.facing = -out.facing;
    }
    return;
  }

  out.velX = out.facing * cfg.patrolSpeed;
}

function updatePatrol(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: GroundMeleeConfig,
): void {
  if (seesTarget(sense, cfg)) {
    state.mode = 'chase';
    state.timerMs = 0;
    updateChase(state, out, sense, dtMs, cfg);
    return;
  }
  patrolMove(state, out, sense, dtMs, cfg);
}

function updateChase(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: GroundMeleeConfig,
): void {
  if (!keepsTarget(sense, cfg)) {
    state.mode = 'patrol';
    state.timerMs = 0;
    patrolMove(state, out, sense, dtMs, cfg);
    return;
  }

  if (state.timerMs > 0) state.timerMs = Math.max(0, state.timerMs - dtMs);

  out.facing = sense.dx >= 0 ? 1 : -1;
  const blocked = sense.wallAhead || sense.ledgeAhead;
  out.velX = blocked ? 0 : out.facing * cfg.chaseSpeed;

  const absDx = abs(sense.dx);
  const inAttackRange = absDx <= cfg.attackRangeX && abs(sense.dy) <= cfg.attackRangeY;

  if (sense.attackAllowed) {
    if (inAttackRange && state.timerMs <= 0) {
      out.startAttack = true;
      out.velX = 0;
    }
    return;
  }

  // Bando não deixa atacar: ronda por perto em vez de colar no alvo.
  if (absDx < cfg.waitDistanceX || (inAttackRange && state.timerMs <= 0)) {
    out.velX =
      absDx < cfg.waitDistanceX * RETREAT_FRACTION
        ? -out.facing * cfg.patrolSpeed * RETREAT_SPEED_FACTOR
        : 0;
  }
}

function updateAttack(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  cfg: GroundMeleeConfig,
): void {
  if (sense.attackPhase === 'idle') {
    state.mode = 'cooldown';
    state.timerMs = cfg.attackCooldownMs;
    return;
  }
  // facing travado; só avança na fase ativa (bote).
  if (sense.attackPhase === 'active') out.velX = out.facing * cfg.lungeSpeed;
}

function updateCooldown(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: GroundMeleeConfig,
): void {
  state.timerMs = Math.max(0, state.timerMs - dtMs);
  if (state.timerMs > 0) return;

  if (keepsTarget(sense, cfg)) {
    state.mode = 'chase';
    updateChase(state, out, sense, dtMs, cfg);
  } else {
    state.mode = 'patrol';
    patrolMove(state, out, sense, dtMs, cfg);
  }
}

/**
 * IA de inimigo terrestre corpo a corpo (patrulha, perseguição, ataque, cooldown).
 * Muta `state` e `out`; não aloca nada. `out.facing` persiste entre frames.
 */
export function updateGroundMelee(
  state: GroundMeleeState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: GroundMeleeConfig,
): void {
  resetAiOutput(out);
  // dt negativo ou zero nunca faz timer andar para trás.
  const dt = dtMs > 0 ? dtMs : 0;

  // A entidade iniciou o golpe (a nosso pedido ou não): passa a seguir as fases dele.
  if (state.mode !== 'attack' && sense.attackPhase !== 'idle') {
    state.mode = 'attack';
    state.timerMs = 0;
  }

  switch (state.mode) {
    case 'patrol':
      updatePatrol(state, out, sense, dt, cfg);
      break;
    case 'chase':
      updateChase(state, out, sense, dt, cfg);
      break;
    case 'attack':
      updateAttack(state, out, sense, cfg);
      break;
    case 'cooldown':
      updateCooldown(state, out, sense, dt, cfg);
      break;
  }
}

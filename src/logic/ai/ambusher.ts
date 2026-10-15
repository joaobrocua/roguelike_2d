import type { AttackPhase } from '../attack';
import { resetAiOutput, type AiOutput, type AiSense } from './types';

/** Raiz Emboscadora: inimigo estacionário que dorme, se ergue, chicoteia e afunda de volta. */
export interface AmbusherConfig {
  /** Acorda se |dx| <= wakeRangeX e |dy| <= wakeRangeY e o alvo está vivo. */
  wakeRangeX: number;
  wakeRangeY: number;
  /** Pode atacar acordada se |dx| <= attackRangeX e |dy| <= attackRangeY. */
  attackRangeX: number;
  attackRangeY: number;
  /** Alvo além disto (|dx| > sleepRangeX) ou morto conta como "sem ninguém por perto". */
  sleepRangeX: number;
  /** Tempo na fase 'rising' (subindo). */
  riseMs: number;
  /** Tempo na fase 'sinking' (afundando). */
  sinkMs: number;
  /** Tempo acordada sem ninguém por perto antes de começar a afundar. */
  sinkDelayMs: number;
  /** Intervalo mínimo entre ataques, contado a partir do fim de um golpe. */
  attackCooldownMs: number;
}

/** dormant: monte de raízes inofensivo; rising/sinking: transições; awake: erguida e atacando. */
export type AmbusherMode = 'dormant' | 'rising' | 'awake' | 'sinking';

/**
 * `timerMs` significa, conforme o modo: tempo restante de 'rising' ou 'sinking', ou (em 'awake')
 * tempo acumulado sem ninguém por perto. `lastPhase` é a fase do ataque no frame anterior,
 * para detectar o fim do golpe.
 */
export interface AmbusherState {
  mode: AmbusherMode;
  timerMs: number;
  cooldownMs: number;
  lastPhase: AttackPhase;
}

export function createAmbusher(): AmbusherState {
  return { mode: 'dormant', timerMs: 0, cooldownMs: 0, lastPhase: 'idle' };
}

/** Só pode ser acertada enquanto está erguida (subindo ou acordada). */
export function isExposed(state: AmbusherState): boolean {
  return state.mode === 'rising' || state.mode === 'awake';
}

/** Acordada e com o cooldown zerado (não olha alcance nem fase do golpe). */
export function canAttackNow(state: AmbusherState): boolean {
  return state.mode === 'awake' && state.cooldownMs <= 0;
}

function abs(n: number): number {
  return n < 0 ? -n : n;
}

function updateDormant(state: AmbusherState, sense: AiSense, cfg: AmbusherConfig): void {
  if (sense.targetAlive && abs(sense.dx) <= cfg.wakeRangeX && abs(sense.dy) <= cfg.wakeRangeY) {
    state.mode = 'rising';
    state.timerMs = cfg.riseMs;
  }
}

function updateRising(state: AmbusherState, out: AiOutput, sense: AiSense, dt: number): void {
  out.facing = sense.dx >= 0 ? 1 : -1;
  state.timerMs = Math.max(0, state.timerMs - dt);
  if (state.timerMs > 0) return;
  state.mode = 'awake';
  state.timerMs = 0;
  state.cooldownMs = 0;
}

function updateAwake(
  state: AmbusherState,
  out: AiOutput,
  sense: AiSense,
  dt: number,
  cfg: AmbusherConfig,
): void {
  const idle = sense.attackPhase === 'idle';

  // Durante o golpe o rosto fica travado (out.facing já guarda a direção anterior).
  if (idle) out.facing = sense.dx >= 0 ? 1 : -1;

  // O cooldown conta a partir do fim do golpe: reinicia na transição golpe -> idle.
  state.cooldownMs = Math.max(0, state.cooldownMs - dt);
  if (idle && state.lastPhase !== 'idle') state.cooldownMs = cfg.attackCooldownMs;

  const nobodyNear = !sense.targetAlive || abs(sense.dx) > cfg.sleepRangeX;
  if (nobodyNear) {
    state.timerMs += dt;
    // Nunca afunda no meio de um golpe: espera o fim e afunda no primeiro frame parado.
    if (idle && state.timerMs >= cfg.sinkDelayMs) {
      state.mode = 'sinking';
      state.timerMs = cfg.sinkMs;
      return;
    }
  } else {
    state.timerMs = 0;
  }

  if (
    idle &&
    state.cooldownMs <= 0 &&
    sense.attackAllowed &&
    sense.targetAlive &&
    abs(sense.dx) <= cfg.attackRangeX &&
    abs(sense.dy) <= cfg.attackRangeY
  ) {
    out.startAttack = true;
  }
}

function updateSinking(state: AmbusherState, dt: number): void {
  // Não interrompe o afundamento mesmo que o alvo volte para perto.
  state.timerMs = Math.max(0, state.timerMs - dt);
  if (state.timerMs > 0) return;
  state.mode = 'dormant';
  state.timerMs = 0;
  state.cooldownMs = 0;
}

/**
 * Decide o frame da Raiz Emboscadora. Muta `state` e `out`; não aloca nada.
 * Nunca se move (`velX` sempre 0) e nunca usa `controlsY`, `fire` nem `jumpVelocity`.
 * O ataque só é pedido acordada, no alcance, com cooldown zerado e bando permitindo.
 */
export function updateAmbusher(
  state: AmbusherState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: AmbusherConfig,
): void {
  resetAiOutput(out);
  // dt negativo ou NaN nunca faz timer andar para trás.
  const dt = dtMs > 0 ? dtMs : 0;

  switch (state.mode) {
    case 'dormant':
      updateDormant(state, sense, cfg);
      break;
    case 'rising':
      updateRising(state, out, sense, dt);
      break;
    case 'awake':
      updateAwake(state, out, sense, dt, cfg);
      break;
    case 'sinking':
      updateSinking(state, dt);
      break;
  }

  state.lastPhase = sense.attackPhase;
}

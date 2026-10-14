import type { AttackPhase } from '../attack';
import { resetAiOutput, type AiOutput, type AiSense } from './types';

/** Arqueiro: mantém distância do alvo e atira. */
export type RangedMode = 'idle' | 'reposition' | 'aim' | 'cooldown';

export interface RangedConfig {
  /** Enxerga o alvo se |dx| <= sightRangeX e |dy| <= sightRangeY. */
  sightRangeX: number;
  sightRangeY: number;
  /** Só atira se |dy| <= isto: a flecha sai na horizontal, então precisa estar na altura do alvo. */
  shootRangeY: number;
  /** Se |dx| < minDistanceX, recua. */
  minDistanceX: number;
  /** Se |dx| > maxDistanceX, se aproxima. */
  maxDistanceX: number;
  /** px/s */
  retreatSpeed: number;
  approachSpeed: number;
  /** Pausa depois de atirar antes de poder mirar de novo. */
  shootCooldownMs: number;
}

export interface RangedState {
  mode: RangedMode;
  /** Tempo restante do cooldown pós-tiro. */
  timerMs: number;
  /** Fase do ataque no frame anterior, para detectar transições (início do disparo e fim do golpe). */
  prevPhase: AttackPhase;
}

export function createRanged(): RangedState {
  return { mode: 'idle', timerMs: 0, prevPhase: 'idle' };
}

/**
 * Decide o frame do arqueiro. Muta `state` e `out`; não aloca nada.
 * - Com ataque em andamento: parado, olhando para onde estava, e `fire` sai uma única vez,
 *   no frame em que a preparação termina.
 * - Ao terminar o ataque entra em cooldown (parado, ou recuando se o alvo estiver perto demais).
 * - Fora disso: recua se perto, se aproxima se longe (sem cair nem bater em parede) e,
 *   na faixa ideal, pede o ataque se o bando permitir.
 */
export function updateRanged(
  state: RangedState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: RangedConfig,
): void {
  resetAiOutput(out);

  const prev = state.prevPhase;
  const phase = sense.attackPhase;
  state.prevPhase = phase;

  // A entidade iniciou o ataque: mira travada até o fim do golpe.
  if (phase !== 'idle') {
    state.mode = 'aim';
    // A flecha sai uma única vez, ao sair da preparação (mesmo que um dt grande pule a fase ativa)
    const beforeShot = prev === 'idle' || prev === 'windup';
    if (beforeShot && (phase === 'active' || phase === 'recovery')) out.fire = true;
    return;
  }

  if (prev !== 'idle') {
    // O golpe acabou de terminar: começa a pausa antes do próximo tiro.
    state.mode = 'cooldown';
    state.timerMs = cfg.shootCooldownMs;
  } else if (state.timerMs > 0) {
    state.timerMs = Math.max(0, state.timerMs - Math.max(0, dtMs));
  }
  const cooling = state.timerMs > 0;

  const sees =
    sense.targetAlive &&
    Math.abs(sense.dx) <= cfg.sightRangeX &&
    Math.abs(sense.dy) <= cfg.sightRangeY;
  if (!sees) {
    state.mode = 'idle';
    return;
  }

  out.facing = sense.dx >= 0 ? 1 : -1;
  const distX = Math.abs(sense.dx);

  const retreatBlocked = sense.wallBehind || sense.ledgeBehind;
  const canShoot = !cooling && sense.attackAllowed && Math.abs(sense.dy) <= cfg.shootRangeY;

  if (distX < cfg.minDistanceX && !retreatBlocked) {
    out.velX = -out.facing * cfg.retreatSpeed;
    state.mode = cooling ? 'cooldown' : 'reposition';
  } else if (distX < cfg.minDistanceX) {
    // Encurralado (parede ou beira atrás): não adianta recuar, então atira mesmo assim.
    if (canShoot) {
      out.startAttack = true;
      state.mode = 'aim';
    } else {
      state.mode = cooling ? 'cooldown' : 'idle';
    }
  } else if (cooling) {
    state.mode = 'cooldown';
  } else if (distX > cfg.maxDistanceX) {
    if (sense.wallAhead || sense.ledgeAhead) {
      state.mode = 'idle';
    } else {
      out.velX = out.facing * cfg.approachSpeed;
      state.mode = 'reposition';
    }
  } else if (canShoot) {
    out.startAttack = true;
    state.mode = 'aim';
  } else {
    state.mode = 'idle';
  }
}

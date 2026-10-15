import type { AttackPhase } from '../attack';
import { resetAiOutput, type AiOutput, type AiSense } from './types';

/** Arqueiro que se desloca aos pulos (ex.: Sapo Peçonhento). */
export type HopperMode = 'idle' | 'hop' | 'rest' | 'aim' | 'cooldown';

export interface HopperConfig {
  /** Enxerga o alvo se |dx| <= sightRangeX e |dy| <= sightRangeY. */
  sightRangeX: number;
  sightRangeY: number;
  /** Faixa ideal de tiro: perto demais recua, longe demais se aproxima. */
  minDistanceX: number;
  maxDistanceX: number;
  /** Velocidade horizontal (px/s) durante o pulo. */
  hopSpeed: number;
  /** Velocidade vertical do pulo (negativa = para cima), entregue em `out.jumpVelocity`. */
  hopVelocity: number;
  /** Descanso parado no chão entre dois pulos de deslocamento. */
  restMs: number;
  /** Ao patrulhar (sem ver o alvo): intervalo entre pulinhos curtos. */
  patrolHopMs: number;
  /** Pausa, parado, depois de atirar. */
  shootCooldownMs: number;
}

/**
 * `timerMs` tem um sentido por modo: tempo restante em 'rest' e 'cooldown'; tempo decorrido
 * esperando o próximo pulinho em 'idle'.
 */
export interface HopperState {
  mode: HopperMode;
  timerMs: number;
  /** Direção do pulo em curso (-1 ou 1). Na patrulha, também a direção em que o sapo anda. */
  dir: number;
  /** Fase do ataque no frame anterior, para detectar o disparo e o fim do golpe. */
  prevPhase: AttackPhase;
  /** Velocidade horizontal do pulo em curso (px/s); 0 fora do pulo. */
  speed: number;
}

/** O pulinho de patrulha é mais manso: esta fração da velocidade horizontal normal. */
const PATROL_SPEED_FACTOR = 0.5;

export function createHopper(): HopperState {
  return { mode: 'idle', timerMs: 0, dir: 1, prevPhase: 'idle', speed: 0 };
}

function startHop(
  state: HopperState,
  out: AiOutput,
  dir: number,
  speed: number,
  cfg: HopperConfig,
): void {
  state.mode = 'hop';
  state.dir = dir;
  state.speed = speed;
  out.jumpVelocity = cfg.hopVelocity;
  out.velX = dir * speed;
}

/**
 * Decide o frame do sapo. Muta `state` e `out`; não aloca nada.
 * - Com ataque em andamento: parado, virado para onde estava, e `fire` sai uma única vez, no
 *   frame em que a preparação termina. Ao fim do golpe entra em cooldown (parado).
 * - No ar: mantém a velocidade horizontal do pulo; não decide nem atira. Ao pousar, descansa.
 * - No chão, sem ver o alvo: a cada `patrolHopMs` dá um pulinho para um lado livre.
 * - No chão, vendo o alvo: recua (perto demais) ou avança (longe demais) aos pulos e, na faixa
 *   ideal, pede o ataque se o bando permitir.
 */
export function updateHopper(
  state: HopperState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: HopperConfig,
): void {
  resetAiOutput(out);
  // dt negativo ou NaN nunca faz timer andar para trás.
  const dt = dtMs > 0 ? dtMs : 0;

  const prev = state.prevPhase;
  const phase = sense.attackPhase;
  state.prevPhase = phase;
  // A entidade iniciou o ataque: mira travada até o fim do golpe.
  if (phase !== 'idle') {
    state.mode = 'aim';
    state.speed = 0;
    // Só no primeiro frame do golpe o sapo ainda se vira para o alvo.
    if (prev === 'idle' && sense.targetAlive) out.facing = sense.dx >= 0 ? 1 : -1;
    // O disparo sai uma única vez, ao sair da preparação (mesmo que um dt grande pule a fase ativa)
    const beforeShot = prev === 'idle' || prev === 'windup';
    if (beforeShot && (phase === 'active' || phase === 'recovery')) out.fire = true;
    return;
  }

  // Timer recém-armado neste frame: ainda não desconta o dt.
  let fresh = false;
  if (prev !== 'idle') {
    // O golpe acabou de terminar: pausa parado antes do próximo tiro.
    state.mode = 'cooldown';
    state.timerMs = cfg.shootCooldownMs;
    state.speed = 0;
    fresh = true;
  }

  const face = sense.dx >= 0 ? 1 : -1;
  const sees =
    sense.targetAlive &&
    Math.abs(sense.dx) <= cfg.sightRangeX &&
    Math.abs(sense.dy) <= cfg.sightRangeY;

  // No ar: só segue a trajetória do pulo (ou da queda). De costas se estiver recuando.
  if (!sense.grounded) {
    state.mode = 'hop';
    out.velX = state.dir * state.speed;
    out.facing = sees ? face : state.dir;
    return;
  }

  if (state.mode === 'hop') {
    // Pousou: descansa antes de decidir de novo.
    state.mode = 'rest';
    state.timerMs = cfg.restMs;
    state.speed = 0;
    fresh = true;
  }

  // Descanso e cooldown: parado, de olho no alvo, até o timer zerar (aí já decide neste frame).
  if (state.mode === 'rest' || state.mode === 'cooldown') {
    if (!fresh) state.timerMs = Math.max(0, state.timerMs - dt);
    if (state.timerMs > 0) {
      if (sees) out.facing = face;
      return;
    }
  }

  if (!sees) {
    // Patrulha: o timer conta o tempo parado desde que entrou em 'idle' (o frame da entrada,
    // que ainda pertence ao descanso/cooldown, não conta).
    if (state.mode !== 'idle') {
      state.mode = 'idle';
      state.timerMs = 0;
    } else {
      state.timerMs += dt;
    }
    if (state.timerMs < cfg.patrolHopMs) return;

    // Parede/beira à frente: dá meia-volta, desde que o outro lado também esteja livre.
    let dir = state.dir;
    if (sense.wallAhead || sense.ledgeAhead) {
      dir = -dir;
      if (sense.wallBehind || sense.ledgeBehind) return; // espremido dos dois lados: espera
    }
    state.timerMs = 0;
    out.facing = dir;
    startHop(state, out, dir, cfg.hopSpeed * PATROL_SPEED_FACTOR, cfg);
    return;
  }

  out.facing = face;
  const distX = Math.abs(sense.dx);

  if (distX < cfg.minDistanceX) {
    const dir = -face;
    if (!sense.wallBehind && !sense.ledgeBehind) {
      startHop(state, out, dir, cfg.hopSpeed, cfg);
      return;
    }
    // Encurralado (parede ou beira atrás): não adianta recuar, então atira mesmo assim.
  } else if (distX > cfg.maxDistanceX) {
    if (!sense.wallAhead && !sense.ledgeAhead) {
      startHop(state, out, face, cfg.hopSpeed, cfg);
      return;
    }
    state.mode = 'idle';
    state.timerMs = 0;
    return;
  }

  // Faixa ideal (ou encurralado): pede o tiro se o bando deixar e o alvo estiver à altura.
  if (sense.attackAllowed && Math.abs(sense.dy) <= cfg.sightRangeY) {
    out.startAttack = true;
    state.mode = 'aim';
  } else {
    state.mode = 'idle';
  }
  state.timerMs = 0;
}

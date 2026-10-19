import type { HeroState } from '../data/hero';
import type { AttackPhase } from './attack';

export interface HeroAnimInput {
  grounded: boolean;
  velX: number;
  velY: number;
  rolling: boolean;
  attackPhase: AttackPhase;
  stunned: boolean;
  dead: boolean;
  /** Acabou de pousar de uma queda (o quadro de pouso ainda está no ar). */
  landing: boolean;
  /** Acabou de parar de correr (a freada ainda dura um instante). */
  braking: boolean;
}

/** Limiares de velocidade vertical (px/s) do impulso e da queda rápida. */
export interface AirFastThresholds {
  launch: number;
  plunge: number;
}

/**
 * Escolhe o estado de animação do herói. Prioridade: morte, dano, rolagem, ataque,
 * ar (impulso, pulo, topo, queda), pouso, corrida, freada, parado. Roda por frame: não aloca nada.
 */
export function heroAnimState(
  input: HeroAnimInput,
  runThreshold: number,
  apexThreshold = 0,
  fast: AirFastThresholds | null = null,
): HeroState {
  if (input.dead) return 'dead';
  if (input.stunned) return 'hurt';
  if (input.rolling) return 'roll';

  switch (input.attackPhase) {
    case 'windup':
      return 'windup';
    case 'active':
      return 'swing';
    case 'recovery':
      return 'recover';
    default:
      break;
  }

  if (!input.grounded) {
    if (Math.abs(input.velY) < apexThreshold) return 'apex';
    if (input.velY < 0) return fast && input.velY < -fast.launch ? 'launch' : 'jump';
    return fast && input.velY > fast.plunge ? 'plunge' : 'fall';
  }
  if (input.landing) return 'land';
  if (Math.abs(input.velX) > runThreshold) return 'run';
  return input.braking ? 'brake' : 'idle';
}

/**
 * Velocidade de reprodução da corrida: proporcional à velocidade horizontal (1 na velocidade normal
 * de andar `refSpeed`), limitada a [min, max]. Roda por frame: não aloca nada.
 */
export function runAnimScale(velX: number, refSpeed: number, min: number, max: number): number {
  if (refSpeed <= 0) return 1;
  return Math.min(max, Math.max(min, Math.abs(velX) / refSpeed));
}

/**
 * Índice do quadro de uma fase do golpe pelo andamento dela: a fase de `count` quadros passa por
 * todos, na ordem, ao longo de `durationMs`. Roda por frame: não aloca nada.
 */
export function attackFrameIndex(count: number, elapsedMs: number, durationMs: number): number {
  if (count <= 1 || durationMs <= 0) return 0;
  const progress = Math.min(0.999, Math.max(0, elapsedMs / durationMs));
  return Math.floor(progress * count);
}

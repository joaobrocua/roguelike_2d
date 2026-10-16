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
}

/**
 * Escolhe o estado de animação do herói. Prioridade: morte, dano, rolagem, ataque,
 * ar (pulo/queda), corrida, parado. Roda por frame: não aloca nada.
 */
export function heroAnimState(
  input: HeroAnimInput,
  runThreshold: number,
  apexThreshold = 0,
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
    return input.velY < 0 ? 'jump' : 'fall';
  }
  if (input.landing) return 'land';
  if (Math.abs(input.velX) > runThreshold) return 'run';
  return 'idle';
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

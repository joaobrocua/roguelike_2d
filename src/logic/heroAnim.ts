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
}

/**
 * Escolhe o estado de animação do herói. Prioridade: morte, dano, rolagem, ataque,
 * ar (pulo/queda), corrida, parado. Roda por frame: não aloca nada.
 */
export function heroAnimState(input: HeroAnimInput, runThreshold: number): HeroState {
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

  if (!input.grounded) return input.velY < 0 ? 'jump' : 'fall';
  if (Math.abs(input.velX) > runThreshold) return 'run';
  return 'idle';
}

import type { AttackPhase } from './attack';

export type EnemyAnimState = 'idle' | 'walk' | 'windup' | 'strike' | 'recover' | 'hurt' | 'dead';

export interface EnemyAnimInput {
  velX: number;
  velY: number;
  flying: boolean;
  attackPhase: AttackPhase;
  stunned: boolean;
  dead: boolean;
}

/**
 * Escolhe o estado de animação de um inimigo. Prioridade: morte, dano, ataque,
 * movimento (voadores consideram também a velocidade vertical), parado.
 * Roda por frame: não aloca nada.
 */
export function enemyAnimState(input: EnemyAnimInput, walkThreshold: number): EnemyAnimState {
  if (input.dead) return 'dead';
  if (input.stunned) return 'hurt';

  switch (input.attackPhase) {
    case 'windup':
      return 'windup';
    case 'active':
      return 'strike';
    case 'recovery':
      return 'recover';
    default:
      break;
  }

  if (Math.abs(input.velX) > walkThreshold) return 'walk';
  if (input.flying && Math.abs(input.velY) > walkThreshold) return 'walk';
  return 'idle';
}

/** Chave da animação no Phaser, ex.: `bat-walk`. */
export function enemyAnimKey(enemyId: string, state: EnemyAnimState): string {
  return `${enemyId}-${state}`;
}

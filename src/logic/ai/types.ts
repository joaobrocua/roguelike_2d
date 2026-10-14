import type { AttackPhase } from '../attack';

/**
 * O que um inimigo "percebe" neste frame. A camada Phaser preenche e a IA (pura) decide.
 * Posições relativas: dx/dy = (alvo - inimigo), em pixels; dy > 0 significa alvo abaixo.
 */
export interface AiSense {
  dx: number;
  dy: number;
  targetAlive: boolean;
  grounded: boolean;
  /** Parede à frente (na direção em que o inimigo olha). */
  wallAhead: boolean;
  /** Sem chão à frente: seguir em frente significaria cair. */
  ledgeAhead: boolean;
  /** Parede ou beira ATRÁS do inimigo (recuar seria bater ou cair). */
  wallBehind: boolean;
  ledgeBehind: boolean;
  /** Fase do ataque do próprio inimigo ('idle' se não está atacando). */
  attackPhase: AttackPhase;
  /** false quando o bando não deixa este inimigo atacar agora (ver pack.ts). */
  attackAllowed: boolean;
}

/** Decisão da IA para o frame. A entidade traduz isto em velocidade, ataque e disparo. */
export interface AiOutput {
  /** Velocidade horizontal desejada, em px/s (negativa = esquerda). */
  velX: number;
  /** Velocidade vertical desejada, em px/s; só vale se `controlsY` (voadores e mergulhos). */
  velY: number;
  controlsY: boolean;
  /** -1 (esquerda) ou 1 (direita). Persiste entre frames. */
  facing: number;
  /** Pedido para iniciar o ataque; a entidade só inicia se `attackPhase === 'idle'`. */
  startAttack: boolean;
  /** Arqueiro: soltar o projétil neste frame. */
  fire: boolean;
}

export function createAiOutput(): AiOutput {
  return { velX: 0, velY: 0, controlsY: false, facing: 1, startAttack: false, fire: false };
}

/** Zera a decisão do frame, mantendo `facing`. As funções de IA chamam isto no começo. */
export function resetAiOutput(out: AiOutput): void {
  out.velX = 0;
  out.velY = 0;
  out.controlsY = false;
  out.startAttack = false;
  out.fire = false;
}

export function createAiSense(): AiSense {
  return {
    dx: 0,
    dy: 0,
    targetAlive: true,
    grounded: true,
    wallAhead: false,
    ledgeAhead: false,
    wallBehind: false,
    ledgeBehind: false,
    attackPhase: 'idle',
    attackAllowed: true,
  };
}

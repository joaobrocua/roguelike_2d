export type AttackPhase = 'idle' | 'windup' | 'active' | 'recovery';

/** Caixa de acerto, relativa ao atacante (o lado é decidido pela camada Phaser). */
export interface HitboxConfig {
  width: number;
  height: number;
  offsetY: number;
}

/** O mínimo que o alvo precisa saber de um golpe (também usado por projéteis). */
export interface HitData {
  damage: number;
  knockbackX: number;
  knockbackY: number;
  /** Tempo de atordoamento do alvo (ms); se omitido, vale o hit stun padrão do alvo. */
  stunMs?: number;
}

/** Projétil (flecha do arqueiro, raio do Tomo): voo em linha reta com o golpe que ele causa. */
export interface ProjectileData extends HitData {
  speed: number;
  lifeMs: number;
  width: number;
  height: number;
  /** Altura da saída, a partir do centro de quem atira. */
  spawnOffsetY: number;
}

export interface AttackConfig extends HitData {
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitbox: HitboxConfig;
}

export interface AttackState {
  phase: AttackPhase;
  /** Tempo decorrido dentro da fase atual. */
  elapsedMs: number;
  /** Identifica o golpe em curso; um alvo só deve ser atingido uma vez por `swingId`. */
  swingId: number;
  /** Marcador livre para a camada Phaser (ex.: "este golpe já foi resolvido"). */
  resolved: boolean;
}

/**
 * Próximo id de golpe. É o ÚNICO estado compartilhado do módulo: garante que dois
 * ataques quaisquer (de entidades diferentes) nunca reutilizem o mesmo `swingId`.
 */
let nextSwingId = 1;

export function createAttackState(): AttackState {
  return { phase: 'idle', elapsedMs: 0, swingId: 0, resolved: false };
}

/** Inicia um golpe se estiver parado. Retorna true se começou. */
export function startAttack(state: AttackState): boolean {
  if (state.phase !== 'idle') return false;
  state.phase = 'windup';
  state.elapsedMs = 0;
  state.resolved = false;
  state.swingId = nextSwingId++;
  return true;
}

function phaseDuration(phase: AttackPhase, cfg: AttackConfig): number {
  switch (phase) {
    case 'windup':
      return cfg.windupMs;
    case 'active':
      return cfg.activeMs;
    case 'recovery':
      return cfg.recoveryMs;
    default:
      return 0;
  }
}

function nextPhase(phase: AttackPhase): AttackPhase {
  switch (phase) {
    case 'windup':
      return 'active';
    case 'active':
      return 'recovery';
    default:
      return 'idle';
  }
}

/**
 * Avança windup -> active -> recovery -> idle. O tempo que sobra ao fechar uma fase
 * é levado para a próxima, então um dt grande pode atravessar várias fases.
 * Fases de duração 0 são puladas sem travar (o laço sempre avança a fase e são só três).
 * Em idle não faz nada. Muta `state`; não aloca nada.
 */
export function updateAttack(state: AttackState, dtMs: number, cfg: AttackConfig): void {
  if (state.phase === 'idle') return;

  state.elapsedMs += Math.max(0, dtMs);

  while (state.phase !== 'idle') {
    const duration = phaseDuration(state.phase, cfg);
    if (state.elapsedMs < duration) return;
    state.elapsedMs -= duration;
    state.phase = nextPhase(state.phase);
  }
  // Chegou a idle: descarta qualquer excedente.
  state.elapsedMs = 0;
}

/** Interrompe o golpe (ex.: tomou dano ou rolou) e volta a idle. */
export function cancelAttack(state: AttackState): void {
  state.phase = 'idle';
  state.elapsedMs = 0;
}

/** A hitbox só causa dano na fase ativa. */
export function isHitboxActive(state: AttackState): boolean {
  return state.phase === 'active';
}

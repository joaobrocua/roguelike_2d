import { resetAiOutput, type AiOutput, type AiSense } from './types';

export type BossAttackKind = 'slam' | 'lunge' | 'quake';
export type BossMode = 'intro' | 'approach' | 'attack' | 'cooldown' | 'phaseChange';

export interface BossConfig {
  /** px/s andando na fase 1. */
  walkSpeed: number;
  /** Multiplicador de velocidade (andar e investida) na fase 2. */
  phase2SpeedMult: number;
  /** Fração de vida (0..1): ao chegar nela ou abaixo, entra na fase 2. */
  phase2Threshold: number;
  /** |dx| <= isto: alcance curto (golpe 'slam' ou 'lunge'). */
  closeRangeX: number;
  /** |dx| <= isto (e > closeRangeX): só 'lunge'; acima disso o chefe anda até o jogador. */
  midRangeX: number;
  /** Pausa depois de um ataque (fase 1). */
  attackCooldownMs: number;
  /** Multiplica a pausa na fase 2 (ex.: 0.6). */
  phase2CooldownMult: number;
  /** px/s na direção de facing na fase 'active' do 'lunge' (x phase2SpeedMult na fase 2). */
  lungeSpeed: number;
  /** Fase 2: chance (0..1) de escolher 'quake' ao iniciar qualquer ataque. */
  quakeChance: number;
  /** Parado no começo (apresentação), sem agir. */
  introMs: number;
  /** Parado "rugindo" ao entrar na fase 2. */
  phaseChangeMs: number;
}

/**
 * `timerMs` é o tempo restante do modo atual (intro, phaseChange, cooldown) ou a pausa
 * que ainda falta antes de pedir o próximo ataque (approach).
 * `attackKind` continua o último golpe escolhido até o próximo (a entidade lê para aplicá-lo).
 */
export interface BossState {
  mode: BossMode;
  timerMs: number;
  attackKind: BossAttackKind;
  phase: 1 | 2;
}

export interface BossSense extends AiSense {
  /** Vida atual / vida máxima (0..1). */
  hpFraction: number;
}

/** No alcance curto, abaixo desta chance sai 'slam'; do contrário, 'lunge'. */
const SLAM_CHANCE = 0.6;

export function createBoss(introMs: number): BossState {
  return { mode: 'intro', timerMs: introMs, attackKind: 'slam', phase: 1 };
}

function abs(n: number): number {
  return n < 0 ? -n : n;
}

function faceTarget(out: AiOutput, sense: AiSense): void {
  // Alvo morto: a posição relativa é irrelevante, mantém o facing.
  if (sense.targetAlive) out.facing = sense.dx >= 0 ? 1 : -1;
}

function pickAttack(
  state: BossState,
  sense: BossSense,
  cfg: BossConfig,
  rng: () => number,
): BossAttackKind {
  if (state.phase === 2 && rng() < cfg.quakeChance) return 'quake';
  if (abs(sense.dx) <= cfg.closeRangeX) return rng() < SLAM_CHANCE ? 'slam' : 'lunge';
  return 'lunge';
}

function updateApproach(
  state: BossState,
  out: AiOutput,
  sense: BossSense,
  dt: number,
  cfg: BossConfig,
  rng: () => number,
): void {
  // A entidade iniciou o golpe: passa a seguir as fases dele.
  if (sense.attackPhase !== 'idle') {
    state.mode = 'attack';
    state.timerMs = 0;
    return;
  }
  if (!sense.targetAlive) return;

  if (abs(sense.dx) > cfg.midRangeX) {
    const velMult = state.phase === 2 ? cfg.phase2SpeedMult : 1;
    out.velX = out.facing * cfg.walkSpeed * velMult;
    return;
  }

  if (state.timerMs <= 0) {
    if (sense.attackAllowed) {
      state.attackKind = pickAttack(state, sense, cfg, rng);
      out.startAttack = true;
    }
    return;
  }
  state.timerMs = Math.max(0, state.timerMs - dt);
}

function updateAttack(state: BossState, out: AiOutput, sense: BossSense, cfg: BossConfig): void {
  if (sense.attackPhase === 'idle') {
    state.mode = 'cooldown';
    state.timerMs = cfg.attackCooldownMs * (state.phase === 2 ? cfg.phase2CooldownMult : 1);
    return;
  }
  // facing travado; só a investida avança, e só na fase ativa.
  if (sense.attackPhase === 'active' && state.attackKind === 'lunge' && sense.targetAlive) {
    const velMult = state.phase === 2 ? cfg.phase2SpeedMult : 1;
    out.velX = out.facing * cfg.lungeSpeed * velMult;
  }
}

/** Desconta o timer dos modos parados; ao zerar, segue para 'approach' (pronto para atacar). */
function tickToApproach(state: BossState, dt: number): void {
  state.timerMs = Math.max(0, state.timerMs - dt);
  if (state.timerMs > 0) return;
  state.mode = 'approach';
  state.timerMs = 0;
}

/**
 * IA do chefe "Guardião Partido": apresentação, aproximação, ataque (slam/lunge/quake),
 * pausa e mudança para a fase 2. Muta `state` e `out`; não aloca nada.
 * `out.facing` persiste entre frames; `rng` devolve valores em [0, 1).
 */
export function updateBoss(
  state: BossState,
  out: AiOutput,
  sense: BossSense,
  dtMs: number,
  cfg: BossConfig,
  rng: () => number,
): void {
  resetAiOutput(out);
  // dt negativo ou zero nunca faz timer andar para trás.
  const dt = dtMs > 0 ? dtMs : 0;

  if (state.mode !== 'attack') faceTarget(out, sense);

  // Só troca de fase fora de um golpe; se estiver no meio de um, espera ele acabar.
  if (
    state.phase === 1 &&
    sense.hpFraction <= cfg.phase2Threshold &&
    sense.attackPhase === 'idle'
  ) {
    state.phase = 2;
    state.mode = 'phaseChange';
    state.timerMs = cfg.phaseChangeMs;
    return;
  }

  switch (state.mode) {
    case 'intro':
    case 'phaseChange':
      tickToApproach(state, dt);
      break;
    case 'approach':
      updateApproach(state, out, sense, dt, cfg, rng);
      break;
    case 'attack':
      updateAttack(state, out, sense, cfg);
      break;
    case 'cooldown':
      tickToApproach(state, dt);
      break;
  }
}

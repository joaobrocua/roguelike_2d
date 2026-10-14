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
  /** Pulo curto sobre um obstáculo à frente: velocidade vertical (negativa) e horizontal no ar. */
  hopVelocity: number;
  hopSpeed: number;
  /** Pulo alto para alcançar quem está numa plataforma: velocidade vertical e horizontal no ar. */
  climbVelocity: number;
  climbSpeed: number;
  /** O alvo precisa estar pelo menos isto (px) acima, e a no máximo `climbRangeX` de lado. */
  climbMinDy: number;
  climbRangeX: number;
  /** Salto comprido para fechar a distância: velocidades e o quão longe o alvo precisa estar. */
  leapVelocity: number;
  leapSpeed: number;
  leapMinDx: number;
  /** Pausa entre um salto comprido e outro (varia um pouco; na fase 2 é menor). */
  leapCooldownMs: number;
  /** Pausa mínima depois de qualquer pulo, antes de outro. */
  jumpCooldownMs: number;
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
  /** Pausa restante antes de poder pular de novo. */
  jumpCooldownMs: number;
  /** Velocidade horizontal do salto em andamento (px/s, sem sinal). */
  airSpeed: number;
}

export interface BossSense extends AiSense {
  /** Vida atual / vida máxima (0..1). */
  hpFraction: number;
}

/** No alcance curto, abaixo desta chance sai 'slam'; do contrário, 'lunge'. */
const SLAM_CHANCE = 0.6;

/** Um obstáculo só vale um pulo se o alvo está além de uma fração do alcance curto (não pula na cara dele). */
const OBSTACLE_MIN_DX_FRACTION = 0.4;

export function createBoss(introMs: number): BossState {
  return {
    mode: 'intro',
    timerMs: introMs,
    attackKind: 'slam',
    phase: 1,
    jumpCooldownMs: 0,
    airSpeed: 0,
  };
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

/** Dispara um pulo: velocidade vertical pedida e velocidade horizontal que o salto mantém. */
function launch(
  state: BossState,
  out: AiOutput,
  velocity: number,
  speed: number,
  cooldownMs: number,
  cfg: BossConfig,
): void {
  const speedMult = state.phase === 2 ? cfg.phase2SpeedMult : 1;
  out.jumpVelocity = velocity;
  state.airSpeed = speed * speedMult;
  out.velX = out.facing * state.airSpeed;
  state.jumpCooldownMs = cooldownMs;
}

/**
 * Pulos do chefe para não ficar preso nem longe do jogador: pula o obstáculo que o barra, sobe
 * numa plataforma até quem está nela e, de longe, dá um salto comprido para chegar mais rápido.
 * Devolve true se pulou neste frame.
 */
function tryJump(
  state: BossState,
  out: AiOutput,
  sense: BossSense,
  cfg: BossConfig,
  rng: () => number,
): boolean {
  if (state.jumpCooldownMs > 0 || !sense.grounded) return false;
  const adx = abs(sense.dx);
  const above = -sense.dy; // quanto o alvo está acima do chefe (px)
  // 1) Alvo numa plataforma logo acima: pulo alto
  if (above >= cfg.climbMinDy && adx <= cfg.climbRangeX) {
    launch(state, out, cfg.climbVelocity, cfg.climbSpeed, cfg.jumpCooldownMs, cfg);
    return true;
  }
  // 2) Obstáculo à frente com o alvo do outro lado: pula (alto, se o alvo também está acima)
  if (sense.wallAhead && adx > cfg.closeRangeX * OBSTACLE_MIN_DX_FRACTION) {
    const high = above >= cfg.climbMinDy * 0.5;
    const velocity = high ? cfg.climbVelocity : cfg.hopVelocity;
    launch(state, out, velocity, cfg.hopSpeed, cfg.jumpCooldownMs, cfg);
    return true;
  }
  // 3) Alvo longe: salto comprido (a pausa varia um pouco para não ficar previsível)
  if (adx >= cfg.leapMinDx) {
    const cooldown =
      cfg.leapCooldownMs * (0.7 + 0.6 * rng()) * (state.phase === 2 ? cfg.phase2CooldownMult : 1);
    launch(
      state,
      out,
      cfg.leapVelocity,
      cfg.leapSpeed,
      Math.max(cooldown, cfg.jumpCooldownMs),
      cfg,
    );
    return true;
  }
  return false;
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

  // No ar: segue o salto (a velocidade horizontal foi decidida na decolagem)
  if (!sense.grounded) {
    out.velX = out.facing * state.airSpeed;
    return;
  }
  state.airSpeed = 0;

  if (tryJump(state, out, sense, cfg, rng)) return;

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
  state.jumpCooldownMs = Math.max(0, state.jumpCooldownMs - dt);

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

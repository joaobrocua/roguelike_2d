import { resetAiOutput, type AiOutput, type AiSense } from './types';

export type FlyerMode = 'hover' | 'dive' | 'cooldown';

export interface FlyerConfig {
  /** Enxerga o alvo se |dx| <= sightRangeX e |dy| <= sightRangeY. */
  sightRangeX: number;
  sightRangeY: number;
  /** Altura em que quer ficar ACIMA do alvo (ponto desejado: alvo.y - hoverHeight). */
  hoverHeight: number;
  /** Velocidade máxima (px/s) ao se posicionar. */
  hoverSpeed: number;
  /** Amplitude (px/s) da oscilação horizontal senoidal somada à velocidade. */
  swayAmplitude: number;
  swayPeriodMs: number;
  /** Só pode iniciar o mergulho se |dx| <= isto. */
  diveTriggerRangeX: number;
  /** Pausa depois do mergulho. */
  diveCooldownMs: number;
  /** Velocidade (px/s) na fase 'active' do ataque. */
  diveSpeed: number;
  /** Velocidade (px/s) subindo na fase 'recovery'. */
  riseSpeed: number;
}

export interface FlyerState {
  mode: FlyerMode;
  /** Tempo restante do cooldown pós-mergulho. */
  timerMs: number;
  /** Relógio próprio, só para a fase do balanço. */
  clockMs: number;
  /** Direção normalizada travada ao entrar em 'active'; (0,0) = ainda não travada. */
  diveDirX: number;
  diveDirY: number;
  /** Há quanto tempo (ms) o alvo está escondido pelo cenário (0 = à vista). */
  blindMs: number;
}

/** Ganho do posicionamento: velocidade proporcional ao erro, depois limitada por hoverSpeed. */
const POSITION_GAIN = 3;
/** Tolerância vertical (px) para considerar que já está na altura de mergulho. */
const DIVE_ALIGN_TOLERANCE = 12;

export function createFlyer(): FlyerState {
  return { mode: 'hover', timerMs: 0, clockMs: 0, diveDirX: 0, diveDirY: 0, blindMs: 0 };
}

/** Quanto (ms) ele continua se posicionando depois de perder o alvo de vista. */
const BLIND_GRACE_MS = 600;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/**
 * Decide o frame do Vulto. Muta `state` e `out`; não aloca nada.
 * hover: paira acima do alvo com balanço e pede o mergulho quando alinhado.
 * dive: acompanha as fases do ataque (windup parado, active em linha reta, recovery subindo).
 * cooldown: volta a se posicionar, mas sem pedir ataque até o timer zerar.
 */
export function updateFlyer(
  state: FlyerState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: FlyerConfig,
): void {
  const dt = Math.max(0, dtMs);
  resetAiOutput(out);
  out.controlsY = true;
  state.clockMs += dt;

  if (sense.attackPhase !== 'idle') {
    state.mode = 'dive';
    if (sense.attackPhase === 'windup') return; // telegrafia: parado, olhando para onde estava
    if (sense.attackPhase === 'active') {
      if (state.diveDirX === 0 && state.diveDirY === 0) {
        // Primeira vez em 'active': trava a direção até o alvo daquele instante.
        const len = Math.hypot(sense.dx, sense.dy);
        if (len > 0) {
          state.diveDirX = sense.dx / len;
          state.diveDirY = sense.dy / len;
        } else {
          state.diveDirX = out.facing >= 0 ? 1 : -1;
          state.diveDirY = 0;
        }
        if (state.diveDirX !== 0) out.facing = state.diveDirX > 0 ? 1 : -1;
      }
      out.velX = state.diveDirX * cfg.diveSpeed;
      out.velY = state.diveDirY * cfg.diveSpeed;
      return;
    }
    // recovery: sobe de volta
    out.velY = -cfg.riseSpeed;
    return;
  }

  if (state.mode === 'dive') {
    // O ataque acabou de terminar.
    state.mode = 'cooldown';
    state.timerMs = cfg.diveCooldownMs;
    state.diveDirX = 0;
    state.diveDirY = 0;
  } else if (state.mode === 'cooldown') {
    state.timerMs -= dt;
    if (state.timerMs <= 0) {
      state.timerMs = 0;
      state.mode = 'hover';
    }
  }

  // Perder o alvo de vista não o congela: segue se posicionando por um instante, sem atacar.
  state.blindMs = sense.targetVisible ? 0 : state.blindMs + dt;
  const sees =
    sense.targetAlive &&
    state.blindMs <= BLIND_GRACE_MS &&
    Math.abs(sense.dx) <= cfg.sightRangeX &&
    Math.abs(sense.dy) <= cfg.sightRangeY;
  if (!sees) return; // paira parado

  out.facing = sense.dx >= 0 ? 1 : -1;

  const errorY = sense.dy - cfg.hoverHeight;
  const sway =
    cfg.swayPeriodMs > 0
      ? cfg.swayAmplitude * Math.sin((2 * Math.PI * state.clockMs) / cfg.swayPeriodMs)
      : 0;
  out.velX = clamp(sense.dx * POSITION_GAIN, cfg.hoverSpeed) + sway;
  out.velY = clamp(errorY * POSITION_GAIN, cfg.hoverSpeed);

  if (
    state.mode === 'hover' &&
    state.timerMs <= 0 &&
    sense.attackAllowed &&
    sense.targetVisible &&
    Math.abs(sense.dx) <= cfg.diveTriggerRangeX &&
    Math.abs(errorY) <= DIVE_ALIGN_TOLERANCE
  ) {
    out.startAttack = true;
  }
}

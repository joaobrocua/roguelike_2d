import { resetAiOutput, type AiOutput, type AiSense } from './types';

/** Voador que espera de lado e no alto do alvo e depois cruza a sala em rasante (ex.: Corvo Carniceiro). */
export type StraferMode = 'perch' | 'pass' | 'cooldown';

export interface StraferConfig {
  /** Enxerga o alvo se |dx| <= sightRangeX e |dy| <= sightRangeY. */
  sightRangeX: number;
  sightRangeY: number;
  /** Altura em que espera ACIMA do alvo (ponto desejado: dy == perchHeight). */
  perchHeight: number;
  /** Distância horizontal (px) do alvo em que espera, do lado em que já está. */
  perchOffsetX: number;
  /** Velocidade máxima (px/s) ao se posicionar. */
  hoverSpeed: number;
  /**
   * Tolerâncias (px) para considerar que já está em posição de ataque: no horizontal vale qualquer
   * distância entre `minPassDx` e `perchOffsetX + alignToleranceX` (se uma parede o impede de
   * recuar até o ponto de espera, ele ataca mesmo assim, de mais perto); no vertical, `alignToleranceY`.
   */
  minPassDx: number;
  alignToleranceX: number;
  alignToleranceY: number;
  /** Velocidade horizontal (px/s) na fase 'active' do ataque. */
  passSpeed: number;
  /** Velocidade vertical máxima (px/s) na fase 'active': corrige a altura rumo ao alvo. */
  passSteerSpeed: number;
  /** Velocidade (px/s) subindo na fase 'recovery'. */
  riseSpeed: number;
  /** Pausa depois da passagem antes de poder atacar de novo. */
  cooldownMs: number;
  /** Oscilação vertical (px/s) somada ao posicionamento enquanto espera; 0 = sem. */
  swayAmplitude: number;
  swayPeriodMs: number;
}

export interface StraferState {
  mode: StraferMode;
  /** Tempo restante do cooldown pós-passagem. */
  timerMs: number;
  /** Relógio próprio, só para a fase do balanço. */
  clockMs: number;
  /** Sentido (-1 ou 1) travado ao entrar em 'active'; 0 = ainda não travado. */
  passDir: number;
  /** Há quanto tempo (ms) o alvo está escondido pelo cenário (0 = à vista). */
  blindMs: number;
}

/** Ganho do posicionamento: velocidade proporcional ao erro, depois limitada pela velocidade máxima. */
const POSITION_GAIN = 3;
/** Fração da velocidade da passagem com que o corvo ainda deriva adiante ao se recuperar. */
const RECOVERY_DRIFT_FACTOR = 0.25;

export function createStrafer(): StraferState {
  return { mode: 'perch', timerMs: 0, clockMs: 0, passDir: 0, blindMs: 0 };
}

/** Quanto (ms) ele continua se posicionando depois de perder o alvo de vista. */
const BLIND_GRACE_MS = 600;

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/**
 * Decide o frame do Corvo. Muta `state` e `out`; não aloca nada.
 * perch: espera de lado e no alto do alvo, com balanço, e pede a passagem quando alinhado.
 * pass: acompanha as fases do ataque (windup parado, active cruzando na altura do alvo,
 * recovery subindo e derivando adiante).
 * cooldown: volta a se posicionar, mas sem pedir ataque até o timer zerar.
 */
export function updateStrafer(
  state: StraferState,
  out: AiOutput,
  sense: AiSense,
  dtMs: number,
  cfg: StraferConfig,
): void {
  const dt = Math.max(0, dtMs);
  resetAiOutput(out);
  out.controlsY = true;
  state.clockMs += dt;

  if (sense.attackPhase !== 'idle') {
    state.mode = 'pass';
    if (sense.attackPhase === 'windup') return; // telegrafia: parado, olhando para onde estava
    if (sense.attackPhase === 'active') {
      if (state.passDir === 0) {
        // Primeira vez em 'active': trava o sentido até onde o alvo estava naquele instante.
        state.passDir = sense.dx >= 0 ? 1 : -1;
        out.facing = state.passDir;
      }
      out.velX = state.passDir * cfg.passSpeed;
      out.velY = clamp(sense.dy * POSITION_GAIN, cfg.passSteerSpeed);
      return;
    }
    // recovery: deriva devagar adiante e sobe
    out.velX = state.passDir * cfg.passSpeed * RECOVERY_DRIFT_FACTOR;
    out.velY = -cfg.riseSpeed;
    return;
  }

  if (state.mode === 'pass') {
    // O ataque acabou de terminar.
    state.mode = 'cooldown';
    state.timerMs = cfg.cooldownMs;
    state.passDir = 0;
  } else if (state.mode === 'cooldown') {
    state.timerMs -= dt;
    if (state.timerMs <= 0) {
      state.timerMs = 0;
      state.mode = 'perch';
    }
  }

  // Perder o alvo de vista (uma quina, uma coluna) não o congela: ele segue se posicionando por um
  // instante, mas só ataca com o alvo à vista.
  state.blindMs = sense.targetVisible ? 0 : state.blindMs + dt;
  const sees =
    sense.targetAlive &&
    state.blindMs <= BLIND_GRACE_MS &&
    Math.abs(sense.dx) <= cfg.sightRangeX &&
    Math.abs(sense.dy) <= cfg.sightRangeY;
  if (!sees) return; // espera parado

  out.facing = sense.dx >= 0 ? 1 : -1;

  // Fica do lado em que já está: alvo à direita (dx > 0) = corvo à esquerda.
  const side = sense.dx >= 0 ? -1 : 1;
  const errorX = sense.dx + side * cfg.perchOffsetX;
  const errorY = sense.dy - cfg.perchHeight;
  const sway =
    cfg.swayPeriodMs > 0
      ? cfg.swayAmplitude * Math.sin((2 * Math.PI * state.clockMs) / cfg.swayPeriodMs)
      : 0;
  out.velX = clamp(errorX * POSITION_GAIN, cfg.hoverSpeed);
  out.velY = clamp(errorY * POSITION_GAIN, cfg.hoverSpeed) + sway;

  if (
    state.mode === 'perch' &&
    state.timerMs <= 0 &&
    sense.attackAllowed &&
    sense.targetVisible &&
    Math.abs(sense.dx) >= cfg.minPassDx &&
    Math.abs(sense.dx) <= cfg.perchOffsetX + cfg.alignToleranceX &&
    Math.abs(errorY) <= cfg.alignToleranceY
  ) {
    out.startAttack = true;
  }
}

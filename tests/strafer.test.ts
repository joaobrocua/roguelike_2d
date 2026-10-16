import { describe, expect, it } from 'vitest';
import type { AttackPhase } from '../src/logic/attack';
import { CORVO_CARNICEIRO } from '../src/data/enemies';
import { createStrafer, updateStrafer, type StraferConfig } from '../src/logic/ai/strafer';
import { createAiOutput, createAiSense } from '../src/logic/ai/types';

// Os valores reais do Corvo Carniceiro (src/data/enemies.ts): o balanceamento muda, o teste acompanha.
const cfg: StraferConfig = CORVO_CARNICEIRO.ai;

// Sem balanço, para isolar o posicionamento.
const noSway: StraferConfig = { ...cfg, swayAmplitude: 0 };

function setup(dx: number, dy: number) {
  const state = createStrafer();
  const out = createAiOutput();
  const sense = createAiSense();
  sense.dx = dx;
  sense.dy = dy;
  return { state, out, sense };
}

describe('createStrafer', () => {
  it('começa em perch com tudo zerado', () => {
    expect(createStrafer()).toEqual({
      mode: 'perch',
      timerMs: 0,
      clockMs: 0,
      passDir: 0,
      blindMs: 0,
    });
  });
});

describe('sem alvo', () => {
  it('fora da visão (horizontal ou vertical) fica parado e não ataca', () => {
    const cases: Array<{ dx: number; dy: number }> = [
      { dx: cfg.sightRangeX + 1, dy: 34 },
      { dx: -(cfg.sightRangeX + 1), dy: 34 },
      { dx: 100, dy: cfg.sightRangeY + 1 },
      { dx: 100, dy: -(cfg.sightRangeY + 1) },
    ];
    for (const { dx, dy } of cases) {
      const { state, out, sense } = setup(dx, dy);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.velX).toBe(0);
      expect(out.velY).toBe(0);
      expect(out.controlsY).toBe(true);
      expect(out.startAttack).toBe(false);
    }
  });

  it('sem linha de visão nunca ataca, mesmo alinhado, e depois de um instante fica parado', () => {
    const { state, out, sense } = setup(114, 34);
    sense.targetVisible = false;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
    updateStrafer(state, out, sense, 700, cfg); // passou da memória curta
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('ao perder o alvo de vista segue se posicionando por um instante (não congela)', () => {
    const { state, out, sense } = setup(180, 80); // longe do ponto de espera, mas ao alcance da visão
    sense.targetVisible = false;
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).not.toBe(0);
    expect(out.velY).not.toBe(0);
  });

  it('ao voltar a ver o alvo a memória zera e ele ataca de novo', () => {
    const { state, out, sense } = setup(114, 34);
    sense.targetVisible = false;
    updateStrafer(state, out, sense, 700, cfg);
    sense.targetVisible = true;
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.blindMs).toBe(0);
    expect(out.startAttack).toBe(true);
  });

  it('alvo morto fica parado e não ataca, mesmo alinhado', () => {
    const { state, out, sense } = setup(114, 34);
    sense.targetAlive = false;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('enxerga exatamente no limite da visão', () => {
    const { state, out, sense } = setup(260, 120);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBeGreaterThan(0);
    expect(out.velY).toBeGreaterThan(0);
  });

  it('sem ver o alvo mantém o facing anterior', () => {
    const { state, out, sense } = setup(-999, 0);
    out.facing = 1;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.facing).toBe(1);
  });
});

describe('perch: posicionamento', () => {
  it('alvo à direita e longe: avança para a direita (limitado por hoverSpeed) e olha para ele', () => {
    const { state, out, sense } = setup(200, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(90);
    expect(out.velY).toBe(0);
    expect(out.controlsY).toBe(true);
  });

  it('alvo à esquerda e longe: avança para a esquerda e olha para ele', () => {
    const { state, out, sense } = setup(-200, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.facing).toBe(-1);
    expect(out.velX).toBe(-90);
  });

  it('perto demais do herói (alvo à direita): recua para a esquerda, mantendo o lado', () => {
    const { state, out, sense } = setup(40, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBe(-90); // errX = 40 - 100 = -60 -> -180, limitado a -90
    expect(out.facing).toBe(1);
  });

  it('perto demais do herói (alvo à esquerda): recua para a direita', () => {
    const { state, out, sense } = setup(-40, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBe(90);
    expect(out.facing).toBe(-1);
  });

  it('exatamente sobre o herói (dx = 0) conta como estar à esquerda', () => {
    const { state, out, sense } = setup(0, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBe(-90);
    expect(out.facing).toBe(1);
  });

  it('abaixo da altura de espera sobe; acima, desce (limitado por hoverSpeed)', () => {
    const above = setup(100, -20); // alvo acima do corvo: precisa subir bastante
    updateStrafer(above.state, above.out, above.sense, 16, noSway);
    expect(above.out.velY).toBe(-90);

    const below = setup(100, 120); // alvo muito abaixo: desce
    updateStrafer(below.state, below.out, below.sense, 16, noSway);
    expect(below.out.velY).toBe(90);
  });

  it('perto do ponto: velocidade proporcional ao erro (ganho 3)', () => {
    const { state, out, sense } = setup(110, 44); // errX = 10, errY = 10
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBeCloseTo(30);
    expect(out.velY).toBeCloseTo(30);
  });

  it('já no ponto de espera: parado', () => {
    const { state, out, sense } = setup(100, 34);
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
  });

  it('o balanço muda a velocidade vertical com o tempo', () => {
    const { state, out, sense } = setup(100, 34);
    updateStrafer(state, out, sense, 275, cfg); // clock 275 -> sin(pi/2) = 1
    const peak = out.velY;
    updateStrafer(state, out, sense, 550, cfg); // clock 825 -> sin(3pi/2) = -1
    const trough = out.velY;
    expect(peak).toBeCloseTo(14);
    expect(trough).toBeCloseTo(-14);
    expect(out.velX).toBe(0); // o balanço é só vertical
    expect(state.clockMs).toBe(825);
  });

  it('swayPeriodMs = 0 não gera NaN', () => {
    const { state, out, sense } = setup(110, 44);
    updateStrafer(state, out, sense, 16, { ...cfg, swayPeriodMs: 0 });
    expect(out.velY).toBeCloseTo(30);
  });
});

describe('pedido de ataque', () => {
  it('pede quando alinhado, sem cooldown e permitido', () => {
    const { state, out, sense } = setup(100, 34);
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(true);
    expect(state.mode).toBe('perch'); // só vira pass quando a entidade iniciar o ataque
  });

  it('funciona também com o herói à esquerda', () => {
    const { state, out, sense } = setup(-100, 34);
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(true);
  });

  it('aceita erro horizontal de até 14 px nos dois sentidos', () => {
    for (const dx of [86, 114]) {
      const { state, out, sense } = setup(dx, 34);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(true);
    }
  });

  it('não pede com o herói além do ponto de espera (mais de 14 px)', () => {
    for (const dx of [115, -115]) {
      const { state, out, sense } = setup(dx, 34);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(false);
    }
  });

  it('encostado numa parede, mais perto que o ponto de espera, ainda ataca (a partir de minPassDx)', () => {
    for (const dx of [85, 60, 50, -76]) {
      const { state, out, sense } = setup(dx, 34);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack, `dx ${dx}`).toBe(true);
    }
  });

  it('colado no herói (menos que minPassDx) recua em vez de atacar', () => {
    for (const dx of [49, 20, 0, -30]) {
      const { state, out, sense } = setup(dx, 34);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack, `dx ${dx}`).toBe(false);
    }
  });

  it('aceita erro vertical de até 12 px nos dois sentidos', () => {
    for (const dy of [22, 46]) {
      const { state, out, sense } = setup(100, dy);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(true);
    }
  });

  it('não pede com erro vertical acima de 12 px', () => {
    for (const dy of [21, 47]) {
      const { state, out, sense } = setup(100, dy);
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(false);
    }
  });

  it('não pede se o bando não permite', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackAllowed = false;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
  });

  it('não pede durante o cooldown', () => {
    const { state, out, sense } = setup(100, 34);
    state.mode = 'cooldown';
    state.timerMs = 500;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
  });
});

describe('passagem', () => {
  it('windup: fica parado e não pede outro ataque', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackPhase = 'windup';
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.mode).toBe('pass');
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.controlsY).toBe(true);
    expect(out.startAttack).toBe(false);
    expect(state.passDir).toBe(0);
  });

  it('windup: facing não muda mesmo se o alvo passa para o outro lado', () => {
    const { state, out, sense } = setup(100, 34);
    out.facing = 1;
    sense.attackPhase = 'windup';
    sense.dx = -200;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.facing).toBe(1);
  });

  it('active: trava o sentido para a direita e usa passSpeed', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.passDir).toBe(1);
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(230);
    expect(out.controlsY).toBe(true);
    expect(out.startAttack).toBe(false);
  });

  it('active: alvo à esquerda cruza para a esquerda e vira o facing', () => {
    const { state, out, sense } = setup(-100, 34);
    out.facing = 1;
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.passDir).toBe(-1);
    expect(out.facing).toBe(-1);
    expect(out.velX).toBe(-230);
  });

  it('active: o sentido continua travado mesmo que o alvo mude de lado', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    sense.dx = -500;
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.passDir).toBe(1);
    expect(out.velX).toBe(230);
    expect(out.facing).toBe(1);
  });

  it('active trava o sentido mesmo sem ter passado por windup (dt grande)', () => {
    const { state, out, sense } = setup(-50, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 100000, cfg);
    expect(state.passDir).toBe(-1);
    expect(out.velX).toBe(-230);
  });

  it('active: velY segue a altura do alvo, limitada por passSteerSpeed', () => {
    const max = cfg.passSteerSpeed;
    const cases: Array<{ dy: number; velY: number }> = [
      { dy: 100, velY: max }, // alvo bem abaixo: desce no máximo passSteerSpeed
      { dy: 10, velY: 30 }, // perto: proporcional (ganho 3)
      { dy: 0, velY: 0 }, // já na altura do alvo
      { dy: -40, velY: -max }, // alvo acima: sobe no máximo passSteerSpeed
    ];
    for (const { dy, velY } of cases) {
      const { state, out, sense } = setup(100, dy);
      sense.attackPhase = 'active';
      updateStrafer(state, out, sense, 16, cfg);
      expect(out.velY).toBeCloseTo(velY);
    }
  });

  it('recovery: sobe e deriva devagar adiante', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    sense.attackPhase = 'recovery';
    sense.dx = -20; // já cruzou o herói; o sentido continua o travado
    updateStrafer(state, out, sense, 16, cfg);
    expect(state.mode).toBe('pass');
    expect(out.velX).toBeCloseTo(57.5);
    expect(out.velY).toBe(-90);
    expect(out.facing).toBe(1);
    expect(out.controlsY).toBe(true);
    expect(out.startAttack).toBe(false);
  });

  it('recovery para a esquerda deriva para a esquerda', () => {
    const { state, out, sense } = setup(-100, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    sense.attackPhase = 'recovery';
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.velX).toBeCloseTo(-57.5);
    expect(out.facing).toBe(-1);
  });

  it('continua a passagem mesmo que o alvo morra ou saia da visão', () => {
    const { state, out, sense } = setup(100, 34);
    sense.attackPhase = 'active';
    updateStrafer(state, out, sense, 16, cfg);
    sense.targetAlive = false;
    sense.dx = 9999;
    sense.dy = 0;
    updateStrafer(state, out, sense, 16, cfg);
    expect(out.velX).toBe(230);
    expect(out.velY).toBe(0);
  });
});

describe('cooldown e retorno ao perch', () => {
  function finishPass() {
    const ctx = setup(100, 34);
    ctx.sense.attackPhase = 'active';
    updateStrafer(ctx.state, ctx.out, ctx.sense, 16, noSway);
    ctx.sense.attackPhase = 'recovery';
    updateStrafer(ctx.state, ctx.out, ctx.sense, 16, noSway);
    ctx.sense.attackPhase = 'idle';
    ctx.sense.dx = -100; // do outro lado do herói
    ctx.sense.dy = 34;
    return ctx;
  }

  it('ao voltar a idle entra em cooldown, destrava o sentido e arma o timer', () => {
    const { state, out, sense } = finishPass();
    updateStrafer(state, out, sense, 16, noSway);
    expect(state.mode).toBe('cooldown');
    expect(state.timerMs).toBe(900);
    expect(state.passDir).toBe(0);
  });

  it('no cooldown se posiciona como perch, mas não pede ataque', () => {
    const { state, out, sense } = finishPass();
    sense.dx = -200;
    sense.dy = 100;
    updateStrafer(state, out, sense, 16, noSway);
    expect(out.velX).toBe(-90);
    expect(out.velY).toBe(90);
    expect(out.facing).toBe(-1);
    expect(out.startAttack).toBe(false);
  });

  it('o timer cai com o tempo e, ao zerar, volta a perch e pode atacar', () => {
    const { state, out, sense } = finishPass();
    updateStrafer(state, out, sense, 16, noSway); // entra em cooldown
    updateStrafer(state, out, sense, 500, noSway);
    expect(state.mode).toBe('cooldown');
    expect(state.timerMs).toBe(400);
    expect(out.startAttack).toBe(false);
    updateStrafer(state, out, sense, 399, noSway);
    expect(state.mode).toBe('cooldown');
    expect(out.startAttack).toBe(false);
    updateStrafer(state, out, sense, 1, noSway);
    expect(state.mode).toBe('perch');
    expect(state.timerMs).toBe(0);
    expect(out.startAttack).toBe(true); // alinhado de novo: já pode atacar
  });

  it('dt grande encerra o cooldown de uma vez, sem timer negativo', () => {
    const { state, out, sense } = finishPass();
    updateStrafer(state, out, sense, 16, noSway);
    updateStrafer(state, out, sense, 1e9, noSway);
    expect(state.mode).toBe('perch');
    expect(state.timerMs).toBe(0);
  });

  it('o cooldown corre mesmo sem enxergar o alvo', () => {
    const { state, out, sense } = finishPass();
    updateStrafer(state, out, sense, 16, noSway);
    sense.dx = 5000;
    updateStrafer(state, out, sense, 1000, noSway);
    expect(state.mode).toBe('perch');
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('dt negativo é ignorado', () => {
    const { state, out, sense } = finishPass();
    updateStrafer(state, out, sense, 16, noSway);
    const clock = state.clockMs;
    updateStrafer(state, out, sense, -500, noSway);
    expect(state.timerMs).toBe(900);
    expect(state.clockMs).toBe(clock);
  });
});

describe('simulação do ciclo completo', () => {
  const FRAME_MS = 16;
  // Fases do ataque do corvo (a entidade é quem as conduz; aqui só as imitamos).
  const WINDUP_MS = CORVO_CARNICEIRO.attack.windupMs;
  const ACTIVE_MS = CORVO_CARNICEIRO.attack.activeMs;
  const RECOVERY_MS = CORVO_CARNICEIRO.attack.recoveryMs;

  it('chega ao ponto de espera, ataca, cruza o herói, entra em cooldown e espera de novo', () => {
    const state = createStrafer();
    const out = createAiOutput();
    const sense = createAiSense();
    // Herói parado na origem; o corvo começa à esquerda dele, acima e fora do ponto de espera.
    let x = -220;
    let y = -90;
    let phase: AttackPhase = 'idle';
    let phaseMs = 0;

    let attackFrames = 0;
    let xAtAttack = 0;
    let dyAtAttack = 0;
    let xAtActiveStart = 0;
    let xAtActiveEnd = 0;
    let sawCooldown = false;
    let secondAttackFrames = 0;

    for (let frame = 0; frame < 2000 && secondAttackFrames === 0; frame++) {
      sense.dx = -x;
      sense.dy = -y;
      sense.attackPhase = phase;
      updateStrafer(state, out, sense, FRAME_MS, cfg);
      x += (out.velX * FRAME_MS) / 1000;
      y += (out.velY * FRAME_MS) / 1000;

      if (phase === 'idle') {
        if (out.startAttack) {
          if (attackFrames === 0) {
            xAtAttack = x;
            dyAtAttack = -y;
          } else {
            secondAttackFrames = frame;
          }
          attackFrames++;
          phase = 'windup';
          phaseMs = 0;
        }
        if (state.mode === 'cooldown') sawCooldown = true;
        continue;
      }

      if (phase === 'active' && phaseMs === 0) xAtActiveStart = x;
      phaseMs += FRAME_MS;
      if (phase === 'windup' && phaseMs >= WINDUP_MS) {
        phase = 'active';
        phaseMs = 0;
      } else if (phase === 'active' && phaseMs >= ACTIVE_MS) {
        xAtActiveEnd = x;
        phase = 'recovery';
        phaseMs = 0;
      } else if (phase === 'recovery' && phaseMs >= RECOVERY_MS) {
        phase = 'idle';
      }
    }

    // Esperou no ponto (~100 px do herói, ~34 px acima) antes de atacar.
    expect(attackFrames).toBeGreaterThan(0);
    expect(Math.abs(xAtAttack + 100)).toBeLessThanOrEqual(cfg.alignToleranceX + 2);
    expect(Math.abs(dyAtAttack - cfg.perchHeight)).toBeLessThanOrEqual(cfg.alignToleranceY + 2);
    // A passagem (~120 px) cruza o herói: começa à esquerda e termina à direita dele.
    expect(xAtActiveStart).toBeLessThan(0);
    expect(xAtActiveEnd).toBeGreaterThan(0);
    expect(xAtActiveEnd - xAtActiveStart).toBeGreaterThan(100);
    // Depois do ataque houve cooldown, e o corvo voltou a esperar e a atacar (pelo outro lado).
    expect(sawCooldown).toBe(true);
    expect(secondAttackFrames).toBeGreaterThan(0);
    expect(state.mode).toBe('perch');
    expect(x).toBeGreaterThan(0);
    expect(Math.abs(x - 100)).toBeLessThanOrEqual(cfg.alignToleranceX + 2);
  });
});

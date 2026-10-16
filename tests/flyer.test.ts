import { describe, expect, it } from 'vitest';
import { createFlyer, updateFlyer, type FlyerConfig } from '../src/logic/ai/flyer';
import { createAiOutput, createAiSense } from '../src/logic/ai/types';

const cfg: FlyerConfig = {
  sightRangeX: 300,
  sightRangeY: 200,
  hoverHeight: 80,
  hoverSpeed: 100,
  swayAmplitude: 20,
  swayPeriodMs: 1000,
  diveTriggerRangeX: 40,
  diveCooldownMs: 1000,
  diveSpeed: 300,
  riseSpeed: 120,
};

// Sem balanço, para isolar o posicionamento.
const noSway: FlyerConfig = { ...cfg, swayAmplitude: 0 };

function setup(dx: number, dy: number) {
  const state = createFlyer();
  const out = createAiOutput();
  const sense = createAiSense();
  sense.dx = dx;
  sense.dy = dy;
  return { state, out, sense };
}

describe('visão tapada pelo cenário', () => {
  it('sem linha de visão nunca ataca, mesmo perto e alinhado, e depois de um instante paira parado', () => {
    const { state, out, sense } = setup(0, 80);
    sense.targetVisible = false;
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.startAttack).toBe(false);
    updateFlyer(state, out, sense, 700, noSway); // passou da memória curta
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('ao perder o alvo de vista segue se posicionando por um instante (não congela)', () => {
    const { state, out, sense } = setup(150, 200);
    sense.targetVisible = false;
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.velX).not.toBe(0);
    expect(out.velY).not.toBe(0);
  });

  it('com linha de visão volta a perseguir e a atacar', () => {
    const { state, out, sense } = setup(0, 80);
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.startAttack).toBe(true);
  });
});

describe('createFlyer', () => {
  it('começa em hover com tudo zerado', () => {
    expect(createFlyer()).toEqual({
      mode: 'hover',
      timerMs: 0,
      clockMs: 0,
      diveDirX: 0,
      diveDirY: 0,
      blindMs: 0,
    });
  });
});

describe('sem alvo', () => {
  it('fora da visão (horizontal ou vertical) paira parado e não ataca', () => {
    const cases: Array<{ dx: number; dy: number }> = [
      { dx: 301, dy: 80 },
      { dx: -301, dy: 80 },
      { dx: 0, dy: 201 },
      { dx: 0, dy: -201 },
    ];
    for (const { dx, dy } of cases) {
      const { state, out, sense } = setup(dx, dy);
      updateFlyer(state, out, sense, 16, cfg);
      expect(out.velX).toBe(0);
      expect(out.velY).toBe(0);
      expect(out.controlsY).toBe(true);
      expect(out.startAttack).toBe(false);
    }
  });

  it('alvo morto paira parado mesmo ao alcance', () => {
    const { state, out, sense } = setup(0, 80);
    sense.targetAlive = false;
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('enxerga exatamente no limite da visão', () => {
    const { state, out, sense } = setup(300, 200);
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.velX).toBeGreaterThan(0);
  });
});

describe('hover', () => {
  it('controla os dois eixos', () => {
    const { state, out, sense } = setup(100, 80);
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.controlsY).toBe(true);
  });

  it('alvo à direita e muito abaixo: vai para a direita e desce (limitado por hoverSpeed)', () => {
    const { state, out, sense } = setup(100, 200);
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(100);
    expect(out.velY).toBe(100);
  });

  it('alvo à esquerda e com altura sobrando: vai para a esquerda e sobe', () => {
    // dy = 0 (mesma altura) -> erro = -80: precisa subir até 80 acima do alvo.
    const { state, out, sense } = setup(-100, 0);
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.facing).toBe(-1);
    expect(out.velX).toBe(-100);
    expect(out.velY).toBe(-100);
  });

  it('perto do ponto: velocidade proporcional ao erro (ganho 3)', () => {
    const { state, out, sense } = setup(10, 90); // erro vertical = 10
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.velX).toBeCloseTo(30);
    expect(out.velY).toBeCloseTo(30);
  });

  it('já na altura certa: velY = 0', () => {
    const { state, out, sense } = setup(50, 80);
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.velY).toBe(0);
  });

  it('o balanço muda a velocidade horizontal com o tempo', () => {
    const { state, out, sense } = setup(10, 80);
    updateFlyer(state, out, sense, 250, cfg); // clock 250 -> sin(pi/2) = 1
    const peak = out.velX;
    updateFlyer(state, out, sense, 500, cfg); // clock 750 -> sin(3pi/2) = -1
    const trough = out.velX;
    expect(peak).toBeCloseTo(30 + 20);
    expect(trough).toBeCloseTo(30 - 20);
    expect(state.clockMs).toBe(750);
  });

  it('swayPeriodMs = 0 não gera NaN', () => {
    const { state, out, sense } = setup(10, 80);
    updateFlyer(state, out, sense, 16, { ...cfg, swayPeriodMs: 0 });
    expect(out.velX).toBeCloseTo(30);
  });
});

describe('pedido de mergulho', () => {
  it('pede quando alinhado, em alcance, sem cooldown e permitido', () => {
    const { state, out, sense } = setup(30, 80);
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(true);
    expect(state.mode).toBe('hover'); // só vira dive quando a entidade iniciar o ataque
  });

  it('aceita erro vertical de até 12 px nos dois sentidos', () => {
    for (const dy of [68, 92]) {
      const { state, out, sense } = setup(0, dy);
      updateFlyer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(true);
    }
  });

  it('não pede se ainda não está na altura', () => {
    for (const dy of [67, 93]) {
      const { state, out, sense } = setup(0, dy);
      updateFlyer(state, out, sense, 16, cfg);
      expect(out.startAttack).toBe(false);
    }
  });

  it('não pede se está longe demais em X', () => {
    const { state, out, sense } = setup(41, 80);
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
  });

  it('não pede se o bando não permite', () => {
    const { state, out, sense } = setup(0, 80);
    sense.attackAllowed = false;
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
  });

  it('não pede durante o cooldown', () => {
    const { state, out, sense } = setup(0, 80);
    state.mode = 'cooldown';
    state.timerMs = 500;
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.startAttack).toBe(false);
  });
});

describe('mergulho', () => {
  it('windup: fica parado e não pede outro ataque', () => {
    const { state, out, sense } = setup(30, 80);
    sense.attackPhase = 'windup';
    updateFlyer(state, out, sense, 16, cfg);
    expect(state.mode).toBe('dive');
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.controlsY).toBe(true);
    expect(out.startAttack).toBe(false);
    expect(state.diveDirX).toBe(0);
    expect(state.diveDirY).toBe(0);
  });

  it('windup: facing não muda mesmo se o alvo passa para o outro lado', () => {
    const { state, out, sense } = setup(30, 80);
    out.facing = 1;
    sense.attackPhase = 'windup';
    sense.dx = -200;
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.facing).toBe(1);
  });

  it('active: trava a direção normalizada até o alvo e usa diveSpeed', () => {
    const { state, out, sense } = setup(30, 40); // 3-4-5 escalado
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    expect(state.diveDirX).toBeCloseTo(0.6);
    expect(state.diveDirY).toBeCloseTo(0.8);
    expect(Math.hypot(state.diveDirX, state.diveDirY)).toBeCloseTo(1);
    expect(out.velX).toBeCloseTo(180);
    expect(out.velY).toBeCloseTo(240);
    expect(Math.hypot(out.velX, out.velY)).toBeCloseTo(cfg.diveSpeed);
    expect(out.controlsY).toBe(true);
  });

  it('active: a direção continua travada quando o alvo se move', () => {
    const { state, out, sense } = setup(30, 40);
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    sense.dx = -500;
    sense.dy = -10;
    updateFlyer(state, out, sense, 16, cfg);
    expect(state.diveDirX).toBeCloseTo(0.6);
    expect(out.velX).toBeCloseTo(180);
    expect(out.velY).toBeCloseTo(240);
  });

  it('active: alvo à esquerda mergulha para a esquerda e vira o facing', () => {
    const { state, out, sense } = setup(-40, 30);
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.velX).toBeCloseTo(-240);
    expect(out.velY).toBeCloseTo(180);
    expect(out.facing).toBe(-1);
  });

  it('active com dx = dy = 0: mergulha na horizontal, no sentido do facing', () => {
    const { state, out, sense } = setup(0, 0);
    out.facing = -1;
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    expect(state.diveDirX).toBe(-1);
    expect(state.diveDirY).toBe(0);
    expect(out.velX).toBe(-300);
    expect(out.velY).toBe(0);
  });

  it('active trava a direção mesmo sem ter passado por windup (dt grande)', () => {
    const { state, out, sense } = setup(0, 50);
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 100000, cfg);
    expect(out.velX).toBeCloseTo(0);
    expect(out.velY).toBeCloseTo(300);
  });

  it('recovery: sobe e não anda na horizontal', () => {
    const { state, out, sense } = setup(30, 40);
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    sense.attackPhase = 'recovery';
    updateFlyer(state, out, sense, 16, cfg);
    expect(state.mode).toBe('dive');
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(-120);
    expect(out.controlsY).toBe(true);
    expect(out.startAttack).toBe(false);
  });

  it('continua o mergulho mesmo que o alvo morra ou saia da visão', () => {
    const { state, out, sense } = setup(30, 40);
    sense.attackPhase = 'active';
    updateFlyer(state, out, sense, 16, cfg);
    sense.targetAlive = false;
    sense.dx = 9999;
    updateFlyer(state, out, sense, 16, cfg);
    expect(out.velX).toBeCloseTo(180);
    expect(out.velY).toBeCloseTo(240);
  });
});

describe('cooldown e retorno ao hover', () => {
  function finishDive() {
    const ctx = setup(30, 40);
    ctx.sense.attackPhase = 'active';
    updateFlyer(ctx.state, ctx.out, ctx.sense, 16, noSway);
    ctx.sense.attackPhase = 'recovery';
    updateFlyer(ctx.state, ctx.out, ctx.sense, 16, noSway);
    ctx.sense.attackPhase = 'idle';
    ctx.sense.dx = 0;
    ctx.sense.dy = 80;
    return ctx;
  }

  it('ao voltar a idle entra em cooldown, zera a direção e arma o timer', () => {
    const { state, out, sense } = finishDive();
    updateFlyer(state, out, sense, 16, noSway);
    expect(state.mode).toBe('cooldown');
    expect(state.timerMs).toBe(1000);
    expect(state.diveDirX).toBe(0);
    expect(state.diveDirY).toBe(0);
  });

  it('no cooldown se posiciona como hover, mas não pede ataque', () => {
    const { state, out, sense } = finishDive();
    sense.dx = 20;
    sense.dy = 200;
    updateFlyer(state, out, sense, 16, noSway);
    expect(out.velX).toBeCloseTo(60);
    expect(out.velY).toBe(100);
    expect(out.facing).toBe(1);
    expect(out.startAttack).toBe(false);
  });

  it('o timer cai com o tempo e, ao zerar, volta a hover', () => {
    const { state, out, sense } = finishDive();
    updateFlyer(state, out, sense, 16, noSway); // entra em cooldown
    updateFlyer(state, out, sense, 500, noSway);
    expect(state.mode).toBe('cooldown');
    expect(state.timerMs).toBe(500);
    expect(out.startAttack).toBe(false);
    updateFlyer(state, out, sense, 499, noSway);
    expect(state.mode).toBe('cooldown');
    expect(out.startAttack).toBe(false);
    updateFlyer(state, out, sense, 1, noSway);
    expect(state.mode).toBe('hover');
    expect(state.timerMs).toBe(0);
    expect(out.startAttack).toBe(true); // alinhado de novo: já pode mergulhar
  });

  it('dt grande encerra o cooldown de uma vez, sem timer negativo', () => {
    const { state, out, sense } = finishDive();
    updateFlyer(state, out, sense, 16, noSway);
    updateFlyer(state, out, sense, 1e9, noSway);
    expect(state.mode).toBe('hover');
    expect(state.timerMs).toBe(0);
  });

  it('o cooldown corre mesmo sem enxergar o alvo', () => {
    const { state, out, sense } = finishDive();
    updateFlyer(state, out, sense, 16, noSway);
    sense.dx = 5000;
    updateFlyer(state, out, sense, 1000, noSway);
    expect(state.mode).toBe('hover');
    expect(out.velX).toBe(0);
    expect(out.velY).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('dt negativo é ignorado', () => {
    const { state, out, sense } = finishDive();
    updateFlyer(state, out, sense, 16, noSway);
    const clock = state.clockMs;
    updateFlyer(state, out, sense, -500, noSway);
    expect(state.timerMs).toBe(1000);
    expect(state.clockMs).toBe(clock);
  });
});

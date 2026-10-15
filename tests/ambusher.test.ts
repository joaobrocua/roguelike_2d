import { describe, expect, it } from 'vitest';
import type { AttackPhase } from '../src/logic/attack';
import { createAiOutput, createAiSense, type AiOutput, type AiSense } from '../src/logic/ai/types';
import {
  canAttackNow,
  createAmbusher,
  isExposed,
  updateAmbusher,
  type AmbusherConfig,
  type AmbusherState,
} from '../src/logic/ai/ambusher';

const cfg: AmbusherConfig = {
  wakeRangeX: 100,
  wakeRangeY: 50,
  attackRangeX: 80,
  attackRangeY: 40,
  sleepRangeX: 200,
  riseMs: 300,
  sinkMs: 400,
  sinkDelayMs: 1000,
  attackCooldownMs: 500,
};

function setup(): { s: AmbusherState; out: AiOutput; sense: AiSense } {
  return { s: createAmbusher(), out: createAiOutput(), sense: createAiSense() };
}

function step(
  s: AmbusherState,
  out: AiOutput,
  sense: AiSense,
  dtMs = 100,
  phase: AttackPhase = 'idle',
): void {
  sense.attackPhase = phase;
  updateAmbusher(s, out, sense, dtMs, cfg);
}

/** Acorda e termina de subir, deixando a raiz 'awake' com o alvo no alcance de ataque. */
function awake(): { s: AmbusherState; out: AiOutput; sense: AiSense } {
  const ctx = setup();
  ctx.sense.dx = 50;
  step(ctx.s, ctx.out, ctx.sense, 16); // dormant -> rising
  step(ctx.s, ctx.out, ctx.sense, cfg.riseMs); // rising -> awake
  expect(ctx.s.mode).toBe('awake');
  return ctx;
}

describe('createAmbusher', () => {
  it('começa dormindo, zerada e sem golpe anterior', () => {
    expect(createAmbusher()).toEqual({
      mode: 'dormant',
      timerMs: 0,
      cooldownMs: 0,
      lastPhase: 'idle',
    });
  });
});

describe('acordar', () => {
  it('acorda na borda do alcance em X e em Y', () => {
    const { s, out, sense } = setup();
    sense.dx = -100;
    sense.dy = 50;
    step(s, out, sense);
    expect(s.mode).toBe('rising');
    expect(s.timerMs).toBe(cfg.riseMs);
  });

  it('não acorda um pixel além do alcance em X ou em Y', () => {
    const { s, out, sense } = setup();
    sense.dx = 101;
    step(s, out, sense);
    expect(s.mode).toBe('dormant');

    sense.dx = 0;
    sense.dy = -51;
    step(s, out, sense);
    expect(s.mode).toBe('dormant');
  });

  it('não acorda com o alvo morto, mesmo ao lado', () => {
    const { s, out, sense } = setup();
    sense.dx = 0;
    sense.targetAlive = false;
    step(s, out, sense);
    expect(s.mode).toBe('dormant');
  });

  it('dormindo não vira para o alvo nem ataca', () => {
    const { s, out, sense } = setup();
    out.facing = 1;
    sense.dx = -300;
    step(s, out, sense);
    expect(out.facing).toBe(1);
    expect(out.startAttack).toBe(false);

    // No frame em que acorda ainda não vira (a virada começa em 'rising').
    sense.dx = -50;
    step(s, out, sense);
    expect(s.mode).toBe('rising');
    expect(out.facing).toBe(1);
    expect(out.startAttack).toBe(false);
  });
});

describe('ciclo completo', () => {
  it('dormant -> rising -> awake -> sinking -> dormant com tempos exatos', () => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    step(s, out, sense); // acorda
    expect(s.mode).toBe('rising');

    step(s, out, sense, 100);
    step(s, out, sense, 100);
    expect(s.mode).toBe('rising');
    expect(s.timerMs).toBe(100);
    step(s, out, sense, 100);
    expect(s.mode).toBe('awake');

    // Alvo some: acumula 1000 ms parada e só então afunda.
    sense.dx = 201;
    for (let i = 0; i < 9; i++) step(s, out, sense, 100);
    expect(s.mode).toBe('awake');
    expect(s.timerMs).toBe(900);
    step(s, out, sense, 100);
    expect(s.mode).toBe('sinking');
    expect(s.timerMs).toBe(cfg.sinkMs);

    for (let i = 0; i < 3; i++) step(s, out, sense, 100);
    expect(s.mode).toBe('sinking');
    step(s, out, sense, 100);
    expect(s.mode).toBe('dormant');
    expect(s.timerMs).toBe(0);
  });

  it('alvo morto também conta como ninguém por perto e a raiz afunda', () => {
    const { s, out, sense } = awake();
    sense.targetAlive = false;
    step(s, out, sense, cfg.sinkDelayMs);
    expect(s.mode).toBe('sinking');
  });

  it('alguém voltar para perto zera o tempo acumulado sem ninguém', () => {
    const { s, out, sense } = awake();
    sense.dx = 500;
    step(s, out, sense, 900);
    expect(s.timerMs).toBe(900);

    sense.dx = 200; // borda de sleepRangeX ainda conta como perto
    step(s, out, sense, 100);
    expect(s.timerMs).toBe(0);

    sense.dx = 500;
    step(s, out, sense, 900);
    expect(s.mode).toBe('awake');
    step(s, out, sense, 100);
    expect(s.mode).toBe('sinking');
  });

  it('não acorda de novo durante o afundamento', () => {
    const { s, out, sense } = awake();
    sense.dx = 500;
    step(s, out, sense, cfg.sinkDelayMs);
    expect(s.mode).toBe('sinking');

    sense.dx = 10; // dentro do alcance de acordar
    step(s, out, sense, 100);
    expect(s.mode).toBe('sinking');
    expect(out.startAttack).toBe(false);
    step(s, out, sense, 300);
    // Terminou de afundar; só acorda de novo no frame seguinte.
    expect(s.mode).toBe('dormant');
    step(s, out, sense, 16);
    expect(s.mode).toBe('rising');
  });

  it('ao voltar a dormir limpa o cooldown e o timer', () => {
    const { s, out, sense } = awake();
    s.cooldownMs = 300;
    sense.dx = 500;
    step(s, out, sense, cfg.sinkDelayMs);
    step(s, out, sense, cfg.sinkMs);
    expect(s.mode).toBe('dormant');
    expect(s.cooldownMs).toBe(0);
    expect(s.timerMs).toBe(0);
  });
});

describe('virar para o alvo', () => {
  it('vira a cada frame enquanto sobe', () => {
    const { s, out, sense } = setup();
    out.facing = 1;
    sense.dx = 50;
    step(s, out, sense); // acorda
    sense.dx = -50;
    step(s, out, sense, 10);
    expect(s.mode).toBe('rising');
    expect(out.facing).toBe(-1);
    sense.dx = 0; // dx >= 0 olha para a direita
    step(s, out, sense, 10);
    expect(out.facing).toBe(1);
  });

  it('acordada e parada vira para o alvo', () => {
    const { s, out, sense } = awake();
    sense.dx = -60;
    sense.attackPhase = 'idle';
    step(s, out, sense, 16);
    expect(out.facing).toBe(-1);
    sense.dx = 60;
    step(s, out, sense, 16);
    expect(out.facing).toBe(1);
  });

  it.each(['windup', 'active', 'recovery'] as const)('não vira durante o golpe (%s)', (phase) => {
    const { s, out, sense } = awake();
    out.facing = 1;
    sense.dx = -60;
    step(s, out, sense, 16, phase);
    expect(out.facing).toBe(1);
    expect(out.startAttack).toBe(false);
  });
});

describe('ataque', () => {
  it('ataca acordada, no alcance, com cooldown zerado e bando permitindo', () => {
    const { s, out, sense } = awake();
    sense.dx = 80;
    sense.dy = -40;
    expect(canAttackNow(s)).toBe(true);
    step(s, out, sense, 16);
    expect(out.startAttack).toBe(true);
  });

  it('não ataca fora do alcance (X e Y)', () => {
    const { s, out, sense } = awake();
    sense.dx = 81;
    step(s, out, sense, 16);
    expect(out.startAttack).toBe(false);

    sense.dx = 50;
    sense.dy = 41;
    step(s, out, sense, 16);
    expect(out.startAttack).toBe(false);
  });

  it('não ataca com attackAllowed falso nem com o alvo morto', () => {
    const { s, out, sense } = awake();
    sense.attackAllowed = false;
    step(s, out, sense, 16);
    expect(out.startAttack).toBe(false);

    sense.attackAllowed = true;
    sense.targetAlive = false;
    step(s, out, sense, 16);
    expect(out.startAttack).toBe(false);
  });

  it('não pede ataque durante um golpe em andamento', () => {
    const { s, out, sense } = awake();
    step(s, out, sense, 16, 'windup');
    expect(out.startAttack).toBe(false);
  });

  it('não ataca enquanto sobe', () => {
    const { s, out, sense } = setup();
    sense.dx = 10;
    step(s, out, sense);
    step(s, out, sense, 10);
    expect(s.mode).toBe('rising');
    expect(out.startAttack).toBe(false);
  });

  it('o cooldown reinicia no fim do golpe e só então decresce', () => {
    const { s, out, sense } = awake();
    step(s, out, sense, 16, 'windup');
    step(s, out, sense, 500, 'active');
    step(s, out, sense, 500, 'recovery');
    // Durante o golpe o cooldown não corre (continua zerado) e não há pedido de ataque.
    expect(s.cooldownMs).toBe(0);

    step(s, out, sense, 100, 'idle'); // golpe terminou neste frame
    expect(s.cooldownMs).toBe(cfg.attackCooldownMs);
    expect(canAttackNow(s)).toBe(false);
    expect(out.startAttack).toBe(false);

    step(s, out, sense, 400);
    expect(s.cooldownMs).toBe(100);
    expect(out.startAttack).toBe(false);

    step(s, out, sense, 100);
    expect(s.cooldownMs).toBe(0);
    expect(canAttackNow(s)).toBe(true);
    expect(out.startAttack).toBe(true);
  });

  it('o cooldown também corre quando o alvo está fora do alcance', () => {
    const { s, out, sense } = awake();
    s.cooldownMs = 300;
    sense.dx = 150; // perto (não afunda), mas fora do alcance de ataque
    step(s, out, sense, 300);
    expect(s.cooldownMs).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('canAttackNow é falso fora de awake', () => {
    const { s, out, sense } = setup();
    expect(canAttackNow(s)).toBe(false);
    sense.dx = 10;
    step(s, out, sense);
    expect(s.mode).toBe('rising');
    expect(canAttackNow(s)).toBe(false);
  });
});

describe('não afunda no meio do golpe', () => {
  it('espera o golpe acabar e afunda no primeiro frame parado', () => {
    const { s, out, sense } = awake();
    step(s, out, sense, 16, 'windup');
    sense.dx = 500; // alvo some durante o golpe
    step(s, out, sense, 2000, 'active');
    expect(s.mode).toBe('awake');
    step(s, out, sense, 2000, 'recovery');
    expect(s.mode).toBe('awake');

    step(s, out, sense, 16, 'idle');
    expect(s.mode).toBe('sinking');
    expect(out.startAttack).toBe(false);
  });
});

describe('isExposed', () => {
  it('só é acertável subindo ou acordada', () => {
    const modes = [
      ['dormant', false],
      ['rising', true],
      ['awake', true],
      ['sinking', false],
    ] as const;
    for (const [mode, exposed] of modes) {
      const s = createAmbusher();
      s.mode = mode;
      expect(isExposed(s)).toBe(exposed);
    }
  });

  it('acompanha o ciclo real', () => {
    const { s, out, sense } = setup();
    expect(isExposed(s)).toBe(false);
    sense.dx = 50;
    step(s, out, sense);
    expect(isExposed(s)).toBe(true);
    step(s, out, sense, cfg.riseMs);
    expect(isExposed(s)).toBe(true);
    sense.dx = 500;
    step(s, out, sense, cfg.sinkDelayMs);
    expect(s.mode).toBe('sinking');
    expect(isExposed(s)).toBe(false);
  });
});

describe('saída', () => {
  it('velX é sempre 0 e nunca usa controlsY, fire nem jumpVelocity', () => {
    const { s, out, sense } = setup();
    const phases: AttackPhase[] = ['idle', 'windup', 'active', 'recovery'];
    for (let i = 0; i < 400; i++) {
      out.velX = 99;
      out.velY = 99;
      out.fire = true;
      out.jumpVelocity = -500;
      out.controlsY = true;
      sense.dx = ((i * 37) % 600) - 300;
      sense.dy = ((i * 13) % 120) - 60;
      sense.targetAlive = i % 11 !== 0;
      step(s, out, sense, 50, phases[Math.floor(i / 7) % 4] ?? 'idle');
      expect(out.velX).toBe(0);
      expect(out.velY).toBe(0);
      expect(out.controlsY).toBe(false);
      expect(out.fire).toBe(false);
      expect(out.jumpVelocity).toBe(0);
    }
  });

  it('lastPhase acompanha sense.attackPhase em todo frame, em qualquer modo', () => {
    const { s, out, sense } = setup();
    step(s, out, sense, 16, 'recovery'); // dormant
    expect(s.lastPhase).toBe('recovery');
    s.mode = 'sinking';
    s.timerMs = 100;
    step(s, out, sense, 16, 'windup');
    expect(s.lastPhase).toBe('windup');
    step(s, out, sense, 16, 'idle');
    expect(s.lastPhase).toBe('idle');
  });
});

describe('dt estranho', () => {
  it.each([-50, Number.NaN, 0])('dt %s não faz timers andarem nem quebra', (dt) => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    step(s, out, sense, dt);
    expect(s.mode).toBe('rising');
    step(s, out, sense, dt);
    expect(s.mode).toBe('rising');
    expect(s.timerMs).toBe(cfg.riseMs);

    step(s, out, sense, cfg.riseMs);
    s.cooldownMs = 200;
    sense.dx = 500;
    step(s, out, sense, dt);
    expect(s.cooldownMs).toBe(200);
    expect(s.timerMs).toBe(0);
    expect(Number.isNaN(s.timerMs)).toBe(false);
    expect(s.mode).toBe('awake');
  });
});

describe('determinismo', () => {
  it('a mesma sequência de entradas gera as mesmas saídas e estados', () => {
    const run = (): string[] => {
      const { s, out, sense } = setup();
      const log: string[] = [];
      const phases: AttackPhase[] = [
        'windup',
        'windup',
        'active',
        'active',
        'recovery',
        'recovery',
      ];
      let swingFrame = -1;
      for (let i = 0; i < 300; i++) {
        sense.dx = Math.floor(i / 60) % 2 === 0 ? Math.round(70 * Math.sin(i / 7)) : 400;
        sense.dy = Math.round(30 * Math.cos(i / 5));
        sense.targetAlive = i % 50 < 45;
        sense.attackAllowed = i % 9 !== 0;
        // Simula a entidade: o golpe começa no frame seguinte ao pedido e dura 6 frames.
        const phase: AttackPhase = swingFrame >= 0 ? (phases[swingFrame] ?? 'idle') : 'idle';
        swingFrame = swingFrame >= 0 && swingFrame < phases.length - 1 ? swingFrame + 1 : -1;
        step(s, out, sense, 33, phase);
        if (out.startAttack && swingFrame < 0) swingFrame = 0;
        log.push(
          `${s.mode}|${s.timerMs}|${s.cooldownMs}|${s.lastPhase}|${out.facing}|${out.startAttack}`,
        );
      }
      return log;
    };
    const a = run();
    expect(run()).toEqual(a);
    // A sequência exercita o ciclo todo (não é um teste trivial).
    expect(a.some((l) => l.startsWith('rising'))).toBe(true);
    expect(a.some((l) => l.startsWith('sinking'))).toBe(true);
    expect(a.some((l) => l.endsWith('true'))).toBe(true);
  });
});

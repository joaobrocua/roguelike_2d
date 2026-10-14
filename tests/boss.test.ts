import { describe, expect, it } from 'vitest';
import { createBoss, updateBoss, type BossConfig, type BossSense } from '../src/logic/ai/boss';
import { createAiOutput, createAiSense, type AiOutput } from '../src/logic/ai/types';

const cfg: BossConfig = {
  walkSpeed: 60,
  phase2SpeedMult: 1.5,
  phase2Threshold: 0.5,
  closeRangeX: 80,
  midRangeX: 200,
  attackCooldownMs: 1000,
  phase2CooldownMult: 0.6,
  lungeSpeed: 300,
  quakeChance: 0.4,
  introMs: 2000,
  phaseChangeMs: 1500,
};

const DT = 16;

/** rng falso: devolve os valores na ordem e repete o último quando acabam. */
function fakeRng(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

interface Setup {
  state: ReturnType<typeof createBoss>;
  out: AiOutput;
  sense: BossSense;
  rng: () => number;
}

function setup(rng: () => number = fakeRng(0)): Setup {
  return {
    state: createBoss(cfg.introMs),
    out: createAiOutput(),
    sense: { ...createAiSense(), hpFraction: 1 },
    rng,
  };
}

/** Chefe já em 'approach' com pausa zerada. */
function approaching(rng?: () => number): Setup {
  const s = setup(rng);
  s.state.mode = 'approach';
  s.state.timerMs = 0;
  return s;
}

function step(s: Setup, dtMs = DT, config = cfg): void {
  updateBoss(s.state, s.out, s.sense, dtMs, config, s.rng);
}

/** Pede o ataque a `dx` e a entidade o inicia em windup; devolve o setup já em 'attack'. */
function inAttack(dx: number, rng: () => number, phase: 1 | 2 = 1): Setup {
  const s = approaching(rng);
  s.state.phase = phase;
  s.sense.dx = dx;
  if (phase === 2) s.sense.hpFraction = 0.3;
  step(s); // pede
  s.sense.attackPhase = 'windup';
  step(s);
  return s;
}

describe('createBoss', () => {
  it('começa na intro com introMs, slam e fase 1', () => {
    expect(createBoss(1234)).toEqual({
      mode: 'intro',
      timerMs: 1234,
      attackKind: 'slam',
      phase: 1,
    });
  });
});

describe('intro', () => {
  it('fica parado por introMs e então vai para approach', () => {
    const s = setup();
    s.sense.dx = 500;
    step(s, 1000);
    expect(s.state.mode).toBe('intro');
    expect(s.state.timerMs).toBe(1000);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
    step(s, 999);
    expect(s.state.mode).toBe('intro');
    expect(s.state.timerMs).toBe(1);
    step(s, 1);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
    expect(s.out.velX).toBe(0);
  });

  it('olha para o alvo mesmo parado', () => {
    const s = setup();
    s.sense.dx = -300;
    step(s);
    expect(s.out.facing).toBe(-1);
    s.sense.dx = 300;
    step(s);
    expect(s.out.facing).toBe(1);
    expect(s.out.velX).toBe(0);
  });

  it('não ataca na intro, mesmo com o alvo colado', () => {
    const s = setup();
    s.sense.dx = 10;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });

  it('dt gigante termina a intro sem timer negativo', () => {
    const s = setup();
    step(s, 1e9);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
  });
});

describe('approach: andar', () => {
  it('anda até o jogador acima de midRangeX, nos dois sentidos', () => {
    const s = approaching();
    s.sense.dx = 201;
    step(s);
    expect(s.out.facing).toBe(1);
    expect(s.out.velX).toBe(60);
    expect(s.out.startAttack).toBe(false);
    s.sense.dx = -201;
    step(s);
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(-60);
    expect(s.state.mode).toBe('approach');
  });

  it('na fase 2 anda com phase2SpeedMult', () => {
    const s = approaching();
    s.state.phase = 2;
    s.sense.hpFraction = 0.2;
    s.sense.dx = -400;
    step(s);
    expect(s.out.velX).toBe(-90);
    s.sense.dx = 400;
    step(s);
    expect(s.out.velX).toBe(90);
  });

  it('para de andar dentro de midRangeX (limite inclusivo)', () => {
    const s = approaching(fakeRng(0.9));
    s.sense.dx = 200;
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(true);
  });

  it('não pede ataque enquanto anda, mesmo com timer zerado', () => {
    const s = approaching();
    s.sense.dx = 500;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });
});

describe('approach: escolha do ataque', () => {
  it('alcance curto: rng < 0.6 é slam, rng >= 0.6 é lunge', () => {
    const a = approaching(fakeRng(0.59));
    a.sense.dx = 80;
    step(a);
    expect(a.out.startAttack).toBe(true);
    expect(a.state.attackKind).toBe('slam');

    const b = approaching(fakeRng(0.6));
    b.sense.dx = -80;
    step(b);
    expect(b.out.startAttack).toBe(true);
    expect(b.state.attackKind).toBe('lunge');
  });

  it('alcance médio: sempre lunge, qualquer rng', () => {
    for (const r of [0, 0.3, 0.59, 0.99]) {
      const s = approaching(fakeRng(r));
      s.state.attackKind = 'slam';
      s.sense.dx = 81;
      step(s);
      expect(s.out.startAttack).toBe(true);
      expect(s.state.attackKind).toBe('lunge');
    }
  });

  it('fase 1 nunca escolhe quake, mesmo com rng baixo', () => {
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    step(s);
    expect(s.state.attackKind).not.toBe('quake');
    const m = approaching(fakeRng(0));
    m.sense.dx = 150;
    step(m);
    expect(m.state.attackKind).toBe('lunge');
  });

  it('fase 2: rng < quakeChance é quake, em qualquer distância dentro do alcance', () => {
    for (const dx of [10, 150, -200]) {
      const s = approaching(fakeRng(0.39));
      s.state.phase = 2;
      s.sense.hpFraction = 0.2;
      s.sense.dx = dx;
      step(s);
      expect(s.out.startAttack).toBe(true);
      expect(s.state.attackKind).toBe('quake');
    }
  });

  it('fase 2: rng >= quakeChance cai na escolha por distância (segundo sorteio)', () => {
    const close = approaching(fakeRng(0.4, 0.59));
    close.state.phase = 2;
    close.sense.hpFraction = 0.2;
    close.sense.dx = 50;
    step(close);
    expect(close.state.attackKind).toBe('slam');

    const close2 = approaching(fakeRng(0.4, 0.6));
    close2.state.phase = 2;
    close2.sense.hpFraction = 0.2;
    close2.sense.dx = 50;
    step(close2);
    expect(close2.state.attackKind).toBe('lunge');

    const mid = approaching(fakeRng(0.4, 0));
    mid.state.phase = 2;
    mid.sense.hpFraction = 0.2;
    mid.sense.dx = 150;
    step(mid);
    expect(mid.state.attackKind).toBe('lunge');
  });

  it('o attackKind escolhido persiste no state depois do pedido', () => {
    const s = inAttack(150, fakeRng(0));
    expect(s.state.attackKind).toBe('lunge');
    s.sense.attackPhase = 'idle';
    step(s);
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.attackKind).toBe('lunge');
  });
});

describe('approach: pedido de ataque', () => {
  it('attackAllowed false não pede e fica parado', () => {
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    s.sense.attackAllowed = false;
    s.state.attackKind = 'quake';
    step(s);
    expect(s.out.startAttack).toBe(false);
    expect(s.out.velX).toBe(0);
    expect(s.state.attackKind).toBe('quake'); // não sorteou
    expect(s.state.mode).toBe('approach');
  });

  it('só pede com timerMs <= 0; antes disso desconta e fica parado olhando', () => {
    const s = approaching(fakeRng(0));
    s.state.timerMs = 40;
    s.sense.dx = -50;
    step(s, 30);
    expect(s.out.startAttack).toBe(false);
    expect(s.out.velX).toBe(0);
    expect(s.out.facing).toBe(-1);
    expect(s.state.timerMs).toBe(10);
    step(s, 30);
    expect(s.out.startAttack).toBe(false);
    expect(s.state.timerMs).toBe(0);
    step(s);
    expect(s.out.startAttack).toBe(true);
  });

  it('segue pedindo enquanto a entidade não inicia, ainda em approach', () => {
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    step(s);
    step(s);
    expect(s.out.startAttack).toBe(true);
    expect(s.state.mode).toBe('approach');
  });

  it('vira attack quando attackPhase deixa de ser idle, sem pedir de novo', () => {
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    step(s);
    s.sense.attackPhase = 'windup';
    step(s);
    expect(s.state.mode).toBe('attack');
    expect(s.out.startAttack).toBe(false);
    expect(s.out.velX).toBe(0);
  });

  it('vira attack mesmo andando longe do alvo', () => {
    const s = approaching();
    s.sense.dx = 900;
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.state.mode).toBe('attack');
  });
});

describe('ataque', () => {
  it('facing fica travado mesmo que o alvo mude de lado', () => {
    const s = inAttack(150, fakeRng(0));
    expect(s.out.facing).toBe(1);
    s.sense.dx = -150;
    step(s);
    expect(s.out.facing).toBe(1);
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.facing).toBe(1);
    expect(s.out.velX).toBeGreaterThan(0);
  });

  it('lunge só avança na fase active', () => {
    const s = inAttack(150, fakeRng(0));
    expect(s.state.attackKind).toBe('lunge');
    expect(s.out.velX).toBe(0); // windup
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(300);
    s.sense.attackPhase = 'recovery';
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.state.mode).toBe('attack');
  });

  it('lunge segue o facing (esquerda)', () => {
    const s = inAttack(-150, fakeRng(0));
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(-300);
  });

  it('lunge na fase 2 usa phase2SpeedMult', () => {
    const s = inAttack(150, fakeRng(0.9, 0.9), 2);
    expect(s.state.attackKind).toBe('lunge');
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(450);
  });

  it('slam não avança em nenhuma fase', () => {
    const s = inAttack(50, fakeRng(0.1));
    expect(s.state.attackKind).toBe('slam');
    for (const phase of ['windup', 'active', 'recovery'] as const) {
      s.sense.attackPhase = phase;
      step(s);
      expect(s.out.velX).toBe(0);
    }
  });

  it('quake não avança em nenhuma fase', () => {
    const s = inAttack(50, fakeRng(0), 2);
    expect(s.state.attackKind).toBe('quake');
    for (const phase of ['windup', 'active', 'recovery'] as const) {
      s.sense.attackPhase = phase;
      step(s);
      expect(s.out.velX).toBe(0);
    }
  });

  it('não pede outro ataque durante o golpe', () => {
    const s = inAttack(50, fakeRng(0));
    s.sense.attackPhase = 'recovery';
    step(s);
    expect(s.out.startAttack).toBe(false);
  });
});

describe('cooldown', () => {
  function afterAttack(phase: 1 | 2): Setup {
    const s = inAttack(150, fakeRng(0.9, 0.9), phase);
    s.sense.attackPhase = 'active';
    step(s);
    s.sense.attackPhase = 'idle';
    step(s);
    return s;
  }

  it('fase 1: cooldown de attackCooldownMs, parado e sem pedir', () => {
    const s = afterAttack(1);
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.timerMs).toBe(1000);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
    step(s, 400);
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.timerMs).toBe(600);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
  });

  it('fase 2: cooldown multiplicado por phase2CooldownMult', () => {
    const s = afterAttack(2);
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.timerMs).toBe(600);
  });

  it('olha para o alvo durante o cooldown', () => {
    const s = afterAttack(1);
    s.sense.dx = -150;
    step(s);
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(0);
  });

  it('ao zerar vai para approach com timerMs 0 e então já pode atacar', () => {
    const s = afterAttack(1);
    step(s, 1000);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
    step(s);
    expect(s.out.startAttack).toBe(true);
  });

  it('dt gigante sai do cooldown sem timer negativo', () => {
    const s = afterAttack(2);
    step(s, 1e9);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
  });

  it('attackCooldownMs 0 não trava: sai no frame seguinte', () => {
    const c = { ...cfg, attackCooldownMs: 0 };
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    step(s, DT, c);
    s.sense.attackPhase = 'windup';
    step(s, DT, c);
    s.sense.attackPhase = 'idle';
    step(s, DT, c);
    expect(s.state.mode).toBe('cooldown');
    step(s, DT, c);
    expect(s.state.mode).toBe('approach');
  });
});

describe('mudança de fase', () => {
  it('entra na fase 2 ao chegar no limiar (inclusivo), parado, por phaseChangeMs', () => {
    const s = approaching();
    s.sense.dx = 500;
    s.sense.hpFraction = 0.5;
    step(s);
    expect(s.state.phase).toBe(2);
    expect(s.state.mode).toBe('phaseChange');
    expect(s.state.timerMs).toBe(1500);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);

    step(s, 1000);
    expect(s.state.mode).toBe('phaseChange');
    expect(s.state.timerMs).toBe(500);
    expect(s.out.velX).toBe(0);
    step(s, 500);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
    step(s);
    expect(s.out.velX).toBe(90); // já com a velocidade da fase 2
  });

  it('acima do limiar não muda', () => {
    const s = approaching();
    s.sense.dx = 500;
    s.sense.hpFraction = 0.51;
    step(s);
    expect(s.state.phase).toBe(1);
    expect(s.state.mode).toBe('approach');
  });

  it('olha para o alvo enquanto ruge', () => {
    const s = approaching();
    s.sense.hpFraction = 0.1;
    s.sense.dx = -100;
    step(s);
    expect(s.out.facing).toBe(-1);
    s.sense.dx = 100;
    step(s);
    expect(s.out.facing).toBe(1);
  });

  it('no meio de um golpe espera ele acabar antes de mudar', () => {
    const s = inAttack(150, fakeRng(0));
    s.sense.hpFraction = 0.1;
    for (const phase of ['windup', 'active', 'recovery'] as const) {
      s.sense.attackPhase = phase;
      step(s);
      expect(s.state.phase).toBe(1);
      expect(s.state.mode).toBe('attack');
    }
    s.sense.attackPhase = 'idle';
    step(s);
    expect(s.state.phase).toBe(2);
    expect(s.state.mode).toBe('phaseChange');
    expect(s.state.timerMs).toBe(1500);
    expect(s.out.velX).toBe(0);
  });

  it('o golpe em curso mantém os valores da fase 1 até acabar', () => {
    const s = inAttack(150, fakeRng(0));
    s.sense.hpFraction = 0.1;
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(300);
  });

  it('não volta à fase 1 se a vida subir', () => {
    const s = approaching();
    s.sense.hpFraction = 0.2;
    step(s);
    expect(s.state.phase).toBe(2);
    s.sense.hpFraction = 1;
    step(s, 5000);
    step(s);
    expect(s.state.phase).toBe(2);
    expect(s.state.mode).toBe('approach');
  });

  it('só dispara uma vez (não reinicia o rugido)', () => {
    const s = approaching();
    s.sense.hpFraction = 0.2;
    step(s);
    step(s, 600);
    expect(s.state.timerMs).toBe(900);
  });

  it('dt gigante no rugido termina sem timer negativo', () => {
    const s = approaching();
    s.sense.hpFraction = 0.2;
    step(s);
    step(s, 1e9);
    expect(s.state.mode).toBe('approach');
    expect(s.state.timerMs).toBe(0);
  });
});

describe('alvo morto', () => {
  it('em approach fica parado e não pede ataque', () => {
    const s = approaching(fakeRng(0));
    s.sense.targetAlive = false;
    s.sense.dx = 500;
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
    s.sense.dx = 50;
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
  });

  it('no meio do golpe a fase corre normalmente, sem andar, e vai a cooldown', () => {
    const s = inAttack(150, fakeRng(0));
    expect(s.state.attackKind).toBe('lunge');
    s.sense.targetAlive = false;
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.state.mode).toBe('attack');
    expect(s.out.velX).toBe(0);
    s.sense.attackPhase = 'idle';
    step(s);
    expect(s.state.mode).toBe('cooldown');
    step(s, 1000);
    expect(s.state.mode).toBe('approach');
    step(s);
    expect(s.out.startAttack).toBe(false);
  });

  it('a intro também corre normalmente', () => {
    const s = setup();
    s.sense.targetAlive = false;
    step(s, 2000);
    expect(s.state.mode).toBe('approach');
  });
});

describe('dt', () => {
  it('dt negativo não bagunça o timer', () => {
    const s = setup();
    step(s, 500);
    expect(s.state.timerMs).toBe(1500);
    step(s, -300);
    expect(s.state.timerMs).toBe(1500);
    expect(s.state.mode).toBe('intro');
  });

  it('dt 0 não avança nada', () => {
    const s = setup();
    step(s, 0);
    expect(s.state.timerMs).toBe(2000);
  });
});

describe('mutação sem alocar', () => {
  it('reutiliza o mesmo out e state, sem retorno', () => {
    const s = setup(fakeRng(0.1, 0.7, 0.3));
    const { state, out, sense } = s;
    sense.dx = 100;
    for (let i = 0; i < 400; i++) {
      sense.attackPhase = i % 20 < 8 ? 'idle' : i % 20 < 12 ? 'windup' : 'active';
      sense.hpFraction = i < 200 ? 1 : 0.2;
      updateBoss(state, out, sense, DT, cfg, s.rng);
    }
    expect(s.state).toBe(state);
    expect(s.out).toBe(out);
    expect(updateBoss(state, out, sense, DT, cfg, s.rng)).toBeUndefined();
  });

  it('zera velX/velY/fire/controlsY a cada frame e mantém facing', () => {
    const s = setup();
    s.out.velX = 99;
    s.out.velY = 99;
    s.out.fire = true;
    s.out.controlsY = true;
    s.out.facing = -1;
    s.sense.targetAlive = false;
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.out.velY).toBe(0);
    expect(s.out.fire).toBe(false);
    expect(s.out.controlsY).toBe(false);
    expect(s.out.facing).toBe(-1);
  });

  it('startAttack não vaza de um frame para o outro', () => {
    const s = approaching(fakeRng(0));
    s.sense.dx = 50;
    step(s);
    expect(s.out.startAttack).toBe(true);
    s.sense.dx = 500;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });
});

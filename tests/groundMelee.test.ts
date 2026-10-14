import { describe, expect, it } from 'vitest';
import {
  createGroundMelee,
  updateGroundMelee,
  type GroundMeleeConfig,
} from '../src/logic/ai/groundMelee';
import { createAiOutput, createAiSense, type AiOutput, type AiSense } from '../src/logic/ai/types';

const cfg: GroundMeleeConfig = {
  patrolSpeed: 40,
  chaseSpeed: 100,
  sightRangeX: 200,
  sightRangeY: 60,
  loseSightRangeX: 300,
  attackRangeX: 40,
  attackRangeY: 30,
  attackCooldownMs: 500,
  turnPauseMs: 300,
  lungeSpeed: 250,
  waitDistanceX: 120,
};

const DT = 16;

function setup() {
  return { state: createGroundMelee(), out: createAiOutput(), sense: createAiSense() };
}

/** Alvo fora de qualquer alcance de visão. */
function farTarget(sense: AiSense): void {
  sense.dx = 1000;
  sense.dy = 0;
}

function step(
  s: { state: ReturnType<typeof createGroundMelee>; out: AiOutput; sense: AiSense },
  dtMs = DT,
  config = cfg,
): void {
  updateGroundMelee(s.state, s.out, s.sense, dtMs, config);
}

describe('createGroundMelee', () => {
  it('começa em patrulha com timer zerado', () => {
    expect(createGroundMelee()).toEqual({ mode: 'patrol', timerMs: 0 });
  });
});

describe('patrulha', () => {
  it('anda na direção de facing com patrolSpeed', () => {
    const s = setup();
    farTarget(s.sense);
    s.out.facing = 1;
    step(s);
    expect(s.out.velX).toBe(40);
    s.out.facing = -1;
    step(s);
    expect(s.out.velX).toBe(-40);
    expect(s.state.mode).toBe('patrol');
  });

  it.each(['wallAhead', 'ledgeAhead'] as const)('para, espera turnPauseMs e vira em %s', (key) => {
    const s = setup();
    farTarget(s.sense);
    s.out.facing = 1;
    s.sense[key] = true;

    step(s); // detecta
    expect(s.out.velX).toBe(0);
    expect(s.out.facing).toBe(1);
    expect(s.state.timerMs).toBe(300);

    step(s, 200);
    expect(s.out.velX).toBe(0);
    expect(s.out.facing).toBe(1); // ainda na pausa
    expect(s.state.timerMs).toBe(100);

    step(s, 100); // pausa acaba
    expect(s.out.facing).toBe(-1);
    expect(s.state.timerMs).toBe(0);

    s.sense[key] = false;
    step(s);
    expect(s.out.velX).toBe(-40);
  });

  it('dt grande na pausa vira uma única vez e não deixa timer negativo', () => {
    const s = setup();
    farTarget(s.sense);
    s.sense.wallAhead = true;
    step(s);
    step(s, 100000);
    expect(s.out.facing).toBe(-1);
    expect(s.state.timerMs).toBe(0);
    expect(s.state.mode).toBe('patrol');
  });

  it('turnPauseMs 0 vira na hora', () => {
    const s = setup();
    farTarget(s.sense);
    s.sense.ledgeAhead = true;
    step(s, DT, { ...cfg, turnPauseMs: 0 });
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(0);
    expect(s.state.timerMs).toBe(0);
  });

  it('dt negativo não bagunça o timer', () => {
    const s = setup();
    farTarget(s.sense);
    s.sense.wallAhead = true;
    step(s);
    step(s, -500);
    expect(s.state.timerMs).toBe(300);
    expect(s.out.facing).toBe(1);
  });
});

describe('visão e perseguição', () => {
  it('vê o alvo dentro do alcance e vai para chase já no mesmo frame', () => {
    const s = setup();
    s.sense.dx = -150;
    s.sense.dy = 20;
    step(s);
    expect(s.state.mode).toBe('chase');
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(-100);
  });

  it('não vê o alvo fora de sightRangeX ou sightRangeY', () => {
    const s = setup();
    s.sense.dx = 201;
    s.sense.dy = 0;
    step(s);
    expect(s.state.mode).toBe('patrol');
    s.sense.dx = 100;
    s.sense.dy = 61;
    step(s);
    expect(s.state.mode).toBe('patrol');
  });

  it('o limite do alcance de visão é inclusivo', () => {
    const s = setup();
    s.sense.dx = 200;
    s.sense.dy = 60;
    step(s);
    expect(s.state.mode).toBe('chase');
  });

  it('histerese: continua perseguindo entre sightRangeX e loseSightRangeX', () => {
    const s = setup();
    s.sense.dx = 150;
    step(s);
    expect(s.state.mode).toBe('chase');
    s.sense.dx = 280; // fora de sightRangeX, dentro de loseSightRangeX
    step(s);
    expect(s.state.mode).toBe('chase');
    expect(s.out.velX).toBe(100);
    s.sense.dx = 301;
    step(s);
    expect(s.state.mode).toBe('patrol');
  });

  it('histerese vertical: perde o alvo só além de sightRangeY * 1.5', () => {
    const s = setup();
    s.sense.dx = 100;
    step(s);
    s.sense.dy = 90;
    step(s);
    expect(s.state.mode).toBe('chase');
    s.sense.dy = 91;
    step(s);
    expect(s.state.mode).toBe('patrol');
  });

  it('ao perder o alvo volta a andar em patrulha no mesmo frame', () => {
    const s = setup();
    s.sense.dx = 100;
    step(s);
    farTarget(s.sense);
    step(s);
    expect(s.state.mode).toBe('patrol');
    expect(s.out.velX).toBe(40); // facing 1 herdado da perseguição
  });

  it('vira para o alvo a cada frame', () => {
    const s = setup();
    s.sense.dx = 100;
    step(s);
    expect(s.out.facing).toBe(1);
    s.sense.dx = -100;
    step(s);
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(-100);
  });

  it.each(['wallAhead', 'ledgeAhead'] as const)(
    'não avança contra %s, mas continua olhando',
    (key) => {
      const s = setup();
      s.sense.dx = -150;
      s.sense[key] = true;
      step(s);
      expect(s.state.mode).toBe('chase');
      expect(s.out.velX).toBe(0);
      expect(s.out.facing).toBe(-1);
    },
  );

  it('alvo morto nunca é visto', () => {
    const s = setup();
    s.sense.dx = 50;
    s.sense.targetAlive = false;
    step(s);
    expect(s.state.mode).toBe('patrol');
    expect(s.out.startAttack).toBe(false);
  });

  it('alvo que morre durante a perseguição faz voltar à patrulha', () => {
    const s = setup();
    s.sense.dx = 50;
    step(s);
    expect(s.state.mode).toBe('chase');
    s.sense.targetAlive = false;
    step(s);
    expect(s.state.mode).toBe('patrol');
    expect(s.out.startAttack).toBe(false);
  });

  it('chegando em patrulha com pausa de virada, a perseguição zera o timer', () => {
    const s = setup();
    farTarget(s.sense);
    s.sense.wallAhead = true;
    step(s);
    expect(s.state.timerMs).toBe(300);
    s.sense.dx = 100;
    step(s);
    expect(s.state.mode).toBe('chase');
    expect(s.state.timerMs).toBe(0);
  });
});

describe('pedido de ataque', () => {
  it('pede ataque no alcance e para de andar, ficando em chase', () => {
    const s = setup();
    s.sense.dx = 40;
    s.sense.dy = 30;
    step(s);
    expect(s.out.startAttack).toBe(true);
    expect(s.out.velX).toBe(0);
    expect(s.state.mode).toBe('chase');
    // a entidade ainda não iniciou: segue pedindo
    step(s);
    expect(s.out.startAttack).toBe(true);
  });

  it('não pede ataque fora de attackRangeX ou attackRangeY', () => {
    const s = setup();
    s.sense.dx = 41;
    step(s);
    expect(s.out.startAttack).toBe(false);
    expect(s.out.velX).toBe(100);
    s.sense.dx = 10;
    s.sense.dy = 31;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });

  it('não pede ataque se attackAllowed é false', () => {
    const s = setup();
    s.sense.dx = 30;
    s.sense.attackAllowed = false;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });

  it('startAttack não vaza de um frame para o outro', () => {
    const s = setup();
    s.sense.dx = 30;
    step(s);
    expect(s.out.startAttack).toBe(true);
    s.sense.dx = 100;
    step(s);
    expect(s.out.startAttack).toBe(false);
  });

  it('pode pedir ataque estando encostado na parede', () => {
    const s = setup();
    s.sense.dx = 30;
    s.sense.wallAhead = true;
    step(s);
    expect(s.out.startAttack).toBe(true);
  });
});

describe('ronda (attackAllowed false)', () => {
  it('recua com patrolSpeed * 2 quando está perto demais', () => {
    const s = setup();
    s.sense.dx = 50; // < 120 * 0.6 = 72
    s.sense.attackAllowed = false;
    step(s);
    expect(s.state.mode).toBe('chase');
    expect(s.out.facing).toBe(1);
    expect(s.out.velX).toBe(-80);
    expect(s.out.startAttack).toBe(false);
  });

  it('recua para a direita quando o alvo está à esquerda', () => {
    const s = setup();
    s.sense.dx = -50;
    s.sense.attackAllowed = false;
    step(s);
    expect(s.out.facing).toBe(-1);
    expect(s.out.velX).toBe(80);
  });

  it('fica parado, olhando para o alvo, entre 0.6 e 1.0 de waitDistanceX', () => {
    const s = setup();
    s.sense.dx = -100;
    s.sense.attackAllowed = false;
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.out.facing).toBe(-1);
  });

  it('além de waitDistanceX continua se aproximando', () => {
    const s = setup();
    s.sense.dx = 150;
    s.sense.attackAllowed = false;
    step(s);
    expect(s.out.velX).toBe(100);
  });

  it('volta a atacar quando attackAllowed passa a true', () => {
    const s = setup();
    s.sense.dx = 30;
    s.sense.attackAllowed = false;
    step(s);
    expect(s.out.startAttack).toBe(false);
    s.sense.attackAllowed = true;
    step(s);
    expect(s.out.startAttack).toBe(true);
  });
});

describe('ataque', () => {
  function inAttack() {
    const s = setup();
    s.sense.dx = 30;
    step(s); // pede ataque
    s.sense.attackPhase = 'windup';
    step(s);
    return s;
  }

  it('entra em attack quando attackPhase deixa de ser idle', () => {
    const s = inAttack();
    expect(s.state.mode).toBe('attack');
    expect(s.out.startAttack).toBe(false);
    expect(s.out.velX).toBe(0);
  });

  it('entra em attack mesmo vindo da patrulha', () => {
    const s = setup();
    farTarget(s.sense);
    s.sense.attackPhase = 'windup';
    step(s);
    expect(s.state.mode).toBe('attack');
    expect(s.out.velX).toBe(0);
  });

  it('facing fica travado mesmo que o alvo mude de lado', () => {
    const s = inAttack();
    expect(s.out.facing).toBe(1);
    s.sense.dx = -30;
    step(s);
    expect(s.out.facing).toBe(1);
  });

  it('lunge só na fase active', () => {
    const s = inAttack();
    expect(s.out.velX).toBe(0); // windup
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(250);
    s.sense.attackPhase = 'recovery';
    step(s);
    expect(s.out.velX).toBe(0);
    expect(s.state.mode).toBe('attack');
  });

  it('lunge segue o facing (esquerda)', () => {
    const s = setup();
    s.sense.dx = -30;
    step(s);
    s.sense.attackPhase = 'active';
    step(s);
    expect(s.out.velX).toBe(-250);
  });

  it('lungeSpeed 0 é golpe parado', () => {
    const s = inAttack();
    s.sense.attackPhase = 'active';
    step(s, DT, { ...cfg, lungeSpeed: 0 });
    expect(s.out.velX).toBe(0);
  });

  it('lunge ignora parede à frente (a entidade resolve a colisão)', () => {
    const s = inAttack();
    s.sense.attackPhase = 'active';
    s.sense.wallAhead = true;
    step(s);
    expect(s.out.velX).toBe(250);
  });
});

describe('cooldown', () => {
  function afterAttack() {
    const s = setup();
    s.sense.dx = 30;
    step(s);
    s.sense.attackPhase = 'active';
    step(s);
    s.sense.attackPhase = 'idle';
    step(s);
    return s;
  }

  it('attackPhase voltando a idle leva a cooldown com attackCooldownMs', () => {
    const s = afterAttack();
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.timerMs).toBe(500);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
  });

  it('fica parado e sem pedir ataque durante o cooldown, mesmo no alcance', () => {
    const s = afterAttack();
    step(s, 200);
    expect(s.state.mode).toBe('cooldown');
    expect(s.state.timerMs).toBe(300);
    expect(s.out.velX).toBe(0);
    expect(s.out.startAttack).toBe(false);
  });

  it('ao zerar volta para chase se ainda vê o alvo e já pode atacar', () => {
    const s = afterAttack();
    step(s, 500);
    expect(s.state.mode).toBe('chase');
    expect(s.state.timerMs).toBe(0);
    expect(s.out.startAttack).toBe(true);
  });

  it('ao zerar volta para patrol se perdeu o alvo', () => {
    const s = afterAttack();
    farTarget(s.sense);
    step(s, 500);
    expect(s.state.mode).toBe('patrol');
    expect(s.state.timerMs).toBe(0);
    expect(s.out.velX).toBe(40);
  });

  it('alvo morto no cooldown leva a patrol', () => {
    const s = afterAttack();
    s.sense.targetAlive = false;
    step(s, 500);
    expect(s.state.mode).toBe('patrol');
  });

  it('dt gigante sai do cooldown sem timer negativo', () => {
    const s = afterAttack();
    step(s, 1e9);
    expect(s.state.mode).toBe('chase');
    expect(s.state.timerMs).toBe(0);
  });

  it('attackCooldownMs 0 não trava: sai no frame seguinte', () => {
    const s = setup();
    const c = { ...cfg, attackCooldownMs: 0 };
    s.sense.dx = 30;
    step(s, DT, c);
    s.sense.attackPhase = 'active';
    step(s, DT, c);
    s.sense.attackPhase = 'idle';
    step(s, DT, c);
    expect(s.state.mode).toBe('cooldown');
    step(s, DT, c);
    expect(s.state.mode).toBe('chase');
  });
});

describe('mutação sem alocar', () => {
  it('reutiliza o mesmo out e state, sem trocar as referências', () => {
    const s = setup();
    const { state, out, sense } = s;
    sense.dx = 30;
    for (let i = 0; i < 50; i++) {
      sense.attackPhase = i % 10 < 3 ? 'idle' : i % 10 < 6 ? 'windup' : 'active';
      updateGroundMelee(state, out, sense, DT, cfg);
    }
    expect(s.state).toBe(state);
    expect(s.out).toBe(out);
    expect(updateGroundMelee(state, out, sense, DT, cfg)).toBeUndefined();
  });

  it('zera velX/velY/fire a cada frame e mantém facing', () => {
    const s = setup();
    farTarget(s.sense);
    s.out.velY = 99;
    s.out.fire = true;
    s.out.controlsY = true;
    s.out.facing = -1;
    step(s);
    expect(s.out.velY).toBe(0);
    expect(s.out.fire).toBe(false);
    expect(s.out.controlsY).toBe(false);
    expect(s.out.facing).toBe(-1);
  });
});

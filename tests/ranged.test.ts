import { describe, expect, it } from 'vitest';
import type { AttackPhase } from '../src/logic/attack';
import { createAiOutput, createAiSense, type AiOutput, type AiSense } from '../src/logic/ai/types';
import {
  createRanged,
  updateRanged,
  type RangedConfig,
  type RangedState,
} from '../src/logic/ai/ranged';

const cfg: RangedConfig = {
  sightRangeX: 400,
  sightRangeY: 100,
  shootRangeY: 20,
  minDistanceX: 120,
  maxDistanceX: 220,
  retreatSpeed: 90,
  approachSpeed: 60,
  shootCooldownMs: 800,
};

function setup(): { s: RangedState; out: AiOutput; sense: AiSense } {
  return { s: createRanged(), out: createAiOutput(), sense: createAiSense() };
}

/** Roda um frame com a fase de ataque indicada. */
function step(s: RangedState, out: AiOutput, sense: AiSense, phase: AttackPhase, dtMs = 16): void {
  sense.attackPhase = phase;
  updateRanged(s, out, sense, dtMs, cfg);
}

describe('createRanged', () => {
  it('começa parado', () => {
    expect(createRanged()).toEqual({ mode: 'idle', timerMs: 0, prevPhase: 'idle' });
  });
});

describe('visão', () => {
  it('fica idle e parado sem ver o alvo (longe em x ou em y), sem mudar facing', () => {
    const { s, out, sense } = setup();
    out.facing = -1;
    sense.dx = 401;
    step(s, out, sense, 'idle');
    expect(s.mode).toBe('idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(false);
    expect(out.facing).toBe(-1);

    sense.dx = 150;
    sense.dy = 101;
    step(s, out, sense, 'idle');
    expect(s.mode).toBe('idle');
    expect(out.startAttack).toBe(false);
    expect(out.facing).toBe(-1);
  });

  it('enxerga exatamente no limite', () => {
    const { s, out, sense } = setup();
    sense.dx = 400;
    sense.dy = -100;
    step(s, out, sense, 'idle');
    expect(s.mode).toBe('reposition');
    expect(out.velX).toBe(60);
  });

  it('alvo morto: idle, parado, sem pedir ataque', () => {
    const { s, out, sense } = setup();
    sense.dx = 150;
    sense.targetAlive = false;
    out.facing = -1;
    step(s, out, sense, 'idle');
    expect(s.mode).toBe('idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(false);
    expect(out.facing).toBe(-1);
  });

  it('limpa decisões do frame anterior (reset do output)', () => {
    const { s, out, sense } = setup();
    sense.dx = 150;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(true);
    sense.targetAlive = false;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(false);
  });
});

describe('distância', () => {
  it('recua (para longe do alvo) se |dx| < minDistanceX, olhando para ele', () => {
    const { s, out, sense } = setup();
    sense.dx = 100;
    step(s, out, sense, 'idle');
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(-90);
    expect(s.mode).toBe('reposition');
    expect(out.startAttack).toBe(false);

    sense.dx = -100;
    step(s, out, sense, 'idle');
    expect(out.facing).toBe(-1);
    expect(out.velX).toBe(90);
  });

  it('recua mesmo com parede/beira sinalizadas (sensores olham para a frente)', () => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    sense.wallAhead = true;
    sense.ledgeAhead = true;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(-90);
  });

  it('em exatamente minDistanceX não recua', () => {
    const { s, out, sense } = setup();
    sense.dx = 120;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(true);
  });

  it('se aproxima se |dx| > maxDistanceX, nos dois sentidos', () => {
    const { s, out, sense } = setup();
    sense.dx = 300;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(60);
    expect(s.mode).toBe('reposition');
    expect(out.startAttack).toBe(false);

    sense.dx = -300;
    step(s, out, sense, 'idle');
    expect(out.facing).toBe(-1);
    expect(out.velX).toBe(-60);
  });

  it('em exatamente maxDistanceX não avança', () => {
    const { s, out, sense } = setup();
    sense.dx = 220;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(true);
  });

  it('não avança contra parede', () => {
    const { s, out, sense } = setup();
    sense.dx = 300;
    sense.wallAhead = true;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(s.mode).toBe('idle');
    expect(out.facing).toBe(1);
  });

  it('não avança na beira do abismo', () => {
    const { s, out, sense } = setup();
    sense.dx = -300;
    sense.ledgeAhead = true;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(s.mode).toBe('idle');
    expect(out.facing).toBe(-1);
  });

  it('parede/beira não impedem mirar na faixa ideal', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    sense.wallAhead = true;
    sense.ledgeAhead = true;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(true);
  });
});

describe('recuo bloqueado (encurralado)', () => {
  it('com parede atrás não recua: atira mesmo perto demais', () => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    sense.wallBehind = true;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(true);
    expect(s.mode).toBe('aim');
  });

  it('com beira atrás também não recua', () => {
    const { s, out, sense } = setup();
    sense.dx = -50;
    sense.ledgeBehind = true;
    step(s, out, sense, 'idle');
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(true);
  });

  it('encurralado e em cooldown fica parado, sem pedir ataque', () => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    sense.wallBehind = true;
    step(s, out, sense, 'windup');
    step(s, out, sense, 'idle'); // golpe acabou: cooldown
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(false);
    expect(s.mode).toBe('cooldown');
  });
});

describe('altura do tiro', () => {
  it('só pede ataque se o alvo está na altura da flecha (|dy| <= shootRangeY)', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    sense.dy = 20;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(true);

    sense.dy = 21;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(false);
    expect(out.velX).toBe(0);
  });
});

describe('pedido de ataque', () => {
  it('pede ataque parado na faixa ideal, virado para o alvo', () => {
    const { s, out, sense } = setup();
    sense.dx = -180;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(true);
    expect(out.velX).toBe(0);
    expect(out.facing).toBe(-1);
    expect(s.mode).toBe('aim');
  });

  it('não pede se attackAllowed é false', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    sense.attackAllowed = false;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(false);
    expect(s.mode).not.toBe('aim');
  });

  it('não pede fora da faixa', () => {
    const { s, out, sense } = setup();
    sense.dx = 50;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(false);
    sense.dx = 350;
    step(s, out, sense, 'idle');
    expect(out.startAttack).toBe(false);
  });
});

describe('ataque em andamento', () => {
  it('trava facing e fica parado, mesmo se o alvo trocar de lado ou se afastar', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    step(s, out, sense, 'windup');
    expect(s.mode).toBe('aim');
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(false);

    sense.dx = -50; // alvo passou por trás e perto demais
    step(s, out, sense, 'windup');
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(0);

    sense.dx = 380;
    step(s, out, sense, 'active');
    expect(out.facing).toBe(1);
    expect(out.velX).toBe(0);

    sense.targetAlive = false;
    step(s, out, sense, 'recovery');
    expect(out.facing).toBe(1);
    expect(s.mode).toBe('aim');
  });

  it('fire sai exatamente uma vez, na transição windup -> active', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    const fires: boolean[] = [];
    const phases: AttackPhase[] = [
      'windup',
      'windup',
      'active',
      'active',
      'active',
      'recovery',
      'recovery',
    ];
    for (const phase of phases) {
      step(s, out, sense, phase);
      fires.push(out.fire);
    }
    expect(fires).toEqual([false, false, true, false, false, false, false]);
  });

  it('fire sai mesmo se um dt grande pular a fase ativa (windup -> recovery)', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    step(s, out, sense, 'windup');
    expect(out.fire).toBe(false);
    step(s, out, sense, 'recovery', 200);
    expect(out.fire).toBe(true);
    step(s, out, sense, 'recovery');
    expect(out.fire).toBe(false);
  });

  it('fire sai se a fase pular direto de idle para active (dt grande)', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    step(s, out, sense, 'idle');
    step(s, out, sense, 'active', 10_000);
    expect(out.fire).toBe(true);
  });

  it('um novo ataque dispara de novo', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    let total = 0;
    for (let n = 0; n < 2; n++) {
      step(s, out, sense, 'windup');
      step(s, out, sense, 'active');
      if (out.fire) total++;
      step(s, out, sense, 'recovery');
      step(s, out, sense, 'idle', cfg.shootCooldownMs);
    }
    expect(total).toBe(2);
  });

  it('fire não sai fora do ataque', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    step(s, out, sense, 'idle');
    expect(out.fire).toBe(false);
  });
});

describe('cooldown pós-tiro', () => {
  function afterShot(dx: number): { s: RangedState; out: AiOutput; sense: AiSense } {
    const ctx = setup();
    ctx.sense.dx = dx;
    step(ctx.s, ctx.out, ctx.sense, 'windup');
    step(ctx.s, ctx.out, ctx.sense, 'active');
    step(ctx.s, ctx.out, ctx.sense, 'recovery');
    step(ctx.s, ctx.out, ctx.sense, 'idle');
    return ctx;
  }

  it('ao voltar a idle entra em cooldown, parado, sem pedir ataque', () => {
    const { s, out } = afterShot(180);
    expect(s.mode).toBe('cooldown');
    expect(s.timerMs).toBe(800);
    expect(out.velX).toBe(0);
    expect(out.startAttack).toBe(false);
  });

  it('desconta o timer e só volta a pedir ataque quando zera', () => {
    const { s, out, sense } = afterShot(180);
    step(s, out, sense, 'idle', 500);
    expect(s.timerMs).toBe(300);
    expect(s.mode).toBe('cooldown');
    expect(out.startAttack).toBe(false);

    step(s, out, sense, 'idle', 299);
    expect(s.timerMs).toBe(1);
    expect(out.startAttack).toBe(false);

    step(s, out, sense, 'idle', 1);
    expect(s.timerMs).toBe(0);
    expect(out.startAttack).toBe(true);
    expect(s.mode).toBe('aim');
  });

  it('dt enorme zera o timer sem ficar negativo', () => {
    const { s, out, sense } = afterShot(180);
    step(s, out, sense, 'idle', 1_000_000);
    expect(s.timerMs).toBe(0);
    expect(out.startAttack).toBe(true);
  });

  it('dt negativo não aumenta o timer', () => {
    const { s, out, sense } = afterShot(180);
    step(s, out, sense, 'idle', -500);
    expect(s.timerMs).toBe(800);
  });

  it('no cooldown recua se o alvo chegou perto demais', () => {
    const { s, out, sense } = afterShot(180);
    sense.dx = 60;
    step(s, out, sense, 'idle', 100);
    expect(out.velX).toBe(-90);
    expect(s.mode).toBe('cooldown');
    expect(out.startAttack).toBe(false);
  });

  it('no cooldown não se aproxima, mesmo com o alvo longe', () => {
    const { s, out, sense } = afterShot(180);
    sense.dx = 350;
    step(s, out, sense, 'idle', 100);
    expect(out.velX).toBe(0);
    expect(s.mode).toBe('cooldown');
  });

  it('ao zerar, volta a se aproximar se o alvo estiver longe', () => {
    const { s, out, sense } = afterShot(180);
    sense.dx = 350;
    step(s, out, sense, 'idle', 800);
    expect(out.velX).toBe(60);
    expect(s.mode).toBe('reposition');
  });

  it('ao zerar sem ver o alvo, volta a idle', () => {
    const { s, out, sense } = afterShot(180);
    sense.targetAlive = false;
    step(s, out, sense, 'idle', 800);
    expect(s.mode).toBe('idle');
    expect(out.startAttack).toBe(false);
  });

  it('o timer continua descontando mesmo sem ver o alvo', () => {
    const { s, out, sense } = afterShot(180);
    sense.dx = 1000;
    step(s, out, sense, 'idle', 500);
    expect(s.mode).toBe('idle');
    expect(s.timerMs).toBe(300);
  });
});

describe('prevPhase', () => {
  it('acompanha a fase de ataque a cada frame', () => {
    const { s, out, sense } = setup();
    sense.dx = 180;
    step(s, out, sense, 'windup');
    expect(s.prevPhase).toBe('windup');
    step(s, out, sense, 'active');
    expect(s.prevPhase).toBe('active');
    step(s, out, sense, 'idle');
    expect(s.prevPhase).toBe('idle');
  });

  it('atualiza mesmo quando o alvo não é visto', () => {
    const { s, out, sense } = setup();
    sense.targetAlive = false;
    step(s, out, sense, 'recovery');
    expect(s.prevPhase).toBe('recovery');
  });
});

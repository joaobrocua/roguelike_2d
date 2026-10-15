import { describe, expect, it } from 'vitest';
import type { AttackPhase } from '../src/logic/attack';
import { createAiOutput, createAiSense, type AiOutput, type AiSense } from '../src/logic/ai/types';
import {
  createHopper,
  updateHopper,
  type HopperConfig,
  type HopperState,
} from '../src/logic/ai/hopper';

const cfg: HopperConfig = {
  sightRangeX: 400,
  sightRangeY: 100,
  minDistanceX: 100,
  maxDistanceX: 200,
  hopSpeed: 120,
  hopVelocity: -300,
  restMs: 400,
  patrolHopMs: 1000,
  shootCooldownMs: 800,
};

interface Ctx {
  s: HopperState;
  out: AiOutput;
  sense: AiSense;
}

function setup(): Ctx {
  return { s: createHopper(), out: createAiOutput(), sense: createAiSense() };
}

function step(ctx: Ctx, dtMs = 16, phase: AttackPhase = 'idle'): void {
  ctx.sense.attackPhase = phase;
  updateHopper(ctx.s, ctx.out, ctx.sense, dtMs, cfg);
}

/** Alvo morto: o sapo patrulha. */
function patrolCtx(): Ctx {
  const ctx = setup();
  ctx.sense.targetAlive = false;
  return ctx;
}

/** Faz o sapo dar o pulo, voar um frame e pousar, terminando no descanso. */
function hopAndLand(ctx: Ctx): void {
  ctx.sense.grounded = false;
  step(ctx);
  ctx.sense.grounded = true;
  step(ctx);
}

describe('createHopper', () => {
  it('começa parado, virado para a direita', () => {
    expect(createHopper()).toEqual({
      mode: 'idle',
      timerMs: 0,
      dir: 1,
      prevPhase: 'idle',
      speed: 0,
    });
  });
});

describe('patrulha', () => {
  it('só pula quando o intervalo vence', () => {
    const ctx = patrolCtx();
    step(ctx, 500);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.s.mode).toBe('idle');
    step(ctx, 499);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);

    step(ctx, 1);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.s.mode).toBe('hop');
  });

  it('o pulinho usa metade da velocidade horizontal, na direção do sapo, olhando para ela', () => {
    const ctx = patrolCtx();
    step(ctx, 1000);
    expect(ctx.out.velX).toBe(60);
    expect(ctx.out.facing).toBe(1);
    expect(ctx.s.dir).toBe(1);
    expect(ctx.s.speed).toBe(60);
  });

  it('um dt grande também vence o intervalo', () => {
    const ctx = patrolCtx();
    step(ctx, 1_000_000);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });

  it('com parede à frente inverte a direção e pula para o outro lado', () => {
    const ctx = patrolCtx();
    ctx.sense.wallAhead = true;
    step(ctx, 1000);
    expect(ctx.s.dir).toBe(-1);
    expect(ctx.out.velX).toBe(-60);
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });

  it('com beira à frente também inverte', () => {
    const ctx = patrolCtx();
    ctx.sense.ledgeAhead = true;
    step(ctx, 1000);
    expect(ctx.s.dir).toBe(-1);
    expect(ctx.out.velX).toBe(-60);
  });

  it('indo para a esquerda, parede à frente (esquerda) manda para a direita', () => {
    const ctx = patrolCtx();
    ctx.out.facing = -1;
    ctx.s.dir = -1;
    ctx.sense.wallAhead = true;
    step(ctx, 1000);
    expect(ctx.s.dir).toBe(1);
    expect(ctx.out.velX).toBe(60);
  });

  it('não vira para o lado que também está bloqueado: espera parado', () => {
    const ctx = patrolCtx();
    ctx.sense.wallAhead = true;
    ctx.sense.ledgeBehind = true;
    step(ctx, 1000);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.s.dir).toBe(1);
    expect(ctx.s.mode).toBe('idle');

    // Liberou o lado de trás: pula no mesmo frame em que checa de novo.
    ctx.sense.ledgeBehind = false;
    step(ctx, 16);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.velX).toBe(-60);
  });

  it('com a direção livre mantém a direção (sem inverter à toa)', () => {
    const ctx = patrolCtx();
    ctx.sense.wallBehind = true; // atrás não importa, o sapo vai para a frente
    step(ctx, 1000);
    expect(ctx.s.dir).toBe(1);
    expect(ctx.out.velX).toBe(60);
  });

  it('alvo fora da visão (longe) também patrulha; o facing não muda enquanto parado', () => {
    const ctx = setup();
    ctx.out.facing = -1;
    ctx.sense.dx = 401;
    step(ctx, 100);
    expect(ctx.s.mode).toBe('idle');
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('o intervalo conta de novo a partir do descanso depois de um pulinho', () => {
    const ctx = patrolCtx();
    step(ctx, 1000);
    hopAndLand(ctx);
    expect(ctx.s.mode).toBe('rest');
    step(ctx, 400); // descanso acaba: volta à patrulha com o relógio zerado
    expect(ctx.s.mode).toBe('idle');
    step(ctx, 999);
    expect(ctx.out.jumpVelocity).toBe(0);
    step(ctx, 1);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });

  it('perder o alvo de vista zera o relógio da patrulha', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 900); // vendo o alvo na faixa ideal: pede ataque
    expect(ctx.out.startAttack).toBe(true);
    ctx.sense.targetAlive = false;
    step(ctx, 900); // entra em idle: o relógio recomeça do zero
    expect(ctx.out.jumpVelocity).toBe(0);
    step(ctx, 999);
    expect(ctx.out.jumpVelocity).toBe(0);
    step(ctx, 1);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });
});

describe('visão', () => {
  it('vira para o alvo, nos dois lados', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx);
    expect(ctx.out.facing).toBe(1);
    ctx.sense.dx = -150;
    step(ctx);
    expect(ctx.out.facing).toBe(-1);
  });

  it('enxerga exatamente no limite e não além (x e y)', () => {
    const ctx = setup();
    ctx.sense.dx = 400;
    ctx.sense.dy = -100;
    step(ctx);
    expect(ctx.s.mode).toBe('hop'); // viu: avança
    expect(ctx.out.velX).toBe(120);

    const other = setup();
    other.out.facing = -1;
    other.sense.dx = 150;
    other.sense.dy = 101;
    step(other);
    expect(other.s.mode).toBe('idle');
    expect(other.out.facing).toBe(-1);
    expect(other.out.startAttack).toBe(false);
  });

  it('alvo morto: não pede ataque nem se desloca para ele', () => {
    const ctx = patrolCtx();
    ctx.sense.dx = 150;
    step(ctx, 100);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('limpa as decisões do frame anterior (reset do output)', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx);
    expect(ctx.out.startAttack).toBe(true);
    ctx.sense.targetAlive = false;
    step(ctx);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.out.fire).toBe(false);
  });

  it('nunca controla o eixo Y', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.controlsY).toBe(false);
    expect(ctx.out.velY).toBe(0);
  });
});

describe('distância', () => {
  it('recua (pula para longe do alvo) se |dx| < minDistanceX, olhando para ele', () => {
    const ctx = setup();
    ctx.sense.dx = 80;
    step(ctx);
    expect(ctx.out.facing).toBe(1);
    expect(ctx.out.velX).toBe(-120);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.s.mode).toBe('hop');
    expect(ctx.s.dir).toBe(-1);

    const other = setup();
    other.sense.dx = -80;
    step(other);
    expect(other.out.facing).toBe(-1);
    expect(other.out.velX).toBe(120);
    expect(other.s.dir).toBe(1);
  });

  it('em exatamente minDistanceX não recua: atira', () => {
    const ctx = setup();
    ctx.sense.dx = 100;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(true);
  });

  it('avança (pula na direção do alvo) se |dx| > maxDistanceX, nos dois lados', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx);
    expect(ctx.out.velX).toBe(120);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.s.mode).toBe('hop');

    const other = setup();
    other.sense.dx = -300;
    step(other);
    expect(other.out.facing).toBe(-1);
    expect(other.out.velX).toBe(-120);
  });

  it('em exatamente maxDistanceX não avança: atira', () => {
    const ctx = setup();
    ctx.sense.dx = 200;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(true);
  });

  it('recua mesmo com parede/beira à frente (sensores da frente não contam para o recuo)', () => {
    const ctx = setup();
    ctx.sense.dx = 50;
    ctx.sense.wallAhead = true;
    ctx.sense.ledgeAhead = true;
    step(ctx);
    expect(ctx.out.velX).toBe(-120);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });

  it('não recua com parede atrás: fica parado e atira', () => {
    const ctx = setup();
    ctx.sense.dx = 50;
    ctx.sense.wallBehind = true;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.startAttack).toBe(true);
    expect(ctx.s.mode).toBe('aim');
  });

  it('não recua com beira atrás (alvo à esquerda também)', () => {
    const ctx = setup();
    ctx.sense.dx = -50;
    ctx.sense.ledgeBehind = true;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(true);
  });

  it('encurralado mas sem poder atirar: fica parado em idle', () => {
    const ctx = setup();
    ctx.sense.dx = 50;
    ctx.sense.wallBehind = true;
    ctx.sense.attackAllowed = false;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.s.mode).toBe('idle');
  });

  it('não avança contra parede: fica parado, olhando para o alvo', () => {
    const ctx = setup();
    ctx.sense.dx = -300;
    ctx.sense.wallAhead = true;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.s.mode).toBe('idle');
    expect(ctx.out.startAttack).toBe(false);
  });

  it('não avança na beira do abismo', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    ctx.sense.ledgeAhead = true;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.s.mode).toBe('idle');
  });

  it('parede/beira não impedem atirar na faixa ideal', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    ctx.sense.wallAhead = true;
    ctx.sense.ledgeAhead = true;
    ctx.sense.wallBehind = true;
    ctx.sense.ledgeBehind = true;
    step(ctx);
    expect(ctx.out.startAttack).toBe(true);
  });

  it('alvo à esquerda com facing padrão: beira/parede à frente bloqueiam o avanço, as de trás o recuo', () => {
    const adv = setup();
    adv.sense.dx = -300;
    adv.sense.ledgeAhead = true;
    step(adv);
    expect(adv.out.jumpVelocity).toBe(0);
    expect(adv.out.velX).toBe(0);
    expect(adv.out.facing).toBe(-1);

    const free = setup();
    free.sense.dx = -300;
    free.sense.wallBehind = true; // atrás não atrapalha quem avança
    step(free);
    expect(free.out.velX).toBe(-120);

    const back = setup();
    back.sense.dx = -50;
    back.sense.wallBehind = true;
    step(back);
    expect(back.out.jumpVelocity).toBe(0);
    expect(back.out.startAttack).toBe(true);
  });
});

describe('pedido de ataque', () => {
  it('pede ataque parado na faixa ideal, virado para o alvo', () => {
    const ctx = setup();
    ctx.sense.dx = -150;
    step(ctx);
    expect(ctx.out.startAttack).toBe(true);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.s.mode).toBe('aim');
  });

  it('não pede se attackAllowed é false', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    ctx.sense.attackAllowed = false;
    step(ctx);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.s.mode).toBe('idle');
  });

  it('só pede com o alvo à altura (|dy| <= sightRangeY)', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    ctx.sense.dy = 100;
    step(ctx);
    expect(ctx.out.startAttack).toBe(true);

    ctx.sense.dy = 101; // fora da visão: patrulha, sem atirar
    step(ctx);
    expect(ctx.out.startAttack).toBe(false);
  });

  it('não pede fora da faixa', () => {
    const far = setup();
    far.sense.dx = 350;
    step(far);
    expect(far.out.startAttack).toBe(false);

    const near = setup();
    near.sense.dx = 50;
    step(near);
    expect(near.out.startAttack).toBe(false);
  });

  it('não pede enquanto o cooldown não zerou (e pede quando zera, no mesmo frame)', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'windup');
    step(ctx, 16, 'active');
    step(ctx, 16, 'idle'); // golpe acabou
    expect(ctx.s.mode).toBe('cooldown');
    step(ctx, 799);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.s.timerMs).toBe(1);
    step(ctx, 1);
    expect(ctx.out.startAttack).toBe(true);
    expect(ctx.s.mode).toBe('aim');
  });

  it('não pede durante o descanso depois de um pulo', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx); // pula em direção ao alvo
    ctx.sense.dx = 150; // chegou na faixa ideal
    hopAndLand(ctx);
    expect(ctx.s.mode).toBe('rest');
    expect(ctx.out.startAttack).toBe(false);
    step(ctx, 399);
    expect(ctx.out.startAttack).toBe(false);
    step(ctx, 1);
    expect(ctx.out.startAttack).toBe(true);
  });
});

describe('ataque em andamento', () => {
  it('fica parado e trava o facing, mesmo se o alvo trocar de lado ou se afastar', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'windup');
    expect(ctx.s.mode).toBe('aim');
    expect(ctx.out.facing).toBe(1);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(false);

    ctx.sense.dx = -50; // passou por trás, perto demais
    step(ctx, 16, 'windup');
    expect(ctx.out.facing).toBe(1);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.jumpVelocity).toBe(0);

    ctx.sense.dx = -380;
    step(ctx, 16, 'active');
    expect(ctx.out.facing).toBe(1);

    ctx.sense.targetAlive = false;
    step(ctx, 16, 'recovery');
    expect(ctx.out.facing).toBe(1);
    expect(ctx.s.mode).toBe('aim');
  });

  it('no primeiro frame do golpe ainda olha para o alvo', () => {
    const ctx = setup();
    ctx.out.facing = 1;
    ctx.sense.dx = -150;
    step(ctx, 16, 'windup');
    expect(ctx.out.facing).toBe(-1);
    ctx.sense.dx = 150;
    step(ctx, 16, 'windup');
    expect(ctx.out.facing).toBe(-1);
  });

  it('não pula mesmo com o alvo longe demais ou perto demais durante o golpe', () => {
    const ctx = setup();
    ctx.sense.dx = 350;
    step(ctx, 16, 'windup');
    expect(ctx.out.jumpVelocity).toBe(0);
    ctx.sense.dx = 10;
    step(ctx, 16, 'active');
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
  });

  it('fire sai exatamente uma vez, na transição windup -> active', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
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
      step(ctx, 16, phase);
      fires.push(ctx.out.fire);
    }
    expect(fires).toEqual([false, false, true, false, false, false, false]);
  });

  it('fire sai mesmo se um dt grande pular a fase ativa (windup -> recovery)', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'windup');
    expect(ctx.out.fire).toBe(false);
    step(ctx, 200, 'recovery');
    expect(ctx.out.fire).toBe(true);
    step(ctx, 16, 'recovery');
    expect(ctx.out.fire).toBe(false);
  });

  it('fire sai se a fase pular direto de idle para active (dt grande)', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'idle');
    step(ctx, 10_000, 'active');
    expect(ctx.out.fire).toBe(true);
  });

  it('um novo ataque dispara de novo', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    let total = 0;
    for (let n = 0; n < 2; n++) {
      step(ctx, 16, 'windup');
      step(ctx, 16, 'active');
      if (ctx.out.fire) total++;
      step(ctx, 16, 'recovery');
      step(ctx, cfg.shootCooldownMs, 'idle');
    }
    expect(total).toBe(2);
  });

  it('fire não sai fora do ataque', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'idle');
    expect(ctx.out.fire).toBe(false);
    ctx.sense.dx = 300;
    step(ctx, 16, 'idle');
    expect(ctx.out.fire).toBe(false);
  });
});

describe('cooldown pós-tiro', () => {
  function afterShot(dx: number): Ctx {
    const ctx = setup();
    ctx.sense.dx = dx;
    step(ctx, 16, 'windup');
    step(ctx, 16, 'active');
    step(ctx, 16, 'recovery');
    step(ctx, 16, 'idle');
    return ctx;
  }

  it('ao voltar a idle entra em cooldown com o tempo cheio, parado', () => {
    const ctx = afterShot(150);
    expect(ctx.s.mode).toBe('cooldown');
    expect(ctx.s.timerMs).toBe(800);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(false);
  });

  it('desconta o timer e fica parado até zerar, mesmo com o alvo longe ou perto', () => {
    const ctx = afterShot(150);
    ctx.sense.dx = 350;
    step(ctx, 500);
    expect(ctx.s.timerMs).toBe(300);
    expect(ctx.s.mode).toBe('cooldown');
    expect(ctx.out.jumpVelocity).toBe(0);
    ctx.sense.dx = 40;
    step(ctx, 299);
    expect(ctx.s.timerMs).toBe(1);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.startAttack).toBe(false);
  });

  it('olha para o alvo enquanto espera', () => {
    const ctx = afterShot(150);
    ctx.sense.dx = -150;
    step(ctx, 100);
    expect(ctx.out.facing).toBe(-1);
  });

  it('ao zerar, decide no mesmo frame: avança se o alvo estiver longe', () => {
    const ctx = afterShot(150);
    ctx.sense.dx = 350;
    step(ctx, 800);
    expect(ctx.out.velX).toBe(120);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.s.mode).toBe('hop');
  });

  it('ao zerar sem ver o alvo, volta a idle', () => {
    const ctx = afterShot(150);
    ctx.sense.targetAlive = false;
    step(ctx, 800);
    expect(ctx.s.mode).toBe('idle');
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('dt enorme zera o timer sem ficar negativo; dt negativo não o aumenta', () => {
    const neg = afterShot(150);
    step(neg, -500);
    expect(neg.s.timerMs).toBe(800);

    const huge = afterShot(150);
    step(huge, 1_000_000);
    expect(huge.s.timerMs).toBe(0);
    expect(huge.out.startAttack).toBe(true);
  });
});

describe('pulo', () => {
  it('jumpVelocity só no frame da decisão; no ar mantém velX e não pede pulo nem tiro', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.velX).toBe(120);

    ctx.sense.grounded = false;
    for (let n = 0; n < 5; n++) {
      step(ctx);
      expect(ctx.out.jumpVelocity).toBe(0);
      expect(ctx.out.velX).toBe(120);
      expect(ctx.out.startAttack).toBe(false);
      expect(ctx.out.fire).toBe(false);
      expect(ctx.s.mode).toBe('hop');
    }
  });

  it('no ar não decide nada, nem na faixa ideal nem perto demais', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx);
    ctx.sense.grounded = false;
    ctx.sense.dx = 150;
    step(ctx);
    expect(ctx.out.startAttack).toBe(false);
    expect(ctx.out.velX).toBe(120);
    ctx.sense.dx = 30;
    step(ctx);
    expect(ctx.out.velX).toBe(120);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('recuo em voo mantém a velocidade para trás e o rosto virado para o alvo', () => {
    const ctx = setup();
    ctx.sense.dx = 50;
    step(ctx);
    expect(ctx.out.velX).toBe(-120);
    ctx.sense.grounded = false;
    step(ctx);
    expect(ctx.out.velX).toBe(-120);
    expect(ctx.out.facing).toBe(1);
  });

  it('pulo de patrulha no ar: mantém meia velocidade e olha para onde vai', () => {
    const ctx = patrolCtx();
    ctx.s.dir = -1;
    ctx.out.facing = -1;
    step(ctx, 1000);
    ctx.sense.grounded = false;
    ctx.out.facing = 1; // qualquer lixo: no ar o facing é recalculado
    step(ctx);
    expect(ctx.out.velX).toBe(-60);
    expect(ctx.out.facing).toBe(-1);
  });

  it('se o alvo aparece no ar, passa a olhar para ele sem mudar a trajetória', () => {
    const ctx = patrolCtx();
    step(ctx, 1000); // pulinho de patrulha para a direita
    ctx.sense.grounded = false;
    ctx.sense.targetAlive = true;
    ctx.sense.dx = -250;
    step(ctx);
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.out.velX).toBe(60);
  });

  it('pouso: entra em rest com restMs, parado, sem pulo', () => {
    const ctx = setup();
    ctx.sense.dx = 300;
    step(ctx);
    ctx.sense.grounded = false;
    step(ctx);
    ctx.sense.grounded = true;
    step(ctx, 50);
    expect(ctx.s.mode).toBe('rest');
    expect(ctx.s.timerMs).toBe(400);
    expect(ctx.s.speed).toBe(0);
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('descanso desconta o dt e só então volta a decidir (pula de novo no frame em que zera)', () => {
    const ctx = setup();
    ctx.sense.dx = 350;
    step(ctx);
    hopAndLand(ctx);
    step(ctx, 100);
    expect(ctx.s.timerMs).toBe(300);
    expect(ctx.out.jumpVelocity).toBe(0);
    step(ctx, 299);
    expect(ctx.s.timerMs).toBe(1);
    expect(ctx.out.jumpVelocity).toBe(0);
    expect(ctx.out.velX).toBe(0);
    step(ctx, 1);
    expect(ctx.out.jumpVelocity).toBe(-300);
    expect(ctx.out.velX).toBe(120);
  });

  it('durante o descanso olha para o alvo', () => {
    const ctx = setup();
    ctx.sense.dx = 350;
    step(ctx);
    hopAndLand(ctx);
    ctx.sense.dx = -350;
    step(ctx, 10);
    expect(ctx.out.facing).toBe(-1);
    expect(ctx.out.jumpVelocity).toBe(0);
  });

  it('com restMs = 0 decide logo ao pousar', () => {
    const quick: HopperConfig = { ...cfg, restMs: 0 };
    const ctx = setup();
    ctx.sense.dx = 350;
    updateHopper(ctx.s, ctx.out, ctx.sense, 16, quick);
    ctx.sense.grounded = false;
    updateHopper(ctx.s, ctx.out, ctx.sense, 16, quick);
    ctx.sense.grounded = true;
    updateHopper(ctx.s, ctx.out, ctx.sense, 16, quick);
    expect(ctx.out.jumpVelocity).toBe(-300);
  });

  it('caindo sem ter pulado (empurrão) mantém velX 0 e depois descansa', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    ctx.sense.grounded = false;
    step(ctx);
    expect(ctx.s.mode).toBe('hop');
    expect(ctx.out.velX).toBe(0);
    expect(ctx.out.startAttack).toBe(false);
    ctx.sense.grounded = true;
    step(ctx);
    expect(ctx.s.mode).toBe('rest');
  });

  it('ataque pedido e recusado pela entidade: volta a decidir no frame seguinte', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx);
    expect(ctx.s.mode).toBe('aim');
    step(ctx); // a fase continua 'idle'
    expect(ctx.out.startAttack).toBe(true);
  });
});

describe('prevPhase', () => {
  it('acompanha a fase de ataque a cada frame, inclusive no ar e sem alvo', () => {
    const ctx = setup();
    ctx.sense.dx = 150;
    step(ctx, 16, 'windup');
    expect(ctx.s.prevPhase).toBe('windup');
    step(ctx, 16, 'active');
    expect(ctx.s.prevPhase).toBe('active');
    ctx.sense.grounded = false;
    ctx.sense.targetAlive = false;
    step(ctx, 16, 'idle');
    expect(ctx.s.prevPhase).toBe('idle');
    step(ctx, 16, 'recovery');
    expect(ctx.s.prevPhase).toBe('recovery');
  });
});

describe('dt estranho', () => {
  it('dt negativo, NaN ou zero não mexem em nenhum timer', () => {
    for (const dt of [-100, Number.NaN, 0]) {
      const ctx = patrolCtx();
      step(ctx, 500);
      const before = ctx.s.timerMs;
      step(ctx, dt);
      expect(ctx.s.timerMs).toBe(before);
      expect(ctx.out.jumpVelocity).toBe(0);
    }
  });

  it('dt NaN no descanso e no cooldown não gera NaN', () => {
    const ctx = setup();
    ctx.sense.dx = 350;
    step(ctx);
    hopAndLand(ctx);
    step(ctx, Number.NaN);
    expect(ctx.s.timerMs).toBe(400);

    const cd = setup();
    cd.sense.dx = 150;
    step(cd, 16, 'windup');
    step(cd, 16, 'recovery');
    step(cd, 16, 'idle');
    step(cd, Number.NaN);
    expect(cd.s.timerMs).toBe(800);
  });
});

describe('determinismo', () => {
  it('a mesma sequência de entradas produz exatamente as mesmas saídas', () => {
    function run(): string {
      const ctx = setup();
      const log: string[] = [];
      const dxs = [320, 320, 150, 150, 60, -60, -150, -320, 150, 150, 150, 150];
      const grounded = [true, false, false, true, true, false, true, true, true, true, true, true];
      const phases: AttackPhase[] = [
        'idle',
        'idle',
        'idle',
        'idle',
        'idle',
        'idle',
        'idle',
        'idle',
        'windup',
        'active',
        'recovery',
        'idle',
      ];
      for (let n = 0; n < dxs.length; n++) {
        ctx.sense.dx = dxs[n] ?? 0;
        ctx.sense.grounded = grounded[n] ?? true;
        step(ctx, 100, phases[n] ?? 'idle');
        log.push(JSON.stringify([ctx.s, ctx.out]));
      }
      return log.join('\n');
    }
    expect(run()).toBe(run());
  });
});

import { describe, expect, it } from 'vitest';
import { attackFrameIndex, heroAnimState, type HeroAnimInput } from '../src/logic/heroAnim';

const THRESHOLD = 20;

function input(overrides: Partial<HeroAnimInput> = {}): HeroAnimInput {
  return {
    grounded: true,
    velX: 0,
    velY: 0,
    rolling: false,
    attackPhase: 'idle',
    stunned: false,
    dead: false,
    landing: false,
    ...overrides,
  };
}

function state(overrides: Partial<HeroAnimInput> = {}): string {
  return heroAnimState(input(overrides), THRESHOLD);
}

describe('heroAnimState', () => {
  it('parado no chão: idle', () => {
    expect(state()).toBe('idle');
  });

  it('morto: dead', () => {
    expect(state({ dead: true })).toBe('dead');
  });

  it('atordoado: hurt', () => {
    expect(state({ stunned: true })).toBe('hurt');
  });

  it('rolando: roll', () => {
    expect(state({ rolling: true })).toBe('roll');
  });

  it('fases do ataque: windup, swing (active) e recover (recovery)', () => {
    expect(state({ attackPhase: 'windup' })).toBe('windup');
    expect(state({ attackPhase: 'active' })).toBe('swing');
    expect(state({ attackPhase: 'recovery' })).toBe('recover');
    expect(state({ attackPhase: 'idle' })).toBe('idle');
  });

  it('no ar subindo: jump; descendo: fall', () => {
    expect(state({ grounded: false, velY: -50 })).toBe('jump');
    expect(state({ grounded: false, velY: 50 })).toBe('fall');
  });

  it('no ar com velY = 0 (topo do pulo): fall', () => {
    expect(state({ grounded: false, velY: 0 })).toBe('fall');
  });

  it('no ar a velocidade horizontal não vira corrida', () => {
    expect(state({ grounded: false, velX: 200, velY: 10 })).toBe('fall');
    expect(state({ grounded: false, velX: 200, velY: -10 })).toBe('jump');
  });

  describe('limiar de corrida', () => {
    it('igual ao limiar não corre', () => {
      expect(state({ velX: THRESHOLD })).toBe('idle');
      expect(state({ velX: -THRESHOLD })).toBe('idle');
    });

    it('acima do limiar corre', () => {
      expect(state({ velX: THRESHOLD + 0.1 })).toBe('run');
    });

    it('velocidade negativa também corre', () => {
      expect(state({ velX: -(THRESHOLD + 0.1) })).toBe('run');
      expect(state({ velX: -200 })).toBe('run');
    });

    it('usa o limiar recebido', () => {
      expect(heroAnimState(input({ velX: 50 }), 100)).toBe('idle');
      expect(heroAnimState(input({ velX: 150 }), 100)).toBe('run');
    });
  });

  describe('prioridades', () => {
    it('morto + atordoado: dead', () => {
      expect(state({ dead: true, stunned: true })).toBe('dead');
    });

    it('morto vence tudo', () => {
      expect(
        state({
          dead: true,
          stunned: true,
          rolling: true,
          attackPhase: 'active',
          grounded: false,
          velX: 300,
        }),
      ).toBe('dead');
    });

    it('atordoado vence rolagem e ataque', () => {
      expect(state({ stunned: true, rolling: true })).toBe('hurt');
      expect(state({ stunned: true, attackPhase: 'windup' })).toBe('hurt');
    });

    it('rolando + atacando: roll', () => {
      expect(state({ rolling: true, attackPhase: 'active' })).toBe('roll');
    });

    it('rolando no ar: roll', () => {
      expect(state({ rolling: true, grounded: false, velY: 10 })).toBe('roll');
    });

    it('no ar atacando: o ataque vence', () => {
      expect(state({ grounded: false, velY: -100, attackPhase: 'active' })).toBe('swing');
      expect(state({ grounded: false, velY: 100, attackPhase: 'windup' })).toBe('windup');
      expect(state({ grounded: false, velY: 100, attackPhase: 'recovery' })).toBe('recover');
    });

    it('correndo e atacando: o ataque vence', () => {
      expect(state({ velX: 110, attackPhase: 'active' })).toBe('swing');
    });
  });
});

describe('pouso e ponto mais alto do pulo', () => {
  it('no ar, quase parado na vertical: apex (só se o limiar for dado)', () => {
    expect(heroAnimState(input({ grounded: false, velY: -10 }), THRESHOLD, 55)).toBe('apex');
    expect(heroAnimState(input({ grounded: false, velY: 10 }), THRESHOLD, 55)).toBe('apex');
    expect(heroAnimState(input({ grounded: false, velY: -10 }), THRESHOLD)).toBe('jump');
    expect(heroAnimState(input({ grounded: false, velY: -200 }), THRESHOLD, 55)).toBe('jump');
    expect(heroAnimState(input({ grounded: false, velY: 200 }), THRESHOLD, 55)).toBe('fall');
  });

  it('acabou de pousar: land, mas só no chão e abaixo de rolagem, golpe e dano', () => {
    expect(state({ landing: true })).toBe('land');
    expect(state({ landing: true, velX: 100 })).toBe('land');
    expect(state({ landing: true, rolling: true })).toBe('roll');
    expect(state({ landing: true, attackPhase: 'windup' })).toBe('windup');
    expect(state({ landing: true, stunned: true })).toBe('hurt');
    expect(state({ landing: true, grounded: false, velY: 300 })).toBe('fall');
  });
});

describe('attackFrameIndex', () => {
  it('percorre todos os quadros da fase, em ordem', () => {
    const seen = [0, 10, 20, 30, 40, 50, 60, 70, 80, 89].map((t) => attackFrameIndex(3, t, 90));
    expect(seen).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 2]);
  });

  it('um quadro só, duração zero ou tempo fora da faixa não quebram', () => {
    expect(attackFrameIndex(1, 50, 100)).toBe(0);
    expect(attackFrameIndex(3, 50, 0)).toBe(0);
    expect(attackFrameIndex(3, -20, 100)).toBe(0);
    expect(attackFrameIndex(3, 500, 100)).toBe(2); // nunca passa do último
  });
});

import { describe, expect, it } from 'vitest';
import { heroAnimState, type HeroAnimInput } from '../src/logic/heroAnim';

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

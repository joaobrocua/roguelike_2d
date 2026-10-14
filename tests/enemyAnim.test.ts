import { describe, expect, it } from 'vitest';
import {
  enemyAnimKey,
  enemyAnimState,
  type EnemyAnimInput,
  type EnemyAnimState,
} from '../src/logic/enemyAnim';

const THRESHOLD = 10;

function input(overrides: Partial<EnemyAnimInput> = {}): EnemyAnimInput {
  return {
    velX: 0,
    velY: 0,
    flying: false,
    airborne: false,
    attackPhase: 'idle',
    stunned: false,
    dead: false,
    ...overrides,
  };
}

function state(overrides: Partial<EnemyAnimInput> = {}): EnemyAnimState {
  return enemyAnimState(input(overrides), THRESHOLD);
}

describe('enemyAnimState', () => {
  it('parado: idle', () => {
    expect(state()).toBe('idle');
  });

  it('morto: dead', () => {
    expect(state({ dead: true })).toBe('dead');
  });

  it('atordoado: hurt', () => {
    expect(state({ stunned: true })).toBe('hurt');
  });

  it('fases do ataque: windup, strike (active) e recover (recovery)', () => {
    expect(state({ attackPhase: 'windup' })).toBe('windup');
    expect(state({ attackPhase: 'active' })).toBe('strike');
    expect(state({ attackPhase: 'recovery' })).toBe('recover');
    expect(state({ attackPhase: 'idle' })).toBe('idle');
  });

  it('andando: walk', () => {
    expect(state({ velX: 50 })).toBe('walk');
    expect(state({ velX: -50 })).toBe('walk');
  });

  describe('limite de movimento', () => {
    it('igual ao limite é idle (estritamente maior)', () => {
      expect(state({ velX: THRESHOLD })).toBe('idle');
      expect(state({ velX: -THRESHOLD })).toBe('idle');
      expect(state({ velX: THRESHOLD, flying: true, velY: THRESHOLD })).toBe('idle');
      expect(state({ velX: -THRESHOLD, flying: true, velY: -THRESHOLD })).toBe('idle');
    });

    it('logo acima do limite é walk', () => {
      expect(state({ velX: THRESHOLD + 0.1 })).toBe('walk');
      expect(state({ velX: -(THRESHOLD + 0.1) })).toBe('walk');
    });

    it('usa o limite recebido', () => {
      expect(enemyAnimState(input({ velX: 50 }), 100)).toBe('idle');
      expect(enemyAnimState(input({ velX: 150 }), 100)).toBe('walk');
    });
  });

  describe('voadores', () => {
    it('velY acima do limite faz walk', () => {
      expect(state({ flying: true, velY: 50 })).toBe('walk');
      expect(state({ flying: true, velY: -50 })).toBe('walk');
    });

    it('velY igual ao limite é idle', () => {
      expect(state({ flying: true, velY: THRESHOLD })).toBe('idle');
      expect(state({ flying: true, velY: -THRESHOLD })).toBe('idle');
    });

    it('velX também conta', () => {
      expect(state({ flying: true, velX: 50 })).toBe('walk');
    });

    it('terrestre ignora velY (queda não vira walk)', () => {
      expect(state({ flying: false, velY: 300 })).toBe('idle');
      expect(state({ flying: false, velY: -300 })).toBe('idle');
    });
  });

  describe('prioridades', () => {
    it('morto vence tudo', () => {
      expect(
        state({
          dead: true,
          stunned: true,
          attackPhase: 'active',
          flying: true,
          velX: 300,
          velY: 300,
        }),
      ).toBe('dead');
    });

    it('atordoado vence ataque e movimento', () => {
      expect(state({ stunned: true, attackPhase: 'windup' })).toBe('hurt');
      expect(state({ stunned: true, attackPhase: 'active' })).toBe('hurt');
      expect(state({ stunned: true, attackPhase: 'recovery' })).toBe('hurt');
      expect(state({ stunned: true, velX: 200 })).toBe('hurt');
    });

    it('ataque vence movimento', () => {
      expect(state({ velX: 200, attackPhase: 'windup' })).toBe('windup');
      expect(state({ velX: 200, attackPhase: 'active' })).toBe('strike');
      expect(state({ flying: true, velY: 200, attackPhase: 'recovery' })).toBe('recover');
    });
  });
});

describe('enemyAnimKey', () => {
  it('monta id-estado', () => {
    expect(enemyAnimKey('bat', 'walk')).toBe('bat-walk');
    expect(enemyAnimKey('skeleton', 'strike')).toBe('skeleton-strike');
  });

  it('cobre todos os estados', () => {
    const states: EnemyAnimState[] = [
      'idle',
      'walk',
      'windup',
      'strike',
      'recover',
      'hurt',
      'dead',
    ];
    for (const s of states) expect(enemyAnimKey('x', s)).toBe(`x-${s}`);
  });
});

describe('estado de pulo', () => {
  const at = (overrides: Partial<EnemyAnimInput>): EnemyAnimState =>
    enemyAnimState(
      {
        velX: 0,
        velY: 0,
        flying: false,
        airborne: false,
        attackPhase: 'idle',
        stunned: false,
        dead: false,
        ...overrides,
      },
      10,
    );

  it('no ar, sem voar: jump (mesmo andando)', () => {
    expect(at({ airborne: true })).toBe('jump');
    expect(at({ airborne: true, velX: 80 })).toBe('jump');
  });

  it('quem voa nunca fica em jump', () => {
    expect(at({ airborne: true, flying: true })).toBe('idle');
  });

  it('dano e golpe valem mais que estar no ar', () => {
    expect(at({ airborne: true, stunned: true })).toBe('hurt');
    expect(at({ airborne: true, attackPhase: 'windup' })).toBe('windup');
    expect(at({ airborne: true, dead: true })).toBe('dead');
  });
});

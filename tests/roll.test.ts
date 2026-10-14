import { describe, expect, it } from 'vitest';
import {
  cancelRoll,
  createRollState,
  isInvulnerable,
  tryStartRoll,
  updateRoll,
  type RollConfig,
} from '../src/logic/roll';

const cfg: RollConfig = { durationMs: 300, invulnerableMs: 200, cooldownMs: 250 };

describe('createRollState', () => {
  it('começa inativo e sem cooldown', () => {
    const s = createRollState();
    expect(s.active).toBe(false);
    expect(s.elapsedMs).toBe(0);
    expect(s.cooldownMs).toBe(0);
  });
});

describe('tryStartRoll', () => {
  it('inicia no chão quando pedido e guarda a direção', () => {
    const s = createRollState();
    expect(tryStartRoll(s, true, -1, true)).toBe(true);
    expect(s.active).toBe(true);
    expect(s.elapsedMs).toBe(0);
    expect(s.direction).toBe(-1);
  });

  it('não inicia sem pedido', () => {
    const s = createRollState();
    expect(tryStartRoll(s, false, 1, true)).toBe(false);
    expect(s.active).toBe(false);
  });

  it('não rola no ar', () => {
    const s = createRollState();
    expect(tryStartRoll(s, true, 1, false)).toBe(false);
    expect(s.active).toBe(false);
  });

  it('não rola já rolando (não reinicia tempo nem direção)', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 100, cfg);
    expect(tryStartRoll(s, true, -1, true)).toBe(false);
    expect(s.elapsedMs).toBe(100);
    expect(s.direction).toBe(1);
  });

  it('direção continua guardada mesmo se a entrada mudar durante a rolagem', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 50, cfg);
    tryStartRoll(s, true, -1, true);
    expect(s.direction).toBe(1);
  });

  it('zera elapsedMs ao iniciar uma nova rolagem', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 300, cfg);
    updateRoll(s, 250, cfg);
    expect(tryStartRoll(s, true, -1, true)).toBe(true);
    expect(s.elapsedMs).toBe(0);
    expect(s.direction).toBe(-1);
  });
});

describe('updateRoll', () => {
  it('soma o tempo enquanto ativa e continua ativa antes da duração', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 299, cfg);
    expect(s.active).toBe(true);
    expect(s.elapsedMs).toBe(299);
  });

  it('termina ao atingir durationMs e inicia o cooldown', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 150, cfg);
    updateRoll(s, 150, cfg);
    expect(s.active).toBe(false);
    expect(s.cooldownMs).toBe(250);
  });

  it('termina mesmo se o dt ultrapassar a duração', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 1000, cfg);
    expect(s.active).toBe(false);
    expect(s.cooldownMs).toBe(250);
  });

  it('cooldown bloqueia nova rolagem e libera após cooldownMs', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 300, cfg); // fim da rolagem
    expect(tryStartRoll(s, true, 1, true)).toBe(false);
    updateRoll(s, 249, cfg);
    expect(s.cooldownMs).toBe(1);
    expect(tryStartRoll(s, true, 1, true)).toBe(false);
    updateRoll(s, 1, cfg);
    expect(s.cooldownMs).toBe(0);
    expect(tryStartRoll(s, true, 1, true)).toBe(true);
  });

  it('cooldown nunca fica negativo', () => {
    const s = createRollState();
    s.cooldownMs = 10;
    updateRoll(s, 500, cfg);
    expect(s.cooldownMs).toBe(0);
  });

  it('não mexe no cooldown enquanto a rolagem está ativa', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 100, cfg);
    expect(s.cooldownMs).toBe(0);
  });
});

describe('isInvulnerable', () => {
  it('é falso quando não está rolando', () => {
    expect(isInvulnerable(createRollState(), cfg)).toBe(false);
  });

  it('é verdadeiro no início da rolagem', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    expect(isInvulnerable(s, cfg)).toBe(true);
  });

  it('é verdadeiro até logo antes de invulnerableMs', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 199, cfg);
    expect(isInvulnerable(s, cfg)).toBe(true);
  });

  it('é falso a partir de invulnerableMs, mesmo ainda rolando', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 200, cfg);
    expect(s.active).toBe(true);
    expect(isInvulnerable(s, cfg)).toBe(false);
  });

  it('é falso depois que a rolagem termina', () => {
    const s = createRollState();
    tryStartRoll(s, true, 1, true);
    updateRoll(s, 300, cfg);
    expect(isInvulnerable(s, cfg)).toBe(false);
  });

  it('é falso no cooldown mesmo com elapsedMs antigo baixo', () => {
    const s = createRollState();
    s.elapsedMs = 0;
    s.cooldownMs = 100;
    expect(isInvulnerable(s, cfg)).toBe(false);
  });
});

describe('cancelRoll', () => {
  it('interrompe a rolagem, zera o tempo e inicia o cooldown', () => {
    const state = createRollState();
    tryStartRoll(state, true, 1, true);
    updateRoll(state, 100, cfg);
    cancelRoll(state, cfg);
    expect(state.active).toBe(false);
    expect(state.elapsedMs).toBe(0);
    expect(isInvulnerable(state, cfg)).toBe(false);
    expect(tryStartRoll(state, true, 1, true)).toBe(false); // cooldown bloqueia
  });
});

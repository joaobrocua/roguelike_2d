import { describe, expect, it } from 'vitest';
import {
  cancelAttack,
  createAttackState,
  isHitboxActive,
  startAttack,
  updateAttack,
  type AttackConfig,
  canCancelRecovery,
} from '../src/logic/attack';

const cfg: AttackConfig = {
  windupMs: 100,
  activeMs: 50,
  recoveryMs: 200,
  damage: 10,
  knockbackX: 200,
  knockbackY: -100,
  hitbox: { width: 40, height: 30, offsetY: 0 },
};

describe('createAttackState', () => {
  it('começa parado', () => {
    expect(createAttackState()).toEqual({
      phase: 'idle',
      elapsedMs: 0,
      swingId: 0,
      resolved: false,
    });
  });
});

describe('startAttack', () => {
  it('começa o golpe em windup com swingId novo', () => {
    const s = createAttackState();
    expect(startAttack(s)).toBe(true);
    expect(s.phase).toBe('windup');
    expect(s.elapsedMs).toBe(0);
    expect(s.resolved).toBe(false);
    expect(s.swingId).toBeGreaterThan(0);
  });

  it('recusa se não estiver em idle, sem mexer no estado', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 30, cfg);
    const id = s.swingId;
    expect(startAttack(s)).toBe(false);
    expect(s.phase).toBe('windup');
    expect(s.elapsedMs).toBe(30);
    expect(s.swingId).toBe(id);

    updateAttack(s, 70, cfg); // active
    expect(startAttack(s)).toBe(false);
    updateAttack(s, 50, cfg); // recovery
    expect(startAttack(s)).toBe(false);
    expect(s.swingId).toBe(id);
  });

  it('gera swingId diferente a cada ataque, mesmo entre estados distintos', () => {
    const a = createAttackState();
    const b = createAttackState();
    startAttack(a);
    const firstA = a.swingId;
    cancelAttack(a);
    startAttack(a);
    startAttack(b);
    expect(a.swingId).not.toBe(firstA);
    expect(b.swingId).not.toBe(a.swingId);
    expect(b.swingId).not.toBe(firstA);
  });

  it('zera resolved ao começar um novo golpe', () => {
    const s = createAttackState();
    startAttack(s);
    s.resolved = true;
    cancelAttack(s);
    startAttack(s);
    expect(s.resolved).toBe(false);
  });
});

describe('updateAttack', () => {
  it('em idle não faz nada', () => {
    const s = createAttackState();
    updateAttack(s, 1000, cfg);
    expect(s).toEqual(createAttackState());
  });

  it('permanece em windup antes da borda e acumula o tempo', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 99, cfg);
    expect(s.phase).toBe('windup');
    expect(s.elapsedMs).toBe(99);
  });

  it('na borda exata do windup passa para active com elapsed 0', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 100, cfg);
    expect(s.phase).toBe('active');
    expect(s.elapsedMs).toBe(0);
  });

  it('na borda exata do active passa para recovery', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 100, cfg);
    updateAttack(s, 49, cfg);
    expect(s.phase).toBe('active');
    updateAttack(s, 1, cfg);
    expect(s.phase).toBe('recovery');
    expect(s.elapsedMs).toBe(0);
  });

  it('na borda exata do recovery volta a idle com elapsed 0', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 150, cfg); // recovery
    updateAttack(s, 199, cfg);
    expect(s.phase).toBe('recovery');
    updateAttack(s, 1, cfg);
    expect(s.phase).toBe('idle');
    expect(s.elapsedMs).toBe(0);
  });

  it('carrega o excedente de tempo para a próxima fase', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 130, cfg); // 100 do windup + 30 de sobra
    expect(s.phase).toBe('active');
    expect(s.elapsedMs).toBe(30);
    updateAttack(s, 40, cfg); // 20 fecham o active, 20 vão para recovery
    expect(s.phase).toBe('recovery');
    expect(s.elapsedMs).toBe(20);
  });

  it('um dt grande atravessa várias fases e termina em idle', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 10000, cfg);
    expect(s.phase).toBe('idle');
    expect(s.elapsedMs).toBe(0);
  });

  it('um dt que cobre windup e active para no meio do recovery', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 180, cfg); // 100 + 50 + 30
    expect(s.phase).toBe('recovery');
    expect(s.elapsedMs).toBe(30);
  });

  it('pula fases de duração 0 sem travar', () => {
    const zero: AttackConfig = { ...cfg, windupMs: 0, activeMs: 0, recoveryMs: 0 };
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 0, zero);
    expect(s.phase).toBe('idle');
    expect(s.elapsedMs).toBe(0);
  });

  it('com só o active em 0, atravessa direto para o recovery', () => {
    const noActive: AttackConfig = { ...cfg, activeMs: 0 };
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 100, noActive);
    expect(s.phase).toBe('recovery');
    expect(s.elapsedMs).toBe(0);
  });

  it('ignora dt negativo', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 50, cfg);
    updateAttack(s, -30, cfg);
    expect(s.elapsedMs).toBe(50);
  });

  it('mantém o swingId durante todo o golpe', () => {
    const s = createAttackState();
    startAttack(s);
    const id = s.swingId;
    updateAttack(s, 120, cfg);
    updateAttack(s, 100, cfg);
    expect(s.swingId).toBe(id);
  });
});

describe('cancelAttack', () => {
  it('volta a idle e zera o tempo em qualquer fase', () => {
    const s = createAttackState();
    startAttack(s);
    updateAttack(s, 120, cfg); // active, 20ms
    cancelAttack(s);
    expect(s.phase).toBe('idle');
    expect(s.elapsedMs).toBe(0);
    expect(startAttack(s)).toBe(true);
  });
});

describe('isHitboxActive', () => {
  it('só é verdadeira na fase active', () => {
    const s = createAttackState();
    expect(isHitboxActive(s)).toBe(false);
    startAttack(s);
    expect(isHitboxActive(s)).toBe(false); // windup
    updateAttack(s, 100, cfg);
    expect(isHitboxActive(s)).toBe(true); // active
    updateAttack(s, 50, cfg);
    expect(isHitboxActive(s)).toBe(false); // recovery
    updateAttack(s, 200, cfg);
    expect(isHitboxActive(s)).toBe(false); // idle
  });
});

describe('canCancelRecovery', () => {
  const cfg = {
    windupMs: 100,
    activeMs: 100,
    recoveryMs: 200,
    damage: 1,
    knockbackX: 0,
    knockbackY: 0,
    hitbox: { width: 1, height: 1, offsetY: 0 },
  };

  it('só vale na recuperação, depois da fração pedida', () => {
    const state = createAttackState();
    expect(canCancelRecovery(state, cfg, 0.5)).toBe(false); // parado
    startAttack(state);
    updateAttack(state, 50, cfg);
    expect(canCancelRecovery(state, cfg, 0)).toBe(false); // na preparação
    updateAttack(state, 150, cfg); // entra na recuperação (0 ms nela)
    expect(state.phase).toBe('recovery');
    expect(canCancelRecovery(state, cfg, 0.5)).toBe(false);
    updateAttack(state, 100, cfg); // 100 de 200 ms
    expect(canCancelRecovery(state, cfg, 0.5)).toBe(true);
  });

  it('limita a fração a 0..1', () => {
    const state = createAttackState();
    startAttack(state);
    updateAttack(state, 250, cfg);
    expect(canCancelRecovery(state, cfg, -3)).toBe(true);
    expect(canCancelRecovery(state, cfg, 9)).toBe(false);
  });
});

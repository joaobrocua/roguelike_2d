import { describe, expect, it } from 'vitest';
import { alreadyPierced, createPierce, registerPierce, resetPierce } from '../src/logic/pierce';

describe('projétil perfurante', () => {
  it('sem perfuração, some no primeiro alvo', () => {
    const state = createPierce();
    resetPierce(state, 0);
    expect(registerPierce(state, {})).toBe(true);
  });

  it('com perfuração 3, atravessa 3 alvos e some no quarto', () => {
    const state = createPierce();
    resetPierce(state, 3);
    const results = [1, 2, 3, 4].map(() => registerPierce(state, {}));
    expect(results).toEqual([false, false, false, true]);
  });

  it('lembra quem já acertou (não acerta o mesmo alvo duas vezes)', () => {
    const state = createPierce();
    resetPierce(state, 2);
    const a = {};
    const b = {};
    expect(alreadyPierced(state, a)).toBe(false);
    registerPierce(state, a);
    expect(alreadyPierced(state, a)).toBe(true);
    expect(alreadyPierced(state, b)).toBe(false);
  });

  it('o disparo novo esquece os acertos e recarrega a perfuração', () => {
    const state = createPierce();
    const a = {};
    resetPierce(state, 1);
    registerPierce(state, a);
    registerPierce(state, {});
    resetPierce(state, 1);
    expect(alreadyPierced(state, a)).toBe(false);
    expect(state.left).toBe(1);
  });

  it('contagem inválida vira zero', () => {
    const state = createPierce();
    resetPierce(state, -2);
    expect(state.left).toBe(0);
    resetPierce(state, 2.9);
    expect(state.left).toBe(2);
  });
});

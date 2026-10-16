import { describe, expect, it } from 'vitest';
import { blocksHit, createGuard, shownDirection, updateGuard } from '../src/logic/shield';

const CFG = { turnLagMs: 400 };

describe('escudo', () => {
  it('protege só o lado para onde a guarda aponta', () => {
    const guard = createGuard(1); // guarda para a direita
    expect(blocksHit(guard, true, 100, 140)).toBe(true); // golpe pela frente
    expect(blocksHit(guard, true, 100, 60)).toBe(false); // golpe pelas costas
  });

  it('um golpe na mesma posição conta como vindo da direita', () => {
    expect(blocksHit(createGuard(1), true, 100, 100)).toBe(true);
    expect(blocksHit(createGuard(-1), true, 100, 100)).toBe(false);
  });

  it('com a guarda baixa nada é bloqueado', () => {
    expect(blocksHit(createGuard(-1), false, 100, 60)).toBe(false);
  });

  it('a guarda só vira depois do atraso', () => {
    const guard = createGuard(-1);
    updateGuard(guard, 1, 300, CFG);
    expect(guard.dir).toBe(-1); // ainda olhando para o lado antigo
    expect(blocksHit(guard, true, 100, 140)).toBe(false); // quem passou para trás é pego
    updateGuard(guard, 1, 150, CFG);
    expect(guard.dir).toBe(1);
    expect(guard.pendingMs).toBe(0);
  });

  it('se o corpo volta a olhar para o lado da guarda, o atraso zera', () => {
    const guard = createGuard(-1);
    updateGuard(guard, 1, 300, CFG);
    updateGuard(guard, -1, 16, CFG);
    expect(guard.pendingMs).toBe(0);
    updateGuard(guard, 1, 300, CFG);
    expect(guard.dir).toBe(-1);
  });

  it('dt negativo não faz o atraso andar para trás', () => {
    const guard = createGuard(-1);
    updateGuard(guard, 1, 200, CFG);
    updateGuard(guard, 1, -500, CFG);
    expect(guard.pendingMs).toBe(200);
  });

  it('atacando (snap) a guarda acompanha o corpo na hora', () => {
    const guard = createGuard(-1);
    updateGuard(guard, 1, 16, CFG, true);
    expect(guard.dir).toBe(1);
    expect(guard.pendingMs).toBe(0);
  });

  it('com a guarda erguida o desenho mostra o lado do escudo, não o do corpo', () => {
    const guard = createGuard(-1);
    updateGuard(guard, 1, 200, CFG); // o corpo já olha para a direita, a guarda ainda não virou
    expect(shownDirection(guard, true, 1)).toBe(-1);
    expect(shownDirection(guard, false, 1)).toBe(1); // guarda baixa: segue o corpo
  });
});

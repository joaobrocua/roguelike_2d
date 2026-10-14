import { describe, expect, it } from 'vitest';
import {
  activeRelic,
  carries,
  createLoadout,
  inactiveRelic,
  registerHit,
  replaceRelic,
  trySwap,
  updateLoadout,
} from '../src/logic/relics';

const CFG = { cooldownMs: 450, strikeWindowMs: 700 };

describe('createLoadout', () => {
  it('começa na primeira relíquia, sem espera e sem acerto', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(l.slots).toEqual(['lamina', 'tomo']);
    expect(l.active).toBe(0);
    expect(l.swapCooldownMs).toBe(0);
    expect(l.sinceHitMs).toBe(Infinity);
  });
});

describe('activeRelic / inactiveRelic', () => {
  it('acompanham o slot ativo', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(activeRelic(l)).toBe('lamina');
    expect(inactiveRelic(l)).toBe('tomo');
    trySwap(l, CFG);
    expect(activeRelic(l)).toBe('tomo');
    expect(inactiveRelic(l)).toBe('lamina');
  });
});

describe('trySwap', () => {
  it('alterna a relíquia ativa e inicia a espera', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(trySwap(l, CFG)).toBe('swapped');
    expect(l.active).toBe(1);
    expect(l.swapCooldownMs).toBe(450);
    updateLoadout(l, 450);
    expect(trySwap(l, CFG)).toBe('swapped');
    expect(l.active).toBe(0);
  });

  it('bloqueia durante a espera e não muda nada', () => {
    const l = createLoadout('lamina', 'tomo');
    trySwap(l, CFG);
    updateLoadout(l, 100);
    registerHit(l);
    expect(trySwap(l, CFG)).toBe('blocked');
    expect(l.active).toBe(1);
    expect(l.swapCooldownMs).toBe(350);
    expect(l.sinceHitMs).toBe(0);
  });

  it('libera de novo quando a espera acaba', () => {
    const l = createLoadout('lamina', 'tomo');
    trySwap(l, CFG);
    updateLoadout(l, 449);
    expect(trySwap(l, CFG)).toBe('blocked');
    updateLoadout(l, 1);
    expect(trySwap(l, CFG)).toBe('swapped');
  });

  it('sem acerto recente, a troca é comum', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(trySwap(l, CFG)).toBe('swapped');
  });

  it('acerto dentro da janela dá o golpe de troca', () => {
    const l = createLoadout('lamina', 'tomo');
    registerHit(l);
    updateLoadout(l, 300);
    expect(trySwap(l, CFG)).toBe('swapped-strike');
  });

  it('a borda da janela é inclusiva (<=)', () => {
    const a = createLoadout('lamina', 'tomo');
    registerHit(a);
    updateLoadout(a, 700);
    expect(trySwap(a, CFG)).toBe('swapped-strike');

    const b = createLoadout('lamina', 'tomo');
    registerHit(b);
    updateLoadout(b, 701);
    expect(trySwap(b, CFG)).toBe('swapped');
  });

  it('um acerto só vale um golpe de troca', () => {
    const l = createLoadout('lamina', 'tomo');
    registerHit(l);
    expect(trySwap(l, CFG)).toBe('swapped-strike');
    expect(l.sinceHitMs).toBe(Infinity);
    updateLoadout(l, 450);
    expect(trySwap(l, CFG)).toBe('swapped');
  });

  it('um novo acerto rearma o golpe de troca', () => {
    const l = createLoadout('lamina', 'tomo');
    registerHit(l);
    trySwap(l, CFG);
    updateLoadout(l, 450);
    registerHit(l);
    expect(trySwap(l, CFG)).toBe('swapped-strike');
  });

  it('troca comum não consome o acerto fora da janela', () => {
    const l = createLoadout('lamina', 'tomo');
    registerHit(l);
    updateLoadout(l, 800);
    expect(trySwap(l, CFG)).toBe('swapped');
    expect(l.sinceHitMs).toBe(800);
  });
});

describe('updateLoadout', () => {
  it('desconta a espera até 0 e soma o tempo desde o acerto', () => {
    const l = createLoadout('lamina', 'tomo');
    trySwap(l, CFG);
    registerHit(l);
    updateLoadout(l, 200);
    expect(l.swapCooldownMs).toBe(250);
    expect(l.sinceHitMs).toBe(200);
    updateLoadout(l, 1000);
    expect(l.swapCooldownMs).toBe(0);
    expect(l.sinceHitMs).toBe(1200);
  });

  it('dt negativo conta como 0', () => {
    const l = createLoadout('lamina', 'tomo');
    trySwap(l, CFG);
    registerHit(l);
    updateLoadout(l, -50);
    expect(l.swapCooldownMs).toBe(450);
    expect(l.sinceHitMs).toBe(0);
  });

  it('Infinity continua Infinity', () => {
    const l = createLoadout('lamina', 'tomo');
    updateLoadout(l, 100);
    expect(l.sinceHitMs).toBe(Infinity);
  });
});

describe('carries', () => {
  it('é verdadeiro só para as relíquias dos dois slots', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(carries(l, 'lamina')).toBe(true);
    expect(carries(l, 'tomo')).toBe(true);
    expect(carries(l, 'foice')).toBe(false);
    expect(carries(l, 'martelo')).toBe(false);
  });
});

describe('replaceRelic', () => {
  it('troca o slot e devolve a relíquia descartada', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(replaceRelic(l, 1, 'foice')).toBe('tomo');
    expect(l.slots).toEqual(['lamina', 'foice']);
    expect(replaceRelic(l, 0, 'martelo')).toBe('lamina');
    expect(l.slots).toEqual(['martelo', 'foice']);
  });

  it('ignora quando a nova já está no OUTRO slot', () => {
    const l = createLoadout('lamina', 'tomo');
    expect(replaceRelic(l, 0, 'tomo')).toBeNull();
    expect(replaceRelic(l, 1, 'lamina')).toBeNull();
    expect(l.slots).toEqual(['lamina', 'tomo']);
  });

  it('não muda o slot ativo', () => {
    const l = createLoadout('lamina', 'tomo');
    trySwap(l, CFG);
    replaceRelic(l, 1, 'foice');
    expect(l.active).toBe(1);
    expect(activeRelic(l)).toBe('foice');
  });
});

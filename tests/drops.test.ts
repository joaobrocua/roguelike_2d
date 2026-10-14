import { describe, expect, it } from 'vitest';
import type { RelicId } from '../src/data/relics';
import { pickupPhase, rollRelicDrop } from '../src/logic/drops';
import { createRng } from '../src/utils/rng';

const POOL: readonly RelicId[] = ['lamina', 'martelo', 'foice', 'tomo'];

/** Rng falso que devolve os valores dados, em ordem (repete o último). */
function fakeRng(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

describe('rollRelicDrop', () => {
  it('chance 0 nunca dropa', () => {
    expect(rollRelicDrop(fakeRng(0), 0, POOL, [])).toBeNull();
    expect(rollRelicDrop(fakeRng(0.5), 0, POOL, [])).toBeNull();
  });

  it('chance 1 sempre dropa uma relíquia disponível', () => {
    expect(rollRelicDrop(fakeRng(0.9999, 0), 1, POOL, ['lamina', 'tomo'])).toBe('martelo');
  });

  it('falha na rolagem de chance devolve null (rng >= chance)', () => {
    expect(rollRelicDrop(fakeRng(0.3), 0.3, POOL, [])).toBeNull();
    expect(rollRelicDrop(fakeRng(0.29, 0), 0.3, POOL, [])).toBe('lamina');
  });

  it('pool vazio devolve null', () => {
    expect(rollRelicDrop(fakeRng(0), 1, [], [])).toBeNull();
  });

  it('pool esgotado (todas carregadas) devolve null', () => {
    expect(rollRelicDrop(fakeRng(0), 1, POOL, [...POOL])).toBeNull();
    expect(rollRelicDrop(fakeRng(0), 1, ['lamina', 'tomo'], ['tomo', 'lamina'])).toBeNull();
  });

  it('escolhe a k-ésima candidata, pulando as carregadas', () => {
    const carried: RelicId[] = ['martelo'];
    // candidatas: lamina, foice, tomo
    expect(rollRelicDrop(fakeRng(0, 0), 1, POOL, carried)).toBe('lamina');
    expect(rollRelicDrop(fakeRng(0, 0.4), 1, POOL, carried)).toBe('foice');
    expect(rollRelicDrop(fakeRng(0, 0.99), 1, POOL, carried)).toBe('tomo');
  });

  it('nunca devolve relíquia carregada', () => {
    const rng = createRng(11);
    const carried: RelicId[] = ['lamina', 'foice'];
    for (let i = 0; i < 2000; i++) {
      const drop = rollRelicDrop(rng, 1, POOL, carried);
      expect(drop === 'martelo' || drop === 'tomo').toBe(true);
    }
  });

  it('é reprodutível com a mesma seed', () => {
    const a = createRng(77);
    const b = createRng(77);
    for (let i = 0; i < 100; i++) {
      expect(rollRelicDrop(a, 0.5, POOL, ['lamina'])).toBe(rollRelicDrop(b, 0.5, POOL, ['lamina']));
    }
  });

  it('a taxa de drop e a distribuição entre candidatas são aproximadamente as esperadas', () => {
    const rng = createRng(2025);
    const counts: Record<string, number> = { lamina: 0, martelo: 0, foice: 0, tomo: 0 };
    let drops = 0;
    const rounds = 20000;
    for (let i = 0; i < rounds; i++) {
      const d = rollRelicDrop(rng, 0.3, POOL, ['lamina']);
      if (d !== null) {
        drops++;
        counts[d] = (counts[d] ?? 0) + 1;
      }
    }
    expect(drops / rounds).toBeGreaterThan(0.27);
    expect(drops / rounds).toBeLessThan(0.33);
    expect(counts.lamina).toBe(0);
    for (const id of ['martelo', 'foice', 'tomo']) {
      expect((counts[id] ?? 0) / drops).toBeGreaterThan(0.3);
      expect((counts[id] ?? 0) / drops).toBeLessThan(0.37);
    }
  });
});

describe('pickupPhase', () => {
  it('fica parada, avisa nos últimos instantes e então expira', () => {
    expect(pickupPhase(0, 10000, 3000)).toBe('idle');
    expect(pickupPhase(6999, 10000, 3000)).toBe('idle');
    expect(pickupPhase(7000, 10000, 3000)).toBe('warning');
    expect(pickupPhase(9999, 10000, 3000)).toBe('warning');
    expect(pickupPhase(10000, 10000, 3000)).toBe('expired');
  });

  it('com vida infinita nunca expira nem avisa', () => {
    expect(pickupPhase(1e9, Number.POSITIVE_INFINITY, 3000)).toBe('idle');
  });
});

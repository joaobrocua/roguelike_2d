import { describe, expect, it } from 'vitest';
import { createMetaSave } from '../src/logic/meta/save';
import { bankSouls, earnSouls, loseSoulsOnDeath, recordRunEnd } from '../src/logic/meta/souls';
import type { SoulWallet } from '../src/logic/meta/souls';

function wallet(souls = 0): SoulWallet {
  return { souls };
}

describe('earnSouls', () => {
  it('soma o valor base com multiplicador 1', () => {
    const w = wallet();
    expect(earnSouls(w, 3, 1)).toBe(3);
    expect(w.souls).toBe(3);
  });

  it('aplica o multiplicador e arredonda', () => {
    const w = wallet(10);
    expect(earnSouls(w, 40, 1.3)).toBe(52);
    expect(w.souls).toBe(62);
    expect(earnSouls(w, 3, 1.1)).toBe(3); // 3,3
    expect(earnSouls(w, 4, 1.4)).toBe(6); // 5,6
    expect(w.souls).toBe(71);
  });

  it('rende no mínimo 1 quando o ganho base é positivo', () => {
    const w = wallet();
    expect(earnSouls(w, 1, 0.1)).toBe(1);
    expect(earnSouls(w, 2, 0.01)).toBe(1);
    expect(w.souls).toBe(2);
  });

  it('ignora ganho base zero, negativo ou inválido', () => {
    const w = wallet(5);
    expect(earnSouls(w, 0, 2)).toBe(0);
    expect(earnSouls(w, -4, 2)).toBe(0);
    expect(earnSouls(w, Number.NaN, 2)).toBe(0);
    expect(earnSouls(w, Number.POSITIVE_INFINITY, 2)).toBe(0);
    expect(w.souls).toBe(5);
  });

  it('multiplicador inválido não corrompe a carteira', () => {
    const w = wallet();
    expect(earnSouls(w, 4, Number.NaN)).toBe(4);
    expect(earnSouls(w, 4, -2)).toBe(4);
    expect(w.souls).toBe(8);
  });
});

describe('bankSouls', () => {
  it('move tudo para o saldo e o total ganho e zera a carteira', () => {
    const save = createMetaSave();
    save.souls = 10;
    save.stats.totalSouls = 100;
    const w = wallet(35);
    expect(bankSouls(w, save)).toBe(35);
    expect(w.souls).toBe(0);
    expect(save.souls).toBe(45);
    expect(save.stats.totalSouls).toBe(135);
  });

  it('carteira vazia não muda nada', () => {
    const save = createMetaSave();
    expect(bankSouls(wallet(), save)).toBe(0);
    expect(save).toEqual(createMetaSave());
  });

  it('carteira com valor inválido guarda 0 e não suja o save', () => {
    const save = createMetaSave();
    const w = wallet(Number.NaN);
    expect(bankSouls(w, save)).toBe(0);
    expect(save).toEqual(createMetaSave());
    expect(w.souls).toBe(0);
  });
});

describe('loseSoulsOnDeath', () => {
  it('retenção 0: perde tudo', () => {
    const save = createMetaSave();
    const w = wallet(50);
    expect(loseSoulsOnDeath(w, save, 0)).toEqual({ kept: 0, lost: 50 });
    expect(save.souls).toBe(0);
    expect(save.stats.totalSouls).toBe(0);
    expect(w.souls).toBe(0);
  });

  it('retenção 0,5: guarda metade, arredondando para baixo', () => {
    const save = createMetaSave();
    save.souls = 5;
    expect(loseSoulsOnDeath(wallet(51), save, 0.5)).toEqual({ kept: 25, lost: 26 });
    expect(save.souls).toBe(30);
    expect(save.stats.totalSouls).toBe(25);
  });

  it('retenção 1: guarda tudo', () => {
    const save = createMetaSave();
    const w = wallet(77);
    expect(loseSoulsOnDeath(w, save, 1)).toEqual({ kept: 77, lost: 0 });
    expect(save.souls).toBe(77);
    expect(save.stats.totalSouls).toBe(77);
    expect(w.souls).toBe(0);
  });

  it('retenção fora de 0..1 é limitada', () => {
    expect(loseSoulsOnDeath(wallet(10), createMetaSave(), 3)).toEqual({ kept: 10, lost: 0 });
    expect(loseSoulsOnDeath(wallet(10), createMetaSave(), -1)).toEqual({ kept: 0, lost: 10 });
    expect(loseSoulsOnDeath(wallet(10), createMetaSave(), Number.NaN)).toEqual({
      kept: 0,
      lost: 10,
    });
  });

  it('com retenção do teto da meta (0,6): 10 almas guardam 6', () => {
    expect(loseSoulsOnDeath(wallet(10), createMetaSave(), 0.6)).toEqual({ kept: 6, lost: 4 });
  });

  it('kept + lost sempre soma o que a run carregava', () => {
    for (const carried of [0, 1, 7, 99, 1234]) {
      for (const retention of [0, 0.15, 0.3, 0.45, 0.6, 1]) {
        const result = loseSoulsOnDeath(wallet(carried), createMetaSave(), retention);
        expect(result.kept + result.lost).toBe(carried);
      }
    }
  });
});

describe('recordRunEnd', () => {
  it('derrota: só conta a run', () => {
    const save = createMetaSave();
    recordRunEnd(save, false);
    expect(save.stats).toEqual({ runs: 1, victories: 0, totalSouls: 0 });
  });

  it('vitória: conta a run e a vitória', () => {
    const save = createMetaSave();
    recordRunEnd(save, false);
    recordRunEnd(save, true);
    recordRunEnd(save, true);
    expect(save.stats).toEqual({ runs: 3, victories: 2, totalSouls: 0 });
  });
});

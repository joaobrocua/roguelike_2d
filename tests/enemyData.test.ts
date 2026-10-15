import { describe, expect, it } from 'vitest';
import {
  CAO_DE_OSSOS,
  ENEMY_BODIES,
  ENEMY_MARKERS,
  LOBO_ESPECTRAL,
  RAIZ_EMBOSCADORA,
} from '../src/data/enemies';
import { SOUL_REWARD } from '../src/data/meta';

describe('inimigos da floresta (dados)', () => {
  it('todo marcador de inimigo aponta para um inimigo que existe e que rende almas', () => {
    const ids = new Set(ENEMY_BODIES.map((body) => body.id));
    for (const [char, id] of Object.entries(ENEMY_MARKERS)) {
      expect(ids.has(id), `${char} -> ${id}`).toBe(true);
      expect(SOUL_REWARD[id], id).toBeGreaterThan(0);
    }
  });

  it('o lobo é mais rápido e perigoso que o cão, mas telegrafa o bote', () => {
    expect(LOBO_ESPECTRAL.ai.chaseSpeed).toBeGreaterThan(CAO_DE_OSSOS.ai.chaseSpeed);
    expect(LOBO_ESPECTRAL.attack.damage).toBeGreaterThan(CAO_DE_OSSOS.attack.damage);
    expect(LOBO_ESPECTRAL.attack.windupMs).toBeGreaterThanOrEqual(200); // dá tempo de rolar
  });

  it('a raiz telegrafa o chicote, acorda antes de poder atacar e é difícil de empurrar', () => {
    const ai = RAIZ_EMBOSCADORA.ai;
    expect(RAIZ_EMBOSCADORA.attack.windupMs).toBeGreaterThanOrEqual(400);
    expect(ai.wakeRangeX).toBeGreaterThan(ai.attackRangeX); // dá para ver e sair antes de ser acertado
    expect(ai.sleepRangeX).toBeGreaterThan(ai.wakeRangeX); // não acorda e dorme no mesmo passo
    expect(ai.riseMs).toBeGreaterThan(0);
    expect(ai.sinkMs).toBeGreaterThan(0);
    // O chicote alcança além do corpo, mas não mais que o alcance de ataque da IA
    const reach = RAIZ_EMBOSCADORA.width / 2 + RAIZ_EMBOSCADORA.attack.hitbox.width;
    expect(reach).toBeGreaterThanOrEqual(ai.attackRangeX - 10);
    expect(RAIZ_EMBOSCADORA.knockbackScale).toBeLessThan(1);
  });
});

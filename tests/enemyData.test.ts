import { describe, expect, it } from 'vitest';
import {
  CAO_DE_OSSOS,
  ENEMY_BODIES,
  ENEMY_MARKERS,
  FOGO_FATUO,
  LOBO_ESPECTRAL,
  RAIZ_EMBOSCADORA,
  SAPO_PECONHENTO,
  VULTO,
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

  it('o cuspe do sapo cai na faixa em que ele quer ficar (e dá tempo de ver a gota)', () => {
    const { spit, ai } = SAPO_PECONHENTO;
    // Alcance do arco até o nível do chão, uns 10 px abaixo de onde sai (resolve a parábola)
    const drop = 10;
    const a = spit.gravityY / 2;
    const t = (-spit.speedY + Math.sqrt(spit.speedY ** 2 + 4 * a * drop)) / (2 * a);
    const range = spit.speed * t;
    expect(range).toBeGreaterThanOrEqual(ai.minDistanceX);
    expect(range).toBeLessThanOrEqual(ai.maxDistanceX + 20);
    expect(spit.lifeMs / 1000).toBeGreaterThan(t);
    expect(ai.minDistanceX).toBeLessThan(ai.maxDistanceX);
    expect(ai.sightRangeX).toBeGreaterThanOrEqual(ai.maxDistanceX);
    expect(SAPO_PECONHENTO.attack.windupMs).toBeGreaterThanOrEqual(500); // dá tempo de reagir
    expect(spit.width).toBe(6); // a textura do cuspe é 6 x 6
    expect(spit.height).toBe(6);
  });

  it('o fogo-fátuo é uma versão mais fraca e luminosa do vulto', () => {
    expect(FOGO_FATUO.maxHp).toBeLessThan(VULTO.maxHp);
    expect(FOGO_FATUO.attack.windupMs).toBeGreaterThanOrEqual(400);
    expect(FOGO_FATUO.light.radius).toBeGreaterThan(0);
    expect(FOGO_FATUO.light.strength).toBeLessThanOrEqual(1);
  });
});

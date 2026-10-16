import { describe, expect, it } from 'vitest';
import {
  CAO_DE_OSSOS,
  CARNICAL,
  ENEMY_BODIES,
  ENEMY_MARKERS,
  FOGO_FATUO,
  GOLEM_DE_PEDRA,
  LOBO_ESPECTRAL,
  MORCEGO_DE_CRISTAL,
  NECROMANTE,
  NECROMANTE_ORBS,
  RAIZ_EMBOSCADORA,
  SAPO_PECONHENTO,
  SOLDADO_CAIDO,
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

  it('o soldado telegrafa a estocada, a lança alcança o que a IA mira e a guarda dá tempo de contornar', () => {
    const { attack, ai, guard } = SOLDADO_CAIDO;
    expect(attack.windupMs).toBeGreaterThanOrEqual(450); // dá tempo de rolar
    // A estocada alcança até onde a IA começa a atacar (e um pouco mais)
    const reach = SOLDADO_CAIDO.width / 2 + attack.hitbox.width;
    expect(reach).toBeGreaterThanOrEqual(ai.attackRangeX);
    // A guarda demora a virar: menos que uma estocada inteira, mais que um piscar
    expect(guard.turnLagMs).toBeGreaterThanOrEqual(250);
    expect(guard.turnLagMs).toBeLessThan(attack.windupMs + attack.activeMs + attack.recoveryMs);
    expect(SOLDADO_CAIDO.maxHp).toBeGreaterThan(CARNICAL.maxHp); // o escudo o torna o mais duro
    expect(SOLDADO_CAIDO.knockbackScale).toBeLessThan(1);
  });

  it('o necromante é frágil, telegrafa o leque e os orbes sobem e descem devagar', () => {
    const { ai, attack } = NECROMANTE;
    expect(NECROMANTE.maxHp).toBeLessThan(SOLDADO_CAIDO.maxHp);
    expect(attack.windupMs).toBeGreaterThanOrEqual(600);
    expect(ai.minDistanceX).toBeLessThan(ai.maxDistanceX);
    expect(ai.sightRangeX).toBeGreaterThanOrEqual(ai.maxDistanceX);
    expect(NECROMANTE_ORBS).toHaveLength(3);
    const speedsY = NECROMANTE_ORBS.map((orb) => orb.speedY ?? 0);
    expect(speedsY).toEqual([...speedsY].sort((a, b) => a - b)); // do de cima para o de baixo
    expect(Math.min(...speedsY)).toBeLessThan(0);
    expect(Math.max(...speedsY)).toBeGreaterThan(0);
    for (const orb of NECROMANTE_ORBS) {
      // Nos extremos do alcance de tiro, o orbe desvia no máximo a faixa que a IA aceita atirar
      const drift = Math.abs(orb.speedY ?? 0) * (ai.maxDistanceX / orb.speed);
      expect(drift).toBeLessThanOrEqual(ai.shootRangeY + 10);
      expect(orb.width).toBe(7); // a textura do orbe é 7 x 7
      expect(orb.height).toBe(7);
      expect(orb.lifeMs / 1000).toBeGreaterThan(ai.maxDistanceX / orb.speed);
    }
  });

  it('o golem é lento e firme, telegrafa a pancada e a onda alcança o que a IA mira', () => {
    const { attack, ai } = GOLEM_DE_PEDRA;
    expect(attack.windupMs).toBeGreaterThanOrEqual(600); // dá tempo de sair do alcance
    expect(GOLEM_DE_PEDRA.meleeShape).toBe('around');
    // A onda é centrada nele: o raio dela cobre o alcance de ataque da IA
    expect(attack.hitbox.width / 2).toBeGreaterThanOrEqual(ai.attackRangeX);
    expect(attack.hitbox.width / 2).toBeGreaterThan(GOLEM_DE_PEDRA.width / 2);
    expect(GOLEM_DE_PEDRA.knockbackScale).toBeLessThanOrEqual(0.25);
    expect(ai.chaseSpeed).toBeLessThan(CARNICAL.ai.chaseSpeed); // mais lento que um carniçal
    for (const body of ENEMY_BODIES)
      expect(GOLEM_DE_PEDRA.maxHp).toBeGreaterThanOrEqual(body.maxHp);
  });

  it('o morcego é uma versão mais frágil e mais rápida do vulto, e os cristais iluminam', () => {
    expect(MORCEGO_DE_CRISTAL.maxHp).toBeLessThan(VULTO.maxHp);
    expect(MORCEGO_DE_CRISTAL.ai.diveSpeed).toBeGreaterThan(VULTO.ai.diveSpeed);
    expect(MORCEGO_DE_CRISTAL.attack.windupMs).toBeGreaterThanOrEqual(250); // dá para ver o aviso
    expect(MORCEGO_DE_CRISTAL.light.radius).toBeGreaterThan(0);
    expect(MORCEGO_DE_CRISTAL.light.strength).toBeLessThanOrEqual(1);
  });
});

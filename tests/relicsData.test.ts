import { describe, expect, it } from 'vitest';
import { RELIC_DROP, RELIC_IDS, RELICS, SWAP, relicIconKey } from '../src/data/relics';

describe('dados das relíquias', () => {
  it('toda relíquia do catálogo existe e tem o id certo', () => {
    expect(RELIC_IDS).toHaveLength(14);
    expect(new Set(RELIC_IDS).size).toBe(RELIC_IDS.length);
    for (const id of RELIC_IDS) expect(RELICS[id].id).toBe(id);
  });

  it('cada relíquia tem pelo menos um golpe básico e tempos positivos', () => {
    for (const id of RELIC_IDS) {
      const relic = RELICS[id];
      expect(relic.basic.steps.length).toBeGreaterThan(0);
      for (const step of [...relic.basic.steps, relic.special.attack]) {
        expect(step.windupMs).toBeGreaterThanOrEqual(0);
        expect(step.activeMs).toBeGreaterThan(0);
        expect(step.recoveryMs).toBeGreaterThanOrEqual(0);
      }
      expect(relic.special.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('golpes com forma têm caixa de acerto e dano; golpes sem forma não têm caixa', () => {
    for (const id of RELIC_IDS) {
      const relic = RELICS[id];
      for (const step of [...relic.basic.steps, relic.special.attack]) {
        if (step.shape === 'none') continue;
        expect(step.hitbox.width).toBeGreaterThan(0);
        expect(step.hitbox.height).toBeGreaterThan(0);
        expect(step.damage).toBeGreaterThan(0);
      }
    }
  });

  it('o combo só existe se houver janela, e as passivas são multiplicadores positivos', () => {
    for (const id of RELIC_IDS) {
      const relic = RELICS[id];
      if (relic.basic.steps.length > 1) expect(relic.basic.comboWindowMs).toBeGreaterThan(0);
      for (const value of Object.values(relic.passive)) expect(value).toBeGreaterThan(0);
    }
  });

  it('cada especial tem o que o seu tipo precisa', () => {
    expect(RELICS.lamina.special.attack.lungeSpeed).toBeGreaterThan(0); // investida
    expect(RELICS.martelo.special.attack.stunMs).toBeGreaterThan(0); // atordoa
    expect(RELICS.foice.special.attack.lifeSteal).toBeGreaterThan(0); // rouba vida
    expect(RELICS.tomo.special.barrier?.durationMs).toBeGreaterThan(0); // barreira
    expect(RELICS.tomo.basic.steps[0]?.projectile).toBeDefined(); // raio
    expect(RELICS.adaga.basic.steps.length).toBe(4); // combo rápido
    expect(RELICS.lanca.special.attack.lungeSpeed).toBeGreaterThan(0); // arremetida
    expect(RELICS.machado.special.attack.shape).toBe('around'); // giro
    expect(RELICS.arco.basic.steps[0]?.projectile).toBeDefined(); // flecha
    expect(RELICS.arco.special.attack.projectile?.stunMs).toBeGreaterThan(0); // flecha pesada
    expect(RELICS.mangual.basic.steps[1]?.shape).toBe('around'); // giro no segundo golpe
    expect(RELICS.laminas.basic.steps.length).toBe(5); // combo veloz de 5 golpes
    expect(RELICS.laminas.special.attack.shape).toBe('around'); // redemoinho
    expect(RELICS.escudo.special.guard?.parryMs).toBeGreaterThan(0); // guarda com defesa perfeita
    expect(RELICS.escudo.special.attack.activeMs).toBeGreaterThanOrEqual(600); // a guarda dura
    expect(RELICS.escudo.basic.steps[1]?.stunMs).toBeGreaterThan(0); // golpe de escudo atordoa
    expect(RELICS.chicote.special.attack.knockbackX).toBeLessThan(0); // o gancho puxa
    expect(RELICS.chicote.basic.steps[0]?.hitbox.width).toBeGreaterThanOrEqual(56); // alcance longo
    expect(RELICS.cajado.basic.steps[0]?.projectile?.gravityY).toBeGreaterThan(0); // brasa em arco
    expect(RELICS.cajado.special.attack.projectiles?.length).toBe(3); // leque de brasas
    expect(RELICS.besta.special.attack.projectile?.pierce).toBeGreaterThan(0); // virote que atravessa
  });

  it('as armas são variadas: nenhuma repete o conjunto de básico e especial de outra', () => {
    const signatures = RELIC_IDS.map((id) => {
      const { basic, special } = RELICS[id];
      return JSON.stringify([basic.steps, special.attack]);
    });
    expect(new Set(signatures).size).toBe(RELIC_IDS.length);
  });

  it('o tempo das relíquias largadas por inimigos é maior que o aviso', () => {
    expect(RELIC_DROP.lifetimeMs).toBeGreaterThan(RELIC_DROP.warnMs);
    expect(RELIC_DROP.blinkMs).toBeGreaterThan(0);
  });

  it('a troca tem espera menor que a janela do golpe de troca', () => {
    expect(SWAP.cooldownMs).toBeGreaterThan(0);
    expect(SWAP.strikeWindowMs).toBeGreaterThan(SWAP.cooldownMs);
  });
});

describe('textos das relíquias na interface', () => {
  /** Fonte pixel de 8 px: 1 caractere = 8 px. Limites das áreas de texto das telas. */
  const MAX_SUMMARY_CHARS = 24; // ficha da relíquia encontrada
  const MAX_PASSIVE_CHARS = 18; // cartão de uma relíquia carregada

  it('as frases curtas cabem nas áreas de texto', () => {
    for (const id of RELIC_IDS) {
      const { summary, passiveText, name } = RELICS[id];
      for (const text of [summary.basic, summary.special]) {
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(MAX_SUMMARY_CHARS);
      }
      expect(passiveText.length).toBeGreaterThan(0);
      expect(passiveText.length).toBeLessThanOrEqual(MAX_PASSIVE_CHARS);
      expect(name.length).toBeLessThanOrEqual(MAX_PASSIVE_CHARS);
    }
  });

  it('o texto da passiva bate com os números da passiva', () => {
    for (const id of RELIC_IDS) {
      const { passive, passiveText } = RELICS[id];
      const changed = Object.values(passive).filter((value) => value !== 1);
      expect(changed).toHaveLength(1); // cada relíquia tem uma passiva só
      const value = changed[0] ?? 1;
      const percent = Math.round(Math.abs(value - 1) * 100);
      expect(passiveText).toContain(`${value > 1 ? '+' : '-'}${percent}%`);
    }
  });

  it('a chave do ícone é única por relíquia', () => {
    const keys = RELIC_IDS.map((id) => relicIconKey(id));
    expect(new Set(keys).size).toBe(RELIC_IDS.length);
  });
});

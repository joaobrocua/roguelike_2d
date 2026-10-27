import { describe, expect, it } from 'vitest';
import { GUARDIAO } from '../src/data/boss';
import { BIOME_NAMES, BIOME_SHORT_NAMES } from '../src/data/mapRules';
import { RELIC_IDS, RELICS } from '../src/data/relics';
import { UPGRADE_NODES } from '../src/data/meta';
import {
  BANNER,
  DEATH_SCREEN,
  HUD,
  RELIC_CHOICE,
  SANCTUARY,
  TITLE_SCREEN,
  VICTORY_SCREEN,
} from '../src/data/ui';
import { SHRINE } from '../src/data/rooms';
import { EPILOGUE, INTRO_CARDS, STORY } from '../src/data/story';
import { GLYPH_SET, unsupportedChars } from '../src/logic/glyphs';

describe('unsupportedChars', () => {
  it('devolve vazio quando todos os caracteres existem', () => {
    expect(unsupportedChars('Nova relíquia: 100/100!')).toBe('');
    expect(unsupportedChars('VOCÊ CAIU\nação')).toBe('');
  });

  it('lista cada caractere que falta uma vez só, na ordem em que aparece', () => {
    expect(unsupportedChars('a€b€c☃', 'abc')).toBe('€☃');
  });

  it('o conjunto não repete caracteres (cada glifo ocupa uma casa do atlas)', () => {
    expect(new Set(GLYPH_SET).size).toBe(GLYPH_SET.length);
  });
});

describe('os textos do jogo só usam glifos que a fonte tem', () => {
  const texts: Record<string, string> = {
    morte: `${DEATH_SCREEN.title} ${DEATH_SCREEN.prompt}`,
    vitoria: `${VICTORY_SCREEN.title} ${EPILOGUE.join(' ')} ${VICTORY_SCREEN.prompt}`,
    historia: [
      ...INTRO_CARDS.map((card) => card.text),
      STORY.prompt,
      STORY.promptTouch,
      STORY.skip,
      STORY.skipTouch,
      TITLE_SCREEN.menu.story,
    ].join(' '),
    avisos: [BANNER.sealed, BANNER.miniBossCaption, BANNER.exitOpened].join(' '),
    relicChoice: [
      RELIC_CHOICE.title,
      RELIC_CHOICE.newLabel,
      RELIC_CHOICE.discardLabel,
      RELIC_CHOICE.keep,
      RELIC_CHOICE.activeTag,
      ...Object.values(RELIC_CHOICE.rows),
      RELIC_CHOICE.hint,
    ].join(' '),
    dicas: HUD.hints.items.map((item) => `${item.keys.join('')}${item.label}`).join(' '),
    faixa: `${BANNER.actLabel} ${BANNER.acts.join(' ')} ${Object.values(BANNER.sanctuary).join(' ')}`,
    biomas: [...Object.values(BIOME_NAMES), ...Object.values(BIOME_SHORT_NAMES)].join(' '),
    chefe: GUARDIAO.name.toUpperCase(),
    santuario: [
      SANCTUARY.title,
      SHRINE.label,
      SANCTUARY.startLabel,
      SANCTUARY.startHelp,
      SANCTUARY.hint,
      ...Object.values(SANCTUARY.columns),
      ...Object.values(SANCTUARY.status),
      ...UPGRADE_NODES.flatMap((node) => [node.name, node.description]),
    ].join(' '),
    bioma: `${BANNER.bankedLabel} ${DEATH_SCREEN.keptLabel} ${DEATH_SCREEN.lostLabel} ${VICTORY_SCREEN.bankedLabel}`,
    reliquias: RELIC_IDS.map((id) => {
      const relic = RELICS[id];
      return `${relic.name} ${relic.summary.basic} ${relic.summary.special} ${relic.passiveText}`;
    }).join(' '),
  };

  for (const [name, text] of Object.entries(texts)) {
    it(`texto de ${name}`, () => {
      expect(unsupportedChars(text), text).toBe('');
    });
  }
});

describe('micro fonte das teclas da HUD', () => {
  it('toda tecla usada na HUD tem letra desenhada (3x5)', async () => {
    const { MICRO_GLYPHS, MICRO_GLYPH } = await import('../src/data/microFont');
    const keys = [...HUD.hints.items.flatMap((item) => item.keys), 'K', 'Q'];
    for (const key of keys) {
      const rows = MICRO_GLYPHS[key];
      expect(rows, key).toBeDefined();
      expect(rows?.length, key).toBe(MICRO_GLYPH.height);
      for (const row of rows ?? []) expect(row.length, key).toBe(MICRO_GLYPH.width);
    }
  });
});

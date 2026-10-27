import { describe, expect, it } from 'vitest';
import { GAME_SIZE } from '../src/data/balance';
import { PIXEL_FONT } from '../src/data/ui';
import { EPILOGUE, INTRO_CARDS, STORY, STORY_STORAGE, type StoryArt } from '../src/data/story';
import type { StorageLike } from '../src/logic/meta/save';
import { typingDuration, visibleChars } from '../src/logic/typewriter';
import {
  introViews,
  recordIntroShown,
  shouldPlayIntro,
  type StorySession,
} from '../src/systems/storyStore';

/** Largura de um caractere da fonte de pixels (monoespaçada), no tamanho 1. */
const CHAR_WIDTH = PIXEL_FONT.glyphSize;

/** Quebra de linha por palavras numa fonte monoespaçada (como o texto da abertura). */
function wrapLines(text: string, perLine: number): number {
  let lines = 1;
  let used = 0;
  for (const word of text.split(' ')) {
    const need = used === 0 ? word.length : word.length + 1;
    if (used + need > perLine) {
      lines++;
      used = word.length;
    } else {
      used += need;
    }
  }
  return lines;
}

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('história: dados', () => {
  it('a abertura tem cartões curtos, cada um com uma ilustração conhecida', () => {
    const known: readonly StoryArt[] = ['castle', 'outlands', 'guardian', 'watcher', 'descent'];
    expect(INTRO_CARDS.length).toBeGreaterThanOrEqual(3);
    expect(INTRO_CARDS.length).toBeLessThanOrEqual(8);
    for (const card of INTRO_CARDS) {
      expect(known, card.art).toContain(card.art);
      expect(card.text.trim().length, card.art).toBeGreaterThan(20);
    }
  });

  it('cada ilustração é usada uma vez e o texto cabe na faixa, acima do aviso de continuar', () => {
    const arts = INTRO_CARDS.map((card) => card.art);
    expect(new Set(arts).size).toBe(arts.length);
    const perLine = Math.floor(STORY.panel.textWidth / CHAR_WIDTH);
    const lineHeight = 11; // altura de uma linha de texto (px)
    const bottomReserve = 24; // pontinhos e aviso de continuar
    const maxLines = Math.floor(
      (GAME_SIZE.height - STORY.panel.textY - bottomReserve) / lineHeight,
    );
    for (const card of INTRO_CARDS) {
      expect(wrapLines(card.text, perLine), card.art).toBeLessThanOrEqual(maxLines);
    }
  });

  it('o epílogo tem duas linhas que cabem na largura da tela', () => {
    for (const line of EPILOGUE) {
      expect(line.length * CHAR_WIDTH, line).toBeLessThanOrEqual(GAME_SIZE.width - 20);
    }
  });

  it('a faixa do texto fica dentro da tela e o ritmo da digitação é razoável', () => {
    expect(STORY.panel.top).toBeGreaterThan(GAME_SIZE.height / 2);
    expect(STORY.panel.textY).toBeGreaterThan(STORY.panel.top);
    expect(STORY.panel.textX + STORY.panel.textWidth).toBeLessThanOrEqual(GAME_SIZE.width);
    expect(STORY.charsPerSecond).toBeGreaterThanOrEqual(20);
    expect(STORY.charsPerSecond).toBeLessThanOrEqual(120);
  });

  it('cada cartão termina de aparecer em poucos segundos', () => {
    for (const card of INTRO_CARDS) {
      expect(typingDuration(card.text.length, STORY.charsPerSecond), card.art).toBeLessThan(8000);
    }
  });
});

describe('visibleChars e typingDuration', () => {
  it('revela letras no ritmo pedido e nunca passa do total', () => {
    expect(visibleChars(0, 40, 100)).toBe(0);
    expect(visibleChars(500, 40, 100)).toBe(20);
    expect(visibleChars(1000, 40, 100)).toBe(40);
    expect(visibleChars(60000, 40, 100)).toBe(100);
  });

  it('entradas inválidas não quebram', () => {
    expect(visibleChars(-5, 40, 100)).toBe(0);
    expect(visibleChars(500, 0, 100)).toBe(0);
    expect(visibleChars(500, 40, 0)).toBe(0);
    expect(typingDuration(0, 40)).toBe(0);
    expect(typingDuration(10, 0)).toBe(0);
  });

  it('a duração é a que faz as letras chegarem ao total', () => {
    const total = 137;
    const ms = typingDuration(total, STORY.charsPerSecond);
    expect(visibleChars(ms, STORY.charsPerSecond, total)).toBe(total);
    expect(visibleChars(ms - 50, STORY.charsPerSecond, total)).toBeLessThan(total);
  });
});

describe('abertura nas primeiras visitas (armazenamento)', () => {
  const newVisit = (): StorySession => ({ offered: false });

  it('vem sozinha nas primeiras visitas e depois só pelo menu', () => {
    const storage = fakeStorage();
    for (let visit = 0; visit < STORY.autoShows; visit++) {
      const session = newVisit();
      expect(shouldPlayIntro(storage, session), `visita ${visit + 1}`).toBe(true);
      recordIntroShown(storage, session);
    }
    expect(introViews(storage)).toBe(STORY.autoShows);
    expect(shouldPlayIntro(storage, newVisit())).toBe(false);
  });

  it('não repete na mesma visita (depois de morrer ou desistir e voltar ao título)', () => {
    const storage = fakeStorage();
    const session = newVisit();
    expect(shouldPlayIntro(storage, session)).toBe(true);
    recordIntroShown(storage, session);
    expect(shouldPlayIntro(storage, session)).toBe(false);
  });

  it('quem já tinha visto a abertura uma vez (valor antigo "1") continua contando', () => {
    const storage = fakeStorage();
    storage.setItem(STORY_STORAGE.key, '1');
    expect(introViews(storage)).toBe(1);
    expect(shouldPlayIntro(storage, newVisit())).toBe(STORY.autoShows > 1);
  });

  it('valor estragado conta como nenhuma visita', () => {
    const storage = fakeStorage();
    for (const junk of ['', 'abc', '-3', 'NaN']) {
      storage.setItem(STORY_STORAGE.key, junk);
      expect(introViews(storage), junk).toBe(0);
    }
  });

  it('armazenamento que falha não derruba o jogo', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('sem acesso');
      },
      setItem: () => {
        throw new Error('cota cheia');
      },
      removeItem: () => undefined,
    };
    const session = newVisit();
    expect(introViews(broken)).toBe(0);
    expect(shouldPlayIntro(broken, session)).toBe(true);
    expect(() => recordIntroShown(broken, session)).not.toThrow();
    expect(shouldPlayIntro(broken, session)).toBe(false); // a visita ainda não repete
  });
});

import { describe, expect, it } from 'vitest';
import { AUDIO_DEFAULTS, AUDIO_STORAGE } from '../src/data/audio';
import type { StorageLike } from '../src/logic/meta/save';
import {
  defaultAudioSettings,
  readAudioSettings,
  sanitizeAudioSettings,
  stepVolume,
  writeAudioSettings,
} from '../src/logic/audio/settings';

function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('cota excedida');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  },
};

describe('defaultAudioSettings', () => {
  it('usa os valores de AUDIO_DEFAULTS', () => {
    expect(defaultAudioSettings()).toEqual({
      muted: AUDIO_DEFAULTS.muted,
      music: AUDIO_DEFAULTS.music,
      sfx: AUDIO_DEFAULTS.sfx,
    });
  });

  it('devolve uma cópia nova a cada chamada', () => {
    const a = defaultAudioSettings();
    a.music = 0;
    a.muted = true;
    expect(defaultAudioSettings().music).toBe(AUDIO_DEFAULTS.music);
    expect(defaultAudioSettings().muted).toBe(AUDIO_DEFAULTS.muted);
  });
});

describe('sanitizeAudioSettings', () => {
  it('aceita lixo sem lançar e devolve o padrão', () => {
    for (const raw of [null, undefined, 42, 'texto', true, [], () => 1, Symbol('x')]) {
      expect(sanitizeAudioSettings(raw)).toEqual(defaultAudioSettings());
    }
  });

  it('completa campos ausentes com o padrão', () => {
    expect(sanitizeAudioSettings({ music: 0.3 })).toEqual({
      ...defaultAudioSettings(),
      music: 0.3,
    });
  });

  it('limita volumes a 0..1 e arredonda a 2 casas', () => {
    expect(sanitizeAudioSettings({ music: 7, sfx: -3 })).toMatchObject({ music: 1, sfx: 0 });
    expect(sanitizeAudioSettings({ music: 0.12345, sfx: 0.999 })).toMatchObject({
      music: 0.12,
      sfx: 1,
    });
  });

  it('troca NaN, infinito e não numéricos pelo padrão', () => {
    const defaults = defaultAudioSettings();
    for (const bad of [NaN, Infinity, -Infinity, '0.5', null, {}, undefined]) {
      expect(sanitizeAudioSettings({ music: bad, sfx: bad })).toEqual(defaults);
    }
  });

  it('muted só vale com exatamente true', () => {
    expect(sanitizeAudioSettings({ muted: true }).muted).toBe(true);
    for (const bad of [1, 'true', 'sim', {}, [], null, false]) {
      expect(sanitizeAudioSettings({ muted: bad }).muted).toBe(false);
    }
  });
});

describe('readAudioSettings / writeAudioSettings', () => {
  it('sem nada salvo devolve o padrão', () => {
    expect(readAudioSettings(fakeStorage())).toEqual(defaultAudioSettings());
  });

  it('grava e lê de volta', () => {
    const storage = fakeStorage();
    expect(writeAudioSettings(storage, { muted: true, music: 0.4, sfx: 0.9 })).toBe(true);
    expect(AUDIO_STORAGE.key in storage.data).toBe(true);
    expect(readAudioSettings(storage)).toEqual({ muted: true, music: 0.4, sfx: 0.9 });
  });

  it('grava o JSON já saneado', () => {
    const storage = fakeStorage();
    writeAudioSettings(storage, { muted: false, music: 3, sfx: 0.456 });
    expect(JSON.parse(storage.data[AUDIO_STORAGE.key] ?? '')).toEqual({
      muted: false,
      music: 1,
      sfx: 0.46,
    });
  });

  it('JSON corrompido ou de tipo errado vira o padrão', () => {
    for (const text of ['{quebrado', '', 'null', '123', '"x"']) {
      const storage = fakeStorage({ [AUDIO_STORAGE.key]: text });
      expect(readAudioSettings(storage)).toEqual(defaultAudioSettings());
    }
  });

  it('sanitiza valores absurdos vindos do disco', () => {
    const storage = fakeStorage({
      [AUDIO_STORAGE.key]: JSON.stringify({ muted: 'sim', music: 50, sfx: 'alto' }),
    });
    expect(readAudioSettings(storage)).toEqual({
      muted: false,
      music: 1,
      sfx: AUDIO_DEFAULTS.sfx,
    });
  });

  it('getItem que lança devolve o padrão', () => {
    expect(readAudioSettings(throwingStorage)).toEqual(defaultAudioSettings());
  });

  it('setItem que lança devolve false', () => {
    expect(writeAudioSettings(throwingStorage, defaultAudioSettings())).toBe(false);
  });
});

describe('stepVolume', () => {
  it('sobe e desce um passo', () => {
    expect(stepVolume(0.5, 1)).toBe(0.6);
    expect(stepVolume(0.5, -1)).toBe(0.4);
  });

  it('não deriva em ponto flutuante', () => {
    expect(stepVolume(0.7, 1)).toBe(0.8);
    expect(stepVolume(0.3, 1)).toBe(0.4);
    let v = 0;
    for (let i = 0; i < 10; i++) v = stepVolume(v, 1);
    expect(v).toBe(1);
    for (let i = 0; i < 10; i++) v = stepVolume(v, -1);
    expect(v).toBe(0);
  });

  it('para nas bordas 0 e 1', () => {
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0.95, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
    expect(stepVolume(0.05, -1)).toBe(0);
  });

  it('aceita um passo personalizado', () => {
    expect(stepVolume(0.5, 1, 0.25)).toBe(0.75);
    expect(stepVolume(0.5, -1, 0.05)).toBe(0.45);
  });

  it('entrada inválida não propaga NaN', () => {
    expect(stepVolume(NaN, 1)).toBe(AUDIO_DEFAULTS.step);
    expect(Number.isNaN(stepVolume(0.5, 1, NaN))).toBe(false);
  });
});

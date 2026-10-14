import { describe, expect, it } from 'vitest';
import { META_STORAGE, UPGRADE_NODES } from '../src/data/meta';
import type { UpgradeNode } from '../src/data/meta';
import {
  createMetaSave,
  readMetaSave,
  sanitizeMetaSave,
  serializeMetaSave,
  writeMetaSave,
} from '../src/logic/meta/save';
import type { MetaSave, StorageLike } from '../src/logic/meta/save';

const KEY = META_STORAGE.key;

/** Armazenamento falso em memória; `failOn` faz setItem lançar nas chaves escolhidas. */
function memoryStorage(
  data: Map<string, string> = new Map(),
  failOn: (key: string) => boolean = () => false,
): StorageLike & { data: Map<string, string> } {
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (failOn(key)) throw new Error('QuotaExceededError');
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function saveWith(levels: Record<string, number>, extra: Partial<MetaSave> = {}): MetaSave {
  return { ...createMetaSave(), levels, ...extra };
}

describe('createMetaSave', () => {
  it('começa zerado e na versão atual', () => {
    expect(createMetaSave()).toEqual({
      version: META_STORAGE.version,
      souls: 0,
      levels: {},
      startRelic: null,
      stats: { runs: 0, victories: 0, totalSouls: 0 },
    });
  });

  it('cada chamada devolve um objeto novo', () => {
    const a = createMetaSave();
    a.levels.vigor = 1;
    expect(createMetaSave().levels).toEqual({});
  });
});

describe('sanitizeMetaSave: lixo nunca lança', () => {
  const garbage: unknown[] = [
    null,
    undefined,
    'x',
    '',
    5,
    NaN,
    true,
    [],
    [1, 2, 3],
    {},
    { levels: 'a' },
    { levels: [1, 2] },
    { levels: null },
    { stats: 'x', souls: {}, startRelic: 7 },
    () => 1,
  ];

  it.each(garbage.map((g) => [g]))('aceita %j e devolve um save válido', (raw) => {
    expect(sanitizeMetaSave(raw)).toEqual(createMetaSave());
  });

  it('souls e stats: inteiro finito >= 0, arredondado para baixo', () => {
    const save = sanitizeMetaSave({
      souls: 12.9,
      stats: { runs: -3, victories: 'dois', totalSouls: Infinity },
    });
    expect(save.souls).toBe(12);
    expect(save.stats).toEqual({ runs: 0, victories: 0, totalSouls: 0 });
    expect(sanitizeMetaSave({ souls: NaN }).souls).toBe(0);
    expect(sanitizeMetaSave({ souls: -1 }).souls).toBe(0);
    expect(sanitizeMetaSave({ souls: '50' }).souls).toBe(0);
    expect(sanitizeMetaSave({ souls: -Infinity }).souls).toBe(0);
  });

  it('mantém valores válidos de stats', () => {
    const save = sanitizeMetaSave({ stats: { runs: 4, victories: 1, totalSouls: 300 } });
    expect(save.stats).toEqual({ runs: 4, victories: 1, totalSouls: 300 });
  });

  it('níveis acima do máximo viram o máximo; negativos e quebrados, 0', () => {
    const save = sanitizeMetaSave({
      levels: { vigor: 99, retencao: -2, sorte: 2.8, reflexo: 'x', segredos: NaN },
    });
    expect(save.levels).toEqual({ vigor: 5, sorte: 2 });
  });

  it('descarta nós desconhecidos e chaves do protótipo', () => {
    const save = sanitizeMetaSave(
      JSON.parse('{"levels":{"fantasma":3,"vigor":1,"__proto__":{"vigor":5},"constructor":2}}'),
    );
    expect(save.levels).toEqual({ vigor: 1 });
    expect(Object.keys(save.levels)).toEqual(['vigor']);
  });

  it('remove nó com pré-requisito faltando', () => {
    const save = sanitizeMetaSave({ levels: { forca: 3, colheita: 2, retencao: 1 } });
    // forca precisa de vigor (ausente); colheita tem retencao.
    expect(save.levels).toEqual({ colheita: 2, retencao: 1 });
  });

  it('remove em cadeia até estabilizar', () => {
    // arsenal2 e mestre dependem de arsenal1, que está ausente.
    const save = sanitizeMetaSave({ levels: { arsenal2: 1, mestre: 1, vigor: 1 } });
    expect(save.levels).toEqual({ vigor: 1 });

    // Cadeia de 3 elos: c -> b -> a, com a ausente; a ordem dos nós não pode importar.
    const chain: UpgradeNode[] = ['c', 'b', 'a'].map((id, i, arr) => ({
      id,
      type: 'basic',
      name: id,
      description: id,
      maxLevel: 2,
      baseCost: 1,
      costMultiplier: 1.2,
      prerequisites: i + 1 < arr.length ? [arr[i + 1] as string] : ['inexistente'],
      effect: { kind: 'maxHp', perLevel: 1 },
    }));
    expect(sanitizeMetaSave({ levels: { a: 1, b: 1, c: 1 } }, chain).levels).toEqual({});
  });

  it('preserva uma cadeia completa', () => {
    const save = sanitizeMetaSave({ levels: { arsenal1: 1, arsenal2: 1, mestre: 1 } });
    expect(save.levels).toEqual({ arsenal1: 1, arsenal2: 1, mestre: 1 });
  });

  describe('startRelic', () => {
    const withMaster = { arsenal1: 1, mestre: 1 };

    it('vale se liberada e com o nó chooseStart comprado', () => {
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: 'adaga' }).startRelic).toBe(
        'adaga',
      );
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: 'foice' }).startRelic).toBe(
        'foice',
      );
    });

    it('é nula sem o nó chooseStart, mesmo sendo relíquia de base', () => {
      expect(sanitizeMetaSave({ levels: {}, startRelic: 'foice' }).startRelic).toBeNull();
      expect(
        sanitizeMetaSave({ levels: { arsenal1: 1 }, startRelic: 'adaga' }).startRelic,
      ).toBeNull();
    });

    it('é nula se a relíquia não foi liberada pelos níveis', () => {
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: 'machado' }).startRelic).toBeNull();
      // Com arsenal2 comprado (arsenal1 presente), o Machado passa a valer.
      expect(
        sanitizeMetaSave({ levels: { ...withMaster, arsenal2: 1 }, startRelic: 'machado' })
          .startRelic,
      ).toBe('machado');
    });

    it('é nula se o nó que libera ou o chooseStart foi removido pela cadeia', () => {
      // mestre sem arsenal1 cai; logo nenhuma relíquia inicial vale.
      expect(
        sanitizeMetaSave({ levels: { mestre: 1 }, startRelic: 'lamina' }).startRelic,
      ).toBeNull();
    });

    it('é nula para id inválido ou tipo errado', () => {
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: 'espada' }).startRelic).toBeNull();
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: 3 }).startRelic).toBeNull();
      expect(sanitizeMetaSave({ levels: withMaster, startRelic: null }).startRelic).toBeNull();
      expect(
        sanitizeMetaSave({ levels: withMaster, startRelic: 'constructor' }).startRelic,
      ).toBeNull();
    });
  });

  describe('versão', () => {
    it('versão maior é tratada como a atual e campos desconhecidos são ignorados', () => {
      const save = sanitizeMetaSave({
        version: META_STORAGE.version + 5,
        souls: 7,
        novidade: { qualquer: 'coisa' },
      });
      expect(save.version).toBe(META_STORAGE.version);
      expect(save.souls).toBe(7);
      expect(save).not.toHaveProperty('novidade');
    });

    it('versão ausente, menor ou de tipo errado é aceita e devolvida como a atual', () => {
      for (const version of [undefined, 0, -4, 'v1', null]) {
        const save = sanitizeMetaSave({ version, souls: 3 });
        expect(save.version).toBe(META_STORAGE.version);
        expect(save.souls).toBe(3);
      }
    });
  });

  it('não altera o objeto de entrada', () => {
    const raw = { souls: 5.5, levels: { forca: 2 } };
    const copy = JSON.parse(JSON.stringify(raw));
    sanitizeMetaSave(raw);
    expect(raw).toEqual(copy);
  });

  it('é idempotente', () => {
    const once = sanitizeMetaSave({ souls: 9, levels: { vigor: 9, forca: 1, arsenal2: 1 } });
    expect(sanitizeMetaSave(once)).toEqual(once);
  });
});

describe('serializeMetaSave / round-trip', () => {
  it('os níveis serializam como objeto JSON', () => {
    const save = saveWith({ vigor: 2, retencao: 1 }, { souls: 40 });
    const parsed = JSON.parse(serializeMetaSave(save));
    expect(parsed.levels).toEqual({ vigor: 2, retencao: 1 });
    expect(parsed.souls).toBe(40);
    expect(parsed.version).toBe(META_STORAGE.version);
  });

  it('escrever e ler devolve o mesmo save', () => {
    const storage = memoryStorage();
    const save: MetaSave = {
      version: META_STORAGE.version,
      souls: 123,
      levels: { vigor: 3, forca: 1, arsenal1: 1, mestre: 1 },
      startRelic: 'lanca',
      stats: { runs: 10, victories: 2, totalSouls: 999 },
    };
    expect(writeMetaSave(storage, save)).toBe(true);
    expect(readMetaSave(storage)).toEqual(save);
  });

  it('serializar -> sanitizar é identidade para um save válido', () => {
    const save = saveWith({ vigor: 5, forca: 2 }, { souls: 8 });
    expect(sanitizeMetaSave(JSON.parse(serializeMetaSave(save)))).toEqual(save);
  });
});

describe('readMetaSave', () => {
  it('sem nada guardado devolve um save novo', () => {
    expect(readMetaSave(memoryStorage())).toEqual(createMetaSave());
  });

  it('JSON inválido no principal e sem backup devolve um save novo', () => {
    const storage = memoryStorage(new Map([[KEY, '{corrompido']]));
    expect(readMetaSave(storage)).toEqual(createMetaSave());
  });

  it('JSON que não é objeto cai para o backup', () => {
    const backup = saveWith({ vigor: 1 }, { souls: 11 });
    const storage = memoryStorage(
      new Map([
        [KEY, '5'],
        [`${KEY}.backup`, serializeMetaSave(backup)],
      ]),
    );
    expect(readMetaSave(storage)).toEqual(backup);
  });

  it('principal corrompido: recupera do .backup', () => {
    const storage = memoryStorage();
    const first = saveWith({ vigor: 1 }, { souls: 10 });
    const second = saveWith({ vigor: 2 }, { souls: 20 });
    expect(writeMetaSave(storage, first)).toBe(true);
    expect(writeMetaSave(storage, second)).toBe(true);
    // O backup guarda o save anterior.
    storage.data.set(KEY, '\u0000lixo{{');
    expect(readMetaSave(storage)).toEqual(first);
  });

  it('principal editado à mão com valores absurdos é saneado', () => {
    const storage = memoryStorage(
      new Map([[KEY, JSON.stringify({ souls: -50, levels: { vigor: 1000, forca: 1 } })]]),
    );
    const save = readMetaSave(storage);
    expect(save.souls).toBe(0);
    expect(save.levels).toEqual({ vigor: 5, forca: 1 });
  });

  it('getItem que lança não derruba: tenta o backup e por fim um save novo', () => {
    const backup = saveWith({ retencao: 2 }, { souls: 5 });
    const data = new Map([[`${KEY}.backup`, serializeMetaSave(backup)]]);
    const base = memoryStorage(data);
    const flaky: StorageLike = {
      ...base,
      getItem: (key) => {
        if (key === KEY) throw new Error('SecurityError');
        return base.getItem(key);
      },
    };
    expect(readMetaSave(flaky)).toEqual(backup);

    const broken: StorageLike = {
      ...base,
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readMetaSave(broken)).toEqual(createMetaSave());
  });

  it('recupera um .tmp válido quando principal e backup não existem', () => {
    const pending = saveWith({ vigor: 4 }, { souls: 77 });
    const storage = memoryStorage(new Map([[`${KEY}.tmp`, serializeMetaSave(pending)]]));
    expect(readMetaSave(storage)).toEqual(pending);
  });

  it('o principal legível tem prioridade sobre backup e .tmp', () => {
    const main = saveWith({}, { souls: 1 });
    const storage = memoryStorage(
      new Map([
        [KEY, serializeMetaSave(main)],
        [`${KEY}.backup`, serializeMetaSave(saveWith({}, { souls: 2 }))],
        [`${KEY}.tmp`, serializeMetaSave(saveWith({}, { souls: 3 }))],
      ]),
    );
    expect(readMetaSave(storage).souls).toBe(1);
  });

  it('usa a chave informada', () => {
    const storage = memoryStorage();
    writeMetaSave(storage, saveWith({}, { souls: 9 }), 'outro');
    expect(readMetaSave(storage, 'outro').souls).toBe(9);
    expect(readMetaSave(storage).souls).toBe(0);
  });

  it('respeita a lista de nós informada', () => {
    const storage = memoryStorage(new Map([[KEY, JSON.stringify({ levels: { vigor: 1 } })]]));
    expect(readMetaSave(storage, KEY, []).levels).toEqual({});
    expect(readMetaSave(storage, KEY, UPGRADE_NODES).levels).toEqual({ vigor: 1 });
  });
});

describe('writeMetaSave', () => {
  it('grava o principal, mantém backup do anterior e não deixa .tmp', () => {
    const storage = memoryStorage();
    const first = saveWith({}, { souls: 1 });
    const second = saveWith({}, { souls: 2 });

    expect(writeMetaSave(storage, first)).toBe(true);
    expect(storage.data.get(KEY)).toBe(serializeMetaSave(first));
    expect(storage.data.has(`${KEY}.backup`)).toBe(false);
    expect(storage.data.has(`${KEY}.tmp`)).toBe(false);

    expect(writeMetaSave(storage, second)).toBe(true);
    expect(storage.data.get(KEY)).toBe(serializeMetaSave(second));
    expect(storage.data.get(`${KEY}.backup`)).toBe(serializeMetaSave(first));
    expect(storage.data.has(`${KEY}.tmp`)).toBe(false);
  });

  it('não copia um principal ilegível para o backup', () => {
    const good = saveWith({}, { souls: 5 });
    const storage = memoryStorage(
      new Map([
        [KEY, '{quebrado'],
        [`${KEY}.backup`, serializeMetaSave(good)],
      ]),
    );
    expect(writeMetaSave(storage, saveWith({}, { souls: 6 }))).toBe(true);
    expect(storage.data.get(`${KEY}.backup`)).toBe(serializeMetaSave(good));
    expect(readMetaSave(storage).souls).toBe(6);
  });

  it('setItem que lança (cota cheia): devolve false e o save anterior segue intacto', () => {
    const data = new Map<string, string>();
    const previous = saveWith({ vigor: 2 }, { souls: 30 });
    expect(writeMetaSave(memoryStorage(data), previous)).toBe(true);
    const before = new Map(data);

    const full = memoryStorage(data, () => true);
    expect(writeMetaSave(full, saveWith({ vigor: 5 }, { souls: 500 }))).toBe(false);

    expect(data).toEqual(before);
    expect(readMetaSave(memoryStorage(data))).toEqual(previous);
  });

  it('falha só ao gravar o principal: devolve false e o principal fica como estava', () => {
    const data = new Map<string, string>();
    const previous = saveWith({}, { souls: 30 });
    writeMetaSave(memoryStorage(data), previous);
    const mainBefore = data.get(KEY);

    const failMain = memoryStorage(data, (key) => key === KEY);
    expect(writeMetaSave(failMain, saveWith({}, { souls: 99 }))).toBe(false);

    expect(data.get(KEY)).toBe(mainBefore);
    expect(readMetaSave(memoryStorage(data))).toEqual(previous);
  });

  it('falha ao gravar o backup: não toca no principal', () => {
    const data = new Map<string, string>();
    const previous = saveWith({}, { souls: 30 });
    writeMetaSave(memoryStorage(data), previous);

    const failBackup = memoryStorage(data, (key) => key.endsWith('.backup'));
    expect(writeMetaSave(failBackup, saveWith({}, { souls: 99 }))).toBe(false);
    expect(data.get(KEY)).toBe(serializeMetaSave(previous));
  });

  it('falha ao gravar o .tmp: não toca no principal nem no backup', () => {
    const data = new Map<string, string>();
    writeMetaSave(memoryStorage(data), saveWith({}, { souls: 1 }));
    writeMetaSave(memoryStorage(data), saveWith({}, { souls: 2 }));
    const before = new Map(data);

    const failTmp = memoryStorage(data, (key) => key.endsWith('.tmp'));
    expect(writeMetaSave(failTmp, saveWith({}, { souls: 3 }))).toBe(false);
    expect(data).toEqual(before);
  });

  it('confere o .tmp lendo de volta: gravação que não confere devolve false', () => {
    const data = new Map<string, string>();
    writeMetaSave(memoryStorage(data), saveWith({}, { souls: 4 }));
    const before = new Map(data);

    // Armazenamento que "aceita" a escrita do .tmp mas guarda algo truncado.
    const lossy: StorageLike = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, key.endsWith('.tmp') ? value.slice(0, 5) : value);
      },
      removeItem: (key) => {
        data.delete(key);
      },
    };
    expect(writeMetaSave(lossy, saveWith({}, { souls: 8 }))).toBe(false);
    expect(data).toEqual(before);
  });

  it('removeItem que lança no fim não faz a gravação falhar', () => {
    const data = new Map<string, string>();
    const base = memoryStorage(data);
    const storage: StorageLike = {
      ...base,
      removeItem: () => {
        throw new Error('boom');
      },
    };
    expect(writeMetaSave(storage, saveWith({}, { souls: 12 }))).toBe(true);
    expect(readMetaSave(base).souls).toBe(12);
  });
});

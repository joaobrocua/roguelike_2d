import { describe, expect, it } from 'vitest';
import { META_STORAGE } from '../src/data/meta';
import type { StorageLike } from '../src/logic/meta/save';
import { MetaStore } from '../src/systems/metaStore';

class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('cota cheia');
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('MetaStore', () => {
  it('começa sem progresso e com efeitos neutros', () => {
    const store = new MetaStore(new FakeStorage());
    expect(store.save.souls).toBe(0);
    expect(store.effects.maxHpBonus).toBe(0);
    expect(store.effects.canChooseStart).toBe(false);
  });

  it('commit grava e uma nova instância lê o mesmo progresso', () => {
    const storage = new FakeStorage();
    const store = new MetaStore(storage);
    store.save.souls = 42;
    store.save.levels.vigor = 2;
    expect(store.commit()).toBe(true);
    expect(store.effects.maxHpBonus).toBe(20);
    const again = new MetaStore(storage);
    expect(again.save.souls).toBe(42);
    expect(again.save.levels.vigor).toBe(2);
  });

  it('commit devolve false quando a gravação falha e o jogo segue com a memória', () => {
    const storage = new FakeStorage();
    storage.failWrites = true;
    const store = new MetaStore(storage);
    store.save.levels.vigor = 1;
    expect(store.commit()).toBe(false);
    expect(store.effects.maxHpBonus).toBe(10);
  });

  it('só aceita relíquia inicial com o Mestre e a relíquia liberada', () => {
    const store = new MetaStore(new FakeStorage());
    store.setStartRelic('foice');
    expect(store.save.startRelic).toBeNull();

    store.save.levels.arsenal1 = 1;
    store.save.levels.mestre = 1;
    store.refresh();
    store.setStartRelic('foice');
    expect(store.save.startRelic).toBe('foice');
    store.setStartRelic('machado'); // Arsenal II ainda bloqueado
    expect(store.save.startRelic).toBeNull();
    store.setStartRelic('adaga');
    expect(store.save.startRelic).toBe('adaga');
    store.setStartRelic(null);
    expect(store.save.startRelic).toBeNull();
  });

  it('não sobrescreve um save de versão futura', () => {
    const storage = new FakeStorage();
    const future = JSON.stringify({ version: META_STORAGE.version + 1, souls: 999, levels: {} });
    storage.data.set(META_STORAGE.key, future);
    const store = new MetaStore(storage);
    store.save.souls = 5;
    expect(store.commit()).toBe(false);
    expect(storage.data.get(META_STORAGE.key)).toBe(future);
  });
});

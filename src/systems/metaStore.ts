import { PLAYER_COMBAT } from '../data/combat';
import { META_STORAGE, UPGRADE_NODES } from '../data/meta';
import type { RelicId } from '../data/relics';
import { effectsFor, type MetaEffects } from '../logic/meta/effects';
import { readMetaSave, writeMetaSave, type MetaSave, type StorageLike } from '../logic/meta/save';
import { unlockedRelicIds } from '../logic/meta/tree';

/**
 * O progresso permanente do jogador no navegador: o save (almas, níveis da árvore, relíquia
 * inicial) e o que ele muda no jogo (`effects`). Lê do localStorage ao abrir e grava a cada
 * mudança. Se o navegador não deixar usar o localStorage (modo privado, cota cheia), o jogo
 * continua funcionando só com a memória desta sessão.
 */
export class MetaStore {
  save: MetaSave;
  effects: MetaEffects;

  constructor(private readonly storage: StorageLike) {
    this.save = readMetaSave(storage);
    this.effects = this.computeEffects();
  }

  /** Recalcula os efeitos depois de qualquer mudança no save. */
  refresh(): void {
    this.effects = this.computeEffects();
  }

  /** Grava o save atual e recalcula os efeitos. */
  commit(): boolean {
    this.refresh();
    return writeMetaSave(this.storage, this.save);
  }

  /** Escolhe a relíquia inicial (só vale se o nó do Mestre foi comprado e ela está liberada). */
  setStartRelic(id: RelicId | null): void {
    const allowed = this.effects.canChooseStart && (id === null || this.unlocked().includes(id));
    this.save.startRelic = allowed ? id : null;
    this.commit();
  }

  /** Relíquias que o jogador pode escolher para começar (as liberadas na árvore). */
  unlocked(): readonly RelicId[] {
    return unlockedRelicIds(this.save, UPGRADE_NODES);
  }

  private computeEffects(): MetaEffects {
    return effectsFor(this.save, PLAYER_COMBAT.maxHp);
  }
}

/** Memória simples usada quando o navegador não oferece localStorage. */
class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function browserStorage(): StorageLike {
  try {
    // Só confere se dá para LER: com a cota cheia o progresso salvo continua legível, e a
    // gravação que falhar é tratada em writeMetaSave (devolve false), sem esconder o save.
    const storage = window.localStorage;
    storage.getItem(META_STORAGE.key);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}

let instance: MetaStore | null = null;

/** O progresso do jogador (um só por página). */
export function getMetaStore(): MetaStore {
  instance ??= new MetaStore(browserStorage());
  return instance;
}

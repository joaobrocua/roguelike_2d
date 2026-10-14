import { PLAYER_COMBAT } from '../data/combat';
import { META_STORAGE, UPGRADE_NODES } from '../data/meta';
import type { RelicId } from '../data/relics';
import { effectsFor, type MetaEffects } from '../logic/meta/effects';
import {
  clearMetaSave,
  createMetaSave,
  readMetaSave,
  writeMetaSave,
  type MetaSave,
  type StorageLike,
} from '../logic/meta/save';
import { unlockedRelicIds } from '../logic/meta/tree';
import { browserStorage } from './safeStorage';

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

  /**
   * Zera todo o progresso (almas, árvore, relíquia inicial e estatísticas), inclusive as cópias
   * guardadas. Devolve false se o navegador não deixou apagar o que estava salvo.
   */
  reset(): boolean {
    const cleared = clearMetaSave(this.storage);
    this.save = createMetaSave();
    this.refresh();
    return cleared;
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

let instance: MetaStore | null = null;

/** O progresso do jogador (um só por página). */
export function getMetaStore(): MetaStore {
  instance ??= new MetaStore(browserStorage(META_STORAGE.key));
  return instance;
}

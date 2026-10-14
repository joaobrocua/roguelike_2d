import type { StorageLike } from '../logic/meta/save';

/** Memória simples usada quando o navegador não oferece localStorage (modo privado, cota cheia). */
export class MemoryStorage implements StorageLike {
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

/**
 * O localStorage do navegador, se der para LER; senão uma memória só desta sessão. Só confere a
 * leitura: com a cota cheia o que já foi salvo continua legível, e a gravação que falhar é
 * tratada por quem grava (devolve false), sem esconder o que já existe.
 */
export function browserStorage(probeKey: string): StorageLike {
  try {
    const storage = window.localStorage;
    storage.getItem(probeKey);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}

import { STORY_STORAGE } from '../data/story';
import type { StorageLike } from '../logic/meta/save';
import { browserStorage } from './safeStorage';

/** A abertura da história já foi vista neste navegador? */
export function hasSeenIntro(storage: StorageLike = browserStorage(STORY_STORAGE.key)): boolean {
  try {
    return storage.getItem(STORY_STORAGE.key) === '1';
  } catch {
    return false;
  }
}

/** Guarda que a abertura foi vista (se não der para gravar, ela só aparece de novo da próxima vez). */
export function markIntroSeen(storage: StorageLike = browserStorage(STORY_STORAGE.key)): void {
  try {
    storage.setItem(STORY_STORAGE.key, '1');
  } catch {
    // sem espaço ou em modo privado: tudo bem
  }
}

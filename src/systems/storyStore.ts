import { STORY, STORY_STORAGE } from '../data/story';
import type { StorageLike } from '../logic/meta/save';
import { browserStorage } from './safeStorage';

/** O que já aconteceu desde que a página foi aberta (some ao recarregar). */
export interface StorySession {
  /** A abertura já foi mostrada (ou dispensada) nesta visita? */
  offered: boolean;
}

const session: StorySession = { offered: false };

/** Quantas vezes a abertura já passou antes da descida (0 se nunca ou se não der para ler). */
export function introViews(storage: StorageLike = browserStorage(STORY_STORAGE.key)): number {
  try {
    const views = Number.parseInt(storage.getItem(STORY_STORAGE.key) ?? '', 10);
    return Number.isFinite(views) && views > 0 ? views : 0;
  } catch {
    return 0;
  }
}

/**
 * A abertura vem antes da descida nas primeiras visitas ao jogo, uma vez por visita: depois de
 * morrer (ou desistir) e voltar ao título, não repete.
 */
export function shouldPlayIntro(
  storage: StorageLike = browserStorage(STORY_STORAGE.key),
  visit: StorySession = session,
): boolean {
  return !visit.offered && introViews(storage) < STORY.autoShows;
}

/** Anota que a abertura foi mostrada agora (se não der para gravar, ela só aparece de novo). */
export function recordIntroShown(
  storage: StorageLike = browserStorage(STORY_STORAGE.key),
  visit: StorySession = session,
): void {
  visit.offered = true;
  try {
    storage.setItem(STORY_STORAGE.key, String(introViews(storage) + 1));
  } catch {
    // sem espaço ou em modo privado: tudo bem
  }
}

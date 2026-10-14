import { AUDIO_DEFAULTS, AUDIO_STORAGE } from '../../data/audio';
import type { StorageLike } from '../meta/save';

/** Preferências de áudio do jogador. Volumes de 0 a 1. */
export interface AudioSettings {
  muted: boolean;
  music: number;
  sfx: number;
}

/** Cópia nova dos valores padrão a cada chamada (quem recebe pode mutar à vontade). */
export function defaultAudioSettings(): AudioSettings {
  return { muted: AUDIO_DEFAULTS.muted, music: AUDIO_DEFAULTS.music, sfx: AUDIO_DEFAULTS.sfx };
}

/** Limita a 0..1 e arredonda a 2 casas, o que elimina a deriva de ponto flutuante. */
function roundVolume(value: number): number {
  if (Number.isNaN(value)) return 0;
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * 100) / 100;
}

function sanitizeVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return roundVolume(value);
}

/** Aceita qualquer coisa e nunca lança: o que faltar ou for inválido vira o padrão. */
export function sanitizeAudioSettings(raw: unknown): AudioSettings {
  const defaults = defaultAudioSettings();
  if (typeof raw !== 'object' || raw === null) return defaults;
  const record = raw as Record<string, unknown>;
  return {
    muted: record.muted === true,
    music: sanitizeVolume(record.music, defaults.music),
    sfx: sanitizeVolume(record.sfx, defaults.sfx),
  };
}

/** Lê as preferências salvas; qualquer falha (storage, JSON corrompido) devolve o padrão. */
export function readAudioSettings(storage: StorageLike): AudioSettings {
  try {
    const text = storage.getItem(AUDIO_STORAGE.key);
    if (text === null) return defaultAudioSettings();
    return sanitizeAudioSettings(JSON.parse(text));
  } catch {
    return defaultAudioSettings();
  }
}

/** Grava as preferências já saneadas. Devolve false se o storage recusar (cota, modo privado). */
export function writeAudioSettings(storage: StorageLike, settings: AudioSettings): boolean {
  try {
    storage.setItem(AUDIO_STORAGE.key, JSON.stringify(sanitizeAudioSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** Sobe ou desce um volume em um passo, sem sair de 0..1 e sem deriva (0.7 + 0.1 === 0.8). */
export function stepVolume(
  value: number,
  direction: 1 | -1,
  step: number = AUDIO_DEFAULTS.step,
): number {
  const current = Number.isFinite(value) ? value : 0;
  return roundVolume(current + direction * step);
}

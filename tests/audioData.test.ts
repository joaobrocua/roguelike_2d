import { describe, expect, it } from 'vitest';
import {
  AUDIO_DEFAULTS,
  AUDIO_FX,
  AUDIO_LEVELS,
  MUSIC_FX,
  MUSIC_TRACKS,
  MUSIC_VOICES,
  SFX,
  type SfxRecipe,
} from '../src/data/audio';
import { barDurationSeconds, generateBar } from '../src/logic/audio/music';

describe('efeitos sonoros (dados)', () => {
  const recipes = Object.entries(SFX) as [string, SfxRecipe][];

  it('todo efeito tem pelo menos um tom ou um sopro', () => {
    for (const [name, recipe] of recipes) {
      const count = (recipe.tones?.length ?? 0) + (recipe.noises?.length ?? 0);
      expect(count, name).toBeGreaterThan(0);
    }
  });

  it('frequências, durações e ganhos são positivos (a rampa exponencial não aceita zero)', () => {
    for (const [name, recipe] of recipes) {
      for (const tone of recipe.tones ?? []) {
        expect(tone.from, `${name}: from`).toBeGreaterThan(0);
        expect(tone.to, `${name}: to`).toBeGreaterThan(0);
        expect(tone.decay, `${name}: decay`).toBeGreaterThan(0);
        expect(tone.gain, `${name}: gain`).toBeGreaterThan(0);
        expect(tone.gain, `${name}: gain`).toBeLessThanOrEqual(1);
        expect(tone.delay ?? 0, `${name}: delay`).toBeGreaterThanOrEqual(0);
        expect(tone.attack ?? 0, `${name}: attack`).toBeGreaterThanOrEqual(0);
      }
      for (const noise of recipe.noises ?? []) {
        expect(noise.from, `${name}: from`).toBeGreaterThan(0);
        expect(noise.to, `${name}: to`).toBeGreaterThan(0);
        expect(noise.decay, `${name}: decay`).toBeGreaterThan(0);
        expect(noise.gain, `${name}: gain`).toBeGreaterThan(0);
        expect(noise.gain, `${name}: gain`).toBeLessThanOrEqual(1);
        expect(noise.delay ?? 0, `${name}: delay`).toBeGreaterThanOrEqual(0);
        expect(noise.attack ?? 0, `${name}: attack`).toBeGreaterThanOrEqual(0);
      }
      expect(recipe.minGapMs, `${name}: minGapMs`).toBeGreaterThanOrEqual(0);
    }
  });

  it('nenhum efeito dura demais (a soma de espera e queda fica abaixo de 3 s)', () => {
    for (const [name, recipe] of recipes) {
      const ends = [
        ...(recipe.tones ?? []).map((t) => (t.delay ?? 0) + (t.attack ?? 0) + t.decay),
        ...(recipe.noises ?? []).map((n) => (n.delay ?? 0) + (n.attack ?? 0) + n.decay),
      ];
      expect(Math.max(...ends), name).toBeLessThan(3);
    }
  });
});

describe('trilhas e configurações (dados)', () => {
  it('toda trilha tem andamento, escala, progressão e acordes válidos', () => {
    for (const [id, style] of Object.entries(MUSIC_TRACKS)) {
      expect(style.bpm, id).toBeGreaterThan(0);
      expect(style.beatsPerBar, id).toBeGreaterThan(0);
      expect(style.scale.length, id).toBeGreaterThan(0);
      expect(style.progression.length, id).toBeGreaterThan(0);
      for (const chord of style.progression) expect(chord.length, id).toBeGreaterThan(0);
      expect(style.leadDensity, id).toBeGreaterThanOrEqual(0);
      expect(style.leadDensity, id).toBeLessThanOrEqual(1);
      // O relógio da trilha avança por compasso: a duração precisa ser positiva
      expect(barDurationSeconds(style), id).toBeGreaterThan(0);
      expect(generateBar(style, 0, style.seed).length, id).toBeGreaterThan(0);
    }
  });

  it('cada trilha tem uma semente própria (cada uma soa de um jeito)', () => {
    const seeds = Object.values(MUSIC_TRACKS).map((style) => style.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('as vozes da música e os tempos técnicos fazem sentido', () => {
    for (const [name, voice] of Object.entries(MUSIC_VOICES)) {
      expect(voice.cutoff, name).toBeGreaterThan(0);
      expect(voice.gain, name).toBeGreaterThan(0);
      expect(voice.attack, name).toBeGreaterThanOrEqual(0);
      expect(voice.release, name).toBeGreaterThan(0);
    }
    expect(MUSIC_FX.tickMs).toBeGreaterThan(0);
    expect(MUSIC_FX.lookaheadSeconds * 1000).toBeGreaterThan(MUSIC_FX.tickMs); // sempre à frente
    expect(AUDIO_FX.silence).toBeGreaterThan(0);
    expect(AUDIO_FX.silence).toBeLessThan(0.001);
    for (const level of Object.values(AUDIO_LEVELS)) {
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThanOrEqual(1);
    }
    expect(AUDIO_DEFAULTS.step).toBeGreaterThan(0);
  });
});

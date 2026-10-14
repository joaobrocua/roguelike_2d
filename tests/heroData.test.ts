import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/data/balance';
import {
  HERO_ANIMATIONS,
  HERO_BODY_OFFSET,
  HERO_BOOT_HEIGHT,
  HERO_CELL,
  HERO_FRAMES,
  HERO_GEOMETRY,
  heroAnimationKey,
  type HeroState,
} from '../src/data/hero';

const ALL_STATES: readonly HeroState[] = [
  'idle',
  'run',
  'jump',
  'fall',
  'roll',
  'windup',
  'swing',
  'recover',
  'hurt',
  'dead',
];

describe('dados do herói', () => {
  it('os nomes dos quadros são únicos', () => {
    const names = HERO_FRAMES.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('toda animação referencia quadros que existem', () => {
    const names = new Set(HERO_FRAMES.map((f) => f.name));
    for (const anim of HERO_ANIMATIONS) {
      expect(anim.frames.length, anim.state).toBeGreaterThan(0);
      for (const frame of anim.frames) {
        expect(names.has(frame), `${anim.state} -> ${frame}`).toBe(true);
      }
    }
  });

  it('todo estado tem exatamente uma animação', () => {
    for (const state of ALL_STATES) {
      expect(HERO_ANIMATIONS.filter((a) => a.state === state).length, state).toBe(1);
    }
    expect(HERO_ANIMATIONS.length).toBe(ALL_STATES.length);
  });

  it('as chaves de animação são únicas', () => {
    const keys = HERO_ANIMATIONS.map((a) => heroAnimationKey(a.state));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('animações de um quadro só não fazem loop', () => {
    for (const anim of HERO_ANIMATIONS.filter((a) => a.frames.length === 1)) {
      expect(anim.loop, anim.state).toBe(false);
    }
  });

  it('fps é positivo', () => {
    for (const anim of HERO_ANIMATIONS) {
      expect(anim.fps, anim.state).toBeGreaterThan(0);
    }
  });

  it('o corpo de colisão fica centrado no quadro', () => {
    expect(HERO_BODY_OFFSET.x + PLAYER.width / 2).toBe(HERO_CELL / 2);
    expect(HERO_BODY_OFFSET.y + PLAYER.height / 2).toBe(HERO_CELL / 2);
  });

  it('a sola da bota fica exatamente na base do corpo de colisão', () => {
    const bodyBottom = HERO_BODY_OFFSET.y + PLAYER.height; // 1ª linha abaixo do corpo
    const bootBottom = HERO_GEOMETRY.footY + HERO_BOOT_HEIGHT; // 1ª linha abaixo da bota
    expect(bootBottom).toBe(bodyBottom);
  });

  it('todo quadro é usado por alguma animação', () => {
    const used = new Set(HERO_ANIMATIONS.flatMap((anim) => [...anim.frames]));
    for (const frame of HERO_FRAMES) expect(used.has(frame.name), frame.name).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/data/balance';
import {
  ATTACK_STYLES,
  HERO_ANIMATIONS,
  HERO_ATTACK_SETS,
  heroFramePose,
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
  'launch',
  'jump',
  'apex',
  'fall',
  'plunge',
  'land',
  'brake',
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

  it('todo quadro é usado por alguma animação ou por um estilo de golpe', () => {
    const used = new Set(HERO_ANIMATIONS.flatMap((anim) => [...anim.frames]));
    for (const set of Object.values(HERO_ATTACK_SETS)) {
      for (const name of [...set.windup, ...set.swing, ...set.recover]) used.add(name);
    }
    for (const frame of HERO_FRAMES) expect(used.has(frame.name), frame.name).toBe(true);
  });

  it('todo estilo de golpe tem 2 quadros de preparação, 3 de golpe e 2 de recuperação, todos existentes', () => {
    const names = new Set(HERO_FRAMES.map((f) => f.name));
    for (const style of ATTACK_STYLES) {
      const set = HERO_ATTACK_SETS[style];
      expect(set.windup.length, style).toBe(2);
      expect(set.swing.length, style).toBe(3);
      expect(set.recover.length, style).toBe(2);
      for (const name of [...set.windup, ...set.swing, ...set.recover]) {
        expect(names.has(name), name).toBe(true);
        expect(heroFramePose(name)?.weaponAngle, name).toBeTypeOf('number');
      }
    }
  });

  it('o arco do golpe: a arma passa por trás da cabeça e termina à frente ou embaixo', () => {
    // Nos cortes e pancadas o ângulo da arma cresce da preparação até o fim do golpe
    for (const style of ['slashA', 'overhead'] as const) {
      const set = HERO_ATTACK_SETS[style];
      const angle = (name: string): number => heroFramePose(name)?.weaponAngle ?? 0;
      const first = angle(set.windup[0] as string);
      const last = angle(set.swing[2] as string);
      expect(last, style).toBeGreaterThan(first + 1.5);
      for (let i = 1; i < set.swing.length; i++) {
        expect(angle(set.swing[i] as string), style).toBeGreaterThan(
          angle(set.swing[i - 1] as string),
        );
      }
    }
  });

  it('armas de duas mãos têm a mão de trás no cabo (backHold) em todos os quadros do estilo', () => {
    for (const style of ['thrust', 'overhead', 'sweep'] as const) {
      const set = HERO_ATTACK_SETS[style];
      for (const name of [...set.windup, ...set.swing, ...set.recover]) {
        expect(heroFramePose(name)?.backHold, name).toBeTypeOf('number');
      }
    }
  });
});

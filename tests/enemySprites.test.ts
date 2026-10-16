import { describe, expect, it } from 'vitest';
import { GUARDIAO } from '../src/data/boss';
import { ENEMY_BODIES } from '../src/data/enemies';
import {
  ARQUEIRO_SHEET,
  CAO_SHEET,
  CARNICAL_SHEET,
  ENEMY_DEATH_FADE,
  ENEMY_WARN_FLICKER,
  FATUO_SHEET,
  GUARDIAO_SHEET,
  LOBO_SHEET,
  NECROMANTE_SHEET,
  RAIZ_SHEET,
  SAPO_SHEET,
  SOLDADO_SHEET,
  VULTO_SHEET,
  type EnemySheet,
} from '../src/data/enemySprites';
import type { EnemyAnimState } from '../src/logic/enemyAnim';

const SHEETS: readonly EnemySheet<unknown>[] = [
  CARNICAL_SHEET,
  ARQUEIRO_SHEET,
  VULTO_SHEET,
  CAO_SHEET,
  LOBO_SHEET,
  RAIZ_SHEET,
  FATUO_SHEET,
  SAPO_SHEET,
  SOLDADO_SHEET,
  NECROMANTE_SHEET,
  GUARDIAO_SHEET,
];

const STATES: readonly EnemyAnimState[] = [
  'idle',
  'walk',
  'windup',
  'strike',
  'recover',
  'hurt',
  'dead',
];

describe('dados dos sprites dos inimigos', () => {
  it('cada inimigo do jogo tem uma folha de quadros (e o chefe também)', () => {
    const ids = SHEETS.map((sheet) => sheet.id);
    for (const body of [...ENEMY_BODIES, GUARDIAO]) expect(ids).toContain(body.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('os nomes de quadros são únicos dentro de cada folha', () => {
    for (const sheet of SHEETS) {
      const names = sheet.frames.map((frame) => frame.name);
      expect(new Set(names).size, sheet.id).toBe(names.length);
    }
  });

  it('toda animação existe, usa quadros que existem e tem velocidade positiva', () => {
    for (const sheet of SHEETS) {
      const names = new Set(sheet.frames.map((frame) => frame.name));
      for (const state of STATES) {
        const animation = sheet.animations[state];
        expect(animation.frames.length, `${sheet.id}-${state}`).toBeGreaterThan(0);
        expect(animation.fps, `${sheet.id}-${state}`).toBeGreaterThan(0);
        for (const frame of animation.frames)
          expect(names.has(frame), `${sheet.id}:${frame}`).toBe(true);
      }
    }
  });

  it('só os estados contínuos repetem; golpes, dano e morte tocam uma vez', () => {
    for (const sheet of SHEETS) {
      expect(sheet.animations.idle.loop, sheet.id).toBe(true);
      expect(sheet.animations.walk.loop, sheet.id).toBe(true);
      expect(sheet.animations.dead.loop, sheet.id).toBe(false);
      expect(sheet.animations.hurt.loop, sheet.id).toBe(false);
      expect(sheet.animations.strike.loop, sheet.id).toBe(false);
    }
  });

  it('o quadro é maior que o corpo e a folga é positiva', () => {
    for (const sheet of SHEETS) {
      expect(sheet.pad.x, sheet.id).toBeGreaterThan(0);
      expect(sheet.pad.y, sheet.id).toBeGreaterThan(0);
    }
  });

  it('a telegrafia pisca em ritmo válido e a morte tem tempos positivos', () => {
    expect(ENEMY_WARN_FLICKER.periodMs).toBeGreaterThan(0);
    expect(ENEMY_WARN_FLICKER.litEvery).toBeGreaterThan(1);
    expect(ENEMY_DEATH_FADE.holdMs).toBeGreaterThan(0);
    expect(ENEMY_DEATH_FADE.fadeMs).toBeGreaterThan(0);
  });

  it('a animação de preparação dura quase o tempo da telegrafia do golpe', () => {
    // Quadros sem repetição: a duração tocada não passa do tempo de preparação do ataque
    const bodies = [...ENEMY_BODIES, GUARDIAO];
    for (const sheet of SHEETS) {
      const body = bodies.find((b) => b.id === sheet.id);
      const windup = sheet.animations.windup;
      if (!body || windup.loop) continue;
      const playMs = (windup.frames.length / windup.fps) * 1000;
      expect(playMs, sheet.id).toBeLessThanOrEqual(body.attack.windupMs * 1.1);
    }
  });
});

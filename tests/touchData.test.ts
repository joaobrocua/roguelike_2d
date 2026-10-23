import { describe, expect, it } from 'vitest';
import { KEY_BINDINGS, type InputAction } from '../src/data/input';
import {
  TOUCH,
  TOUCH_BUTTONS,
  TOUCH_KEYS,
  TOUCH_MENU_SCENES,
  type TouchAction,
} from '../src/data/touch';
import { isTouchDevice } from '../src/utils/touch';

/** keyCode de cada tecla, como o Phaser (e o navegador) os conhece. */
const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Space: 32,
  KeyJ: 74,
  KeyK: 75,
  KeyL: 76,
  KeyQ: 81,
  KeyE: 69,
  Escape: 27,
};

describe('controles de toque: teclas', () => {
  it('cada tecla tem o keyCode certo', () => {
    for (const [action, key] of Object.entries(TOUCH_KEYS)) {
      expect(KEY_CODES[key.code], action).toBe(key.keyCode);
    }
  });

  it('os botões do jogo apertam teclas que o jogo realmente usa', () => {
    // nome do Phaser de cada tecla (data/input.ts) para cada ação do jogo
    const usedByGame: Partial<Record<TouchAction, { action: InputAction; name: string }>> = {
      jump: { action: 'jump', name: 'SPACE' },
      attack: { action: 'attack', name: 'J' },
      special: { action: 'special', name: 'K' },
      roll: { action: 'roll', name: 'L' },
      swap: { action: 'swap', name: 'Q' },
      interact: { action: 'interact', name: 'E' },
      pause: { action: 'pause', name: 'ESC' },
      left: { action: 'left', name: 'LEFT' },
      right: { action: 'right', name: 'RIGHT' },
    };
    for (const [touchAction, binding] of Object.entries(usedByGame)) {
      expect(KEY_BINDINGS[binding.action], touchAction).toContain(binding.name);
    }
  });
});

describe('controles de toque: botões', () => {
  it('toda ação dos botões existe e os dois modos têm o que precisam', () => {
    for (const button of TOUCH_BUTTONS) {
      expect(TOUCH_KEYS[button.action], button.action).toBeDefined();
    }
    const inGame = TOUCH_BUTTONS.filter((b) => b.mode === 'game').map((b) => b.action);
    for (const needed of ['attack', 'jump', 'roll', 'special', 'swap', 'interact', 'pause']) {
      expect(inGame, needed).toContain(needed);
    }
    const inMenu = TOUCH_BUTTONS.filter((b) => b.mode === 'menu').map((b) => b.action);
    for (const needed of ['up', 'down', 'left', 'right', 'confirm', 'cancel']) {
      expect(inMenu, needed).toContain(needed);
    }
  });

  it('os botões de um mesmo modo e lado não se sobrepõem', () => {
    for (const mode of ['game', 'menu'] as const) {
      const list = TOUCH_BUTTONS.filter((b) => b.mode === mode);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (!a || !b) continue;
          if (a.side !== b.side || Boolean(a.top) !== Boolean(b.top)) continue;
          const apart =
            a.x + a.size <= b.x ||
            b.x + b.size <= a.x ||
            a.y + a.size <= b.y ||
            b.y + b.size <= a.y;
          expect(apart, `${a.action} x ${b.action}`).toBe(true);
        }
      }
    }
  });

  it('o direcional e o aperto mínimo têm valores sensatos', () => {
    expect(TOUCH.stickDeadzone).toBeLessThan(TOUCH.stickRadius);
    expect(TOUCH.minHoldMs).toBeGreaterThanOrEqual(32); // mais de um quadro a 30 fps
    expect(TOUCH.minHoldMs).toBeLessThanOrEqual(150);
  });

  it('as telas de menu são as cenas que abrem por cima do jogo ou antes dele', () => {
    for (const scene of [
      'Title',
      'Pause',
      'RelicChoice',
      'RoadChoice',
      'Sanctuary',
      'Death',
      'Victory',
    ]) {
      expect(TOUCH_MENU_SCENES).toContain(scene);
    }
    expect(TOUCH_MENU_SCENES).not.toContain('Game');
  });
});

describe('isTouchDevice', () => {
  const win = (search: string, coarse: boolean): Window =>
    ({ location: { search }, matchMedia: () => ({ matches: coarse }) }) as unknown as Window;

  it('ponteiro grosso (dedo) é aparelho de toque; mouse não', () => {
    expect(isTouchDevice(win('', true))).toBe(true);
    expect(isTouchDevice(win('', false))).toBe(false);
  });

  it('com ?touch no endereço vale em qualquer aparelho', () => {
    expect(isTouchDevice(win('?touch', false))).toBe(true);
    expect(isTouchDevice(win('?x=1&touch=1', false))).toBe(true);
  });
});

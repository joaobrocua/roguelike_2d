import Phaser from 'phaser';
import { MENU_PAD, STICK_DEADZONE } from '../data/input';

export type MenuButton = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel';

const BUTTONS: readonly MenuButton[] = ['up', 'down', 'left', 'right', 'confirm', 'cancel'];

/** Teclas de cada botão de menu (nomes do Phaser). */
const MENU_KEYS: Readonly<Record<MenuButton, readonly string[]>> = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  confirm: ['J', 'SPACE', 'ENTER'],
  cancel: ['ESC', 'E', 'BACKSPACE'],
};

/**
 * Lê teclado e controle para menus e entrega, a cada frame, quais botões acabaram de ser
 * apertados (`pressed`). O objeto é reaproveitado (o update não aloca). Botões que já estavam
 * apertados ao abrir a tela não contam como aperto novo.
 */
export class MenuInput {
  /** Apertos deste frame; só vale depois de `update()`. */
  readonly pressed: Record<MenuButton, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    cancel: false,
  };
  private readonly keys: Record<MenuButton, Phaser.Input.Keyboard.Key[]>;
  private readonly padWasDown: Record<MenuButton, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    cancel: false,
  };

  /**
   * `extraCancel` soma teclas e botões do controle ao "voltar" (a pausa também fecha com P e
   * Start, as mesmas que a abrem).
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly extraCancel: { keys: readonly string[]; padButtons: readonly number[] } = {
      keys: [],
      padButtons: [],
    },
  ) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('MenuInput: teclado indisponível');
    this.keys = {} as Record<MenuButton, Phaser.Input.Keyboard.Key[]>;
    const pad = scene.input.gamepad?.getPad(0);
    for (const button of BUTTONS) {
      const names =
        button === 'cancel' ? [...MENU_KEYS[button], ...extraCancel.keys] : MENU_KEYS[button];
      this.keys[button] = names.map((name) => keyboard.addKey(name));
      for (const key of this.keys[button]) key.reset();
      this.padWasDown[button] = !!pad && this.padDown(pad, button);
    }
  }

  update(): void {
    const pad = this.scene.input.gamepad?.getPad(0);
    for (const button of BUTTONS) {
      let key = false;
      for (const k of this.keys[button]) {
        if (Phaser.Input.Keyboard.JustDown(k)) key = true;
      }
      const down = !!pad && this.padDown(pad, button);
      const risen = down && !this.padWasDown[button];
      this.padWasDown[button] = down;
      this.pressed[button] = key || risen;
    }
  }

  private padDown(pad: Phaser.Input.Gamepad.Gamepad, button: MenuButton): boolean {
    if (!pad.connected) return false;
    switch (button) {
      case 'up':
        return !!pad.buttons[MENU_PAD.up]?.pressed || pad.leftStick.y < -STICK_DEADZONE;
      case 'down':
        return !!pad.buttons[MENU_PAD.down]?.pressed || pad.leftStick.y > STICK_DEADZONE;
      case 'left':
        return !!pad.buttons[MENU_PAD.left]?.pressed || pad.leftStick.x < -STICK_DEADZONE;
      case 'right':
        return !!pad.buttons[MENU_PAD.right]?.pressed || pad.leftStick.x > STICK_DEADZONE;
      case 'confirm':
        return this.anyPressed(pad, MENU_PAD.confirm);
      case 'cancel':
        return (
          this.anyPressed(pad, MENU_PAD.cancel) || this.anyPressed(pad, this.extraCancel.padButtons)
        );
    }
  }

  /** Algum dos botões está apertado? (laço simples: o update não cria funções) */
  private anyPressed(pad: Phaser.Input.Gamepad.Gamepad, buttons: readonly number[]): boolean {
    for (let i = 0; i < buttons.length; i++) {
      const index = buttons[i];
      if (index !== undefined && pad.buttons[index]?.pressed) return true;
    }
    return false;
  }
}

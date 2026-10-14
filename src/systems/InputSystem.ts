import Phaser from 'phaser';
import { GAMEPAD_BINDINGS, KEY_BINDINGS, STICK_DEADZONE, type InputAction } from '../data/input';

/** "Intenção" do jogador neste frame, independente de teclado ou controle. */
export interface InputIntent {
  /** -1 (esquerda), 0 ou 1 (direita). */
  moveX: number;
  /** true só no frame em que o botão foi apertado. */
  jumpPressed: boolean;
  rollPressed: boolean;
  attackPressed: boolean;
  specialPressed: boolean;
  swapPressed: boolean;
  /** Interagir (pegar a relíquia do chão). */
  interactPressed: boolean;
  /** Pausar o jogo (Esc, P ou Start). */
  pausePressed: boolean;
  /** Casa de relíquia pedida pelas teclas 1 e 2 (0 ou 1); -1 = nenhuma. */
  slotPressed: number;
}

const ACTIONS: readonly InputAction[] = [
  'left',
  'right',
  'jump',
  'roll',
  'attack',
  'special',
  'swap',
  'interact',
  'slot1',
  'slot2',
  'pause',
];

/**
 * Lê teclado e controle e preenche um único objeto de intenção, reutilizado a
 * cada frame (sem alocação no update). O resto do jogo só conhece o `intent`.
 */
export class InputSystem {
  readonly intent: InputIntent = {
    moveX: 0,
    jumpPressed: false,
    rollPressed: false,
    attackPressed: false,
    specialPressed: false,
    swapPressed: false,
    interactPressed: false,
    pausePressed: false,
    slotPressed: -1,
  };

  private readonly keys: Record<InputAction, Phaser.Input.Keyboard.Key[]>;
  /** No primeiro frame, botões já segurados (ex.: A ao reiniciar) não contam como "apertou agora". */
  private firstFrame = true;
  /** Estado do botão do controle no frame anterior, por ação. */
  private readonly padWasDown = {} as Record<InputAction, boolean>;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Teclado indisponível neste ambiente.');

    this.keys = {} as Record<InputAction, Phaser.Input.Keyboard.Key[]>;
    for (const action of ACTIONS) {
      this.keys[action] = KEY_BINDINGS[action].map((name) => keyboard.addKey(name));
      this.padWasDown[action] = false;
    }
  }

  /**
   * Chamar ao voltar de uma tela por cima (pausa, escolha de relíquia): o botão que fechou
   * a tela ainda pode estar apertado e não deve virar "apertou agora" no jogo.
   */
  resync(): void {
    this.firstFrame = true;
  }

  update(): void {
    const intent = this.intent;
    const pad = this.scene.input.gamepad?.getPad(0) as Phaser.Input.Gamepad.Gamepad | undefined;
    const padOn = pad !== undefined && pad.connected;

    // Direção: teclado primeiro; se nada for apertado, tenta o controle.
    let moveX = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    if (padOn && moveX === 0) {
      const stickX = pad.leftStick.x;
      if (Math.abs(stickX) > STICK_DEADZONE) moveX = stickX > 0 ? 1 : -1;
      else moveX = (this.padDown(pad, 'right') ? 1 : 0) - (this.padDown(pad, 'left') ? 1 : 0);
    }
    intent.moveX = moveX;

    // "Apertou agora": JustDown do teclado, ou borda de subida no controle (que no primeiro
    // frame é ignorada: botão já segurado, por exemplo A ao reiniciar, não vale como aperto).
    const padEdges = !this.firstFrame;
    intent.jumpPressed = this.pressed('jump', pad, padOn, padEdges);
    intent.rollPressed = this.pressed('roll', pad, padOn, padEdges);
    intent.attackPressed = this.pressed('attack', pad, padOn, padEdges);
    intent.specialPressed = this.pressed('special', pad, padOn, padEdges);
    intent.swapPressed = this.pressed('swap', pad, padOn, padEdges);
    intent.interactPressed = this.pressed('interact', pad, padOn, padEdges);
    intent.pausePressed = this.pressed('pause', pad, padOn, padEdges);
    const slot1 = this.pressed('slot1', pad, padOn, padEdges);
    const slot2 = this.pressed('slot2', pad, padOn, padEdges);
    intent.slotPressed = slot1 ? 0 : slot2 ? 1 : -1;
    this.firstFrame = false;
  }

  private pressed(
    action: InputAction,
    pad: Phaser.Input.Gamepad.Gamepad | undefined,
    padOn: boolean,
    padEdges: boolean,
  ): boolean {
    const padDown = padOn && pad !== undefined && this.padDown(pad, action);
    const edge = padEdges && padDown && !this.padWasDown[action];
    this.padWasDown[action] = padDown;
    return this.justDown(action) || edge;
  }

  private isDown(action: InputAction): boolean {
    const keys = this.keys[action];
    for (let i = 0; i < keys.length; i++) {
      if (keys[i]?.isDown) return true;
    }
    return false;
  }

  /** Consulta todas as teclas (sem curto-circuito) para consumir cada JustDown. */
  private justDown(action: InputAction): boolean {
    const keys = this.keys[action];
    let pressed = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key && Phaser.Input.Keyboard.JustDown(key)) pressed = true;
    }
    return pressed;
  }

  private padDown(pad: Phaser.Input.Gamepad.Gamepad, action: InputAction): boolean {
    const buttons = GAMEPAD_BINDINGS[action];
    for (let i = 0; i < buttons.length; i++) {
      const index = buttons[i];
      if (index !== undefined && pad.buttons[index]?.pressed) return true;
    }
    return false;
  }
}

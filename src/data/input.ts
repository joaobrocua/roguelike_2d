/**
 * Mapeamento de controles em um único lugar (teclado e controle).
 * Nomes de teclas seguem os nomes do Phaser (ex.: 'SPACE', 'SHIFT', 'A').
 * Botões do controle seguem o layout "standard" da Gamepad API do navegador.
 */

export type InputAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'roll'
  | 'attack'
  | 'special'
  | 'swap'
  | 'interact'
  | 'slot1'
  | 'slot2';

export const KEY_BINDINGS: Record<InputAction, readonly string[]> = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  jump: ['SPACE', 'W'],
  roll: ['L', 'SHIFT'],
  attack: ['J'],
  special: ['K'],
  swap: ['Q'],
  interact: ['E'],
  slot1: ['ONE', 'NUMPAD_ONE'],
  slot2: ['TWO', 'NUMPAD_TWO'],
};

export const GAMEPAD_BINDINGS: Record<InputAction, readonly number[]> = {
  left: [14], // direcional esquerdo
  right: [15], // direcional direito
  jump: [0], // botão A (Xbox) / X (PlayStation)
  roll: [1, 5], // botão B / RB
  attack: [2], // botão X (Xbox) / quadrado (PlayStation)
  special: [3], // botão Y (Xbox) / triângulo (PlayStation)
  swap: [4], // LB
  interact: [7], // RT (gatilho direito)
  slot1: [],
  slot2: [],
};

/** Zona morta do analógico esquerdo (0 a 1). */
export const STICK_DEADZONE = 0.35;

/** Botões do controle usados nos menus (layout standard): direcional e confirmar. */
export const MENU_PAD = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  confirm: [0, 2],
  /** Botão B (Xbox) / círculo: fecha o painel do santuário. */
  cancel: [1],
} as const;

/** Teclas de atalho da tela de troca de relíquia: 1 e 2 escolhem qual descartar, 3 deixa no chão. */
export const CHOICE_SHORTCUT_KEYS = ['ONE', 'TWO', 'THREE'] as const;

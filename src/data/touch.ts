/**
 * Controles na tela para celular e tablet. Cada botão aperta uma tecla do teclado (o jogo já lê
 * essas teclas), então o resto do jogo não precisa saber que existe toque.
 * Medidas em "unidades" `u` (um botão médio mede 1u; ver src/styles/touch.css).
 */

export interface TouchKey {
  /** `code` do KeyboardEvent e o `keyCode` que o Phaser lê. */
  code: string;
  keyCode: number;
}

export const TOUCH_KEYS = {
  left: { code: 'ArrowLeft', keyCode: 37 },
  up: { code: 'ArrowUp', keyCode: 38 },
  right: { code: 'ArrowRight', keyCode: 39 },
  down: { code: 'ArrowDown', keyCode: 40 },
  jump: { code: 'Space', keyCode: 32 },
  attack: { code: 'KeyJ', keyCode: 74 },
  special: { code: 'KeyK', keyCode: 75 },
  roll: { code: 'KeyL', keyCode: 76 },
  swap: { code: 'KeyQ', keyCode: 81 },
  interact: { code: 'KeyE', keyCode: 69 },
  pause: { code: 'Escape', keyCode: 27 },
  confirm: { code: 'KeyJ', keyCode: 74 },
  cancel: { code: 'Escape', keyCode: 27 },
} as const satisfies Record<string, TouchKey>;

export type TouchAction = keyof typeof TOUCH_KEYS;

/** Em jogo, os botões do jogo; nos menus (título, pausa, santuário...), setas, confirmar e voltar. */
export type TouchMode = 'game' | 'menu';

export interface TouchButton {
  action: TouchAction;
  label: string;
  mode: TouchMode;
  /** Diâmetro, em unidades. */
  size: number;
  /** Distância do canto (em unidades): `x` do lado `side` e `y` da base (ou do topo, se `top`). */
  side: 'left' | 'right';
  x: number;
  y: number;
  top?: boolean;
}

export const TOUCH_BUTTONS: readonly TouchButton[] = [
  // --- Em jogo: os botões ficam à direita (o direcional flutuante é a metade esquerda da tela)
  { action: 'attack', label: 'ATACAR', mode: 'game', size: 1.55, side: 'right', x: 0.5, y: 0.5 },
  { action: 'jump', label: 'PULAR', mode: 'game', size: 1.25, side: 'right', x: 0.7, y: 2.3 },
  { action: 'roll', label: 'ROLAR', mode: 'game', size: 1.25, side: 'right', x: 2.4, y: 0.6 },
  { action: 'special', label: 'ESPEC', mode: 'game', size: 1.05, side: 'right', x: 2.5, y: 2.1 },
  { action: 'swap', label: 'TROCA', mode: 'game', size: 0.85, side: 'right', x: 4.2, y: 0.7 },
  { action: 'interact', label: 'PEGAR', mode: 'game', size: 0.85, side: 'right', x: 4.2, y: 1.8 },
  {
    action: 'pause',
    label: 'II',
    mode: 'game',
    size: 0.75,
    side: 'right',
    x: 0.4,
    y: 0.4,
    top: true,
  },
  // --- Nos menus: setas à esquerda, confirmar e voltar à direita
  { action: 'up', label: '▲', mode: 'menu', size: 1.15, side: 'left', x: 1.4, y: 2.1 },
  { action: 'down', label: '▼', mode: 'menu', size: 1.15, side: 'left', x: 1.4, y: 0.4 },
  { action: 'left', label: '◀', mode: 'menu', size: 1.15, side: 'left', x: 0.1, y: 1.25 },
  { action: 'right', label: '▶', mode: 'menu', size: 1.15, side: 'left', x: 2.7, y: 1.25 },
  { action: 'confirm', label: 'OK', mode: 'menu', size: 1.5, side: 'right', x: 0.5, y: 0.8 },
  { action: 'cancel', label: 'VOLTAR', mode: 'menu', size: 1.2, side: 'right', x: 2.3, y: 0.9 },
];

/** Menu e telas por cima do jogo: enquanto uma destas estiver ativa, valem os botões de menu. */
export const TOUCH_MENU_SCENES: readonly string[] = [
  'Title',
  'Intro',
  'Pause',
  'RelicChoice',
  'RoadChoice',
  'Sanctuary',
  'Death',
  'Victory',
];

export const TOUCH = {
  /** Direcional flutuante (em jogo): raio do círculo (px) e quanto precisa arrastar para valer (px). */
  stickRadius: 46,
  stickDeadzone: 14,
  /** Um aperto dura pelo menos isto (ms): um toque curto não some entre dois quadros do jogo. */
  minHoldMs: 70,
  /** De quanto em quanto tempo (ms) se confere em que tela o jogo está. */
  modePollMs: 150,
} as const;

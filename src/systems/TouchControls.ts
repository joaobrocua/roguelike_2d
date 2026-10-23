import type Phaser from 'phaser';
import {
  TOUCH,
  TOUCH_BUTTONS,
  TOUCH_KEYS,
  TOUCH_MENU_SCENES,
  type TouchAction,
  type TouchButton,
  type TouchKey,
  type TouchMode,
} from '../data/touch';
import { clampToRadius, stickDirections, type StickDirections } from '../logic/touchStick';

/**
 * Controles na tela para celular e tablet: uma camada de HTML por cima do jogo. Cada botão aperta
 * uma tecla do teclado (o jogo já lê essas teclas), então menus e jogo funcionam sem mudança.
 * Em jogo: direcional flutuante na metade esquerda da tela e os botões de ação à direita; nos
 * menus: setas, OK e VOLTAR. Quem está em cada modo vem da cena ativa do Phaser.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  /** Quantas fontes (dedos) seguram cada tecla, e quando começou o aperto. */
  private readonly held = new Map<string, number>();
  private readonly heldSince = new Map<string, number>();
  private mode: TouchMode | 'hidden' = 'hidden';

  constructor(private readonly game: Phaser.Game) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.dataset['mode'] = 'hidden';
    this.root.addEventListener('contextmenu', (event) => event.preventDefault());
    this.buildStick();
    for (const button of TOUCH_BUTTONS) this.buildButton(button);
    this.buildFullscreenButton();
    document.body.appendChild(this.root);

    window.setInterval(() => this.pollMode(), TOUCH.modePollMs);
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => this.releaseAll());
    this.pollMode();
  }

  // --- Teclas ------------------------------------------------------------------------------

  private dispatch(type: 'keydown' | 'keyup', key: TouchKey): void {
    window.dispatchEvent(
      new KeyboardEvent(type, {
        code: key.code,
        key: key.code,
        keyCode: key.keyCode,
        which: key.keyCode,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private press(action: TouchAction): void {
    const key: TouchKey = TOUCH_KEYS[action];
    const count = (this.held.get(key.code) ?? 0) + 1;
    this.held.set(key.code, count);
    if (count === 1) {
      this.heldSince.set(key.code, performance.now());
      this.dispatch('keydown', key);
    }
  }

  private release(action: TouchAction): void {
    const key: TouchKey = TOUCH_KEYS[action];
    const count = (this.held.get(key.code) ?? 0) - 1;
    if (count > 0) {
      this.held.set(key.code, count);
      return;
    }
    this.held.delete(key.code);
    // Um toque curto não pode sumir entre dois quadros do jogo: o aperto dura um mínimo
    const since = this.heldSince.get(key.code) ?? 0;
    const wait = Math.max(0, TOUCH.minHoldMs - (performance.now() - since));
    const send = (): void => {
      if (!this.held.has(key.code)) this.dispatch('keyup', key);
    };
    if (wait > 0) window.setTimeout(send, wait);
    else send();
  }

  /** Solta tudo (troca de tela, janela sem foco): nenhuma tecla fica "presa". */
  private releaseAll(): void {
    for (const code of this.held.keys()) {
      const key = Object.values(TOUCH_KEYS).find((candidate) => candidate.code === code);
      if (key) this.dispatch('keyup', key);
    }
    this.held.clear();
    for (const element of this.root.querySelectorAll('.on')) element.classList.remove('on');
  }

  // --- Modo (jogo ou menu) -----------------------------------------------------------------

  private pollMode(): void {
    const scenes = this.game.scene;
    let next: TouchMode | 'hidden' | null = null;
    if (scenes.isActive('Boot')) next = 'hidden';
    else if (TOUCH_MENU_SCENES.some((key) => scenes.isActive(key))) next = 'menu';
    else if (scenes.isActive('Game')) next = 'game';
    // Entre uma sala e outra a cena do jogo reinicia por um instante: mantém o modo
    if (next === null || next === this.mode) return;
    this.releaseAll();
    this.mode = next;
    this.root.dataset['mode'] = next;
  }

  // --- Botões ------------------------------------------------------------------------------

  private buildButton(spec: TouchButton): void {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `tb tb--${spec.action}`;
    element.dataset['mode'] = spec.mode;
    element.textContent = spec.label;
    element.setAttribute('aria-label', spec.label);
    element.style.setProperty('--sz', String(spec.size));
    element.style[spec.side] = `calc(var(--u) * ${spec.x})`;
    element.style[spec.top ? 'top' : 'bottom'] = `calc(var(--u) * ${spec.y})`;
    this.bindHold(
      element,
      () => this.press(spec.action),
      () => this.release(spec.action),
    );
    this.root.appendChild(element);
  }

  /** Prende o dedo no elemento (se o navegador não deixar, o toque segue valendo do mesmo jeito). */
  private capture(element: HTMLElement, pointerId: number): void {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // sem captura, o aperto acaba quando o dedo sai do elemento
    }
  }

  /** Aperta enquanto o dedo estiver no botão (o dedo fica "preso" nele, mesmo se deslizar). */
  private bindHold(element: HTMLElement, onDown: () => void, onUp: () => void): void {
    let active = false;
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (active) return;
      active = true;
      this.capture(element, event.pointerId);
      element.classList.add('on');
      onDown();
    });
    const end = (): void => {
      if (!active) return;
      active = false;
      element.classList.remove('on');
      onUp();
    };
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
    element.addEventListener('lostpointercapture', end);
  }

  /** Botão de tela cheia (onde o navegador permite; o iPhone não permite). */
  private buildFullscreenButton(): void {
    if (!document.fullscreenEnabled) return;
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'tb tb--full';
    element.textContent = '⛶';
    element.setAttribute('aria-label', 'Tela cheia');
    element.style.setProperty('--sz', '0.75');
    element.style.left = 'calc(var(--u) * 0.4)';
    element.style.top = 'calc(var(--u) * 0.4)';
    element.addEventListener('click', () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }
      void document.documentElement
        .requestFullscreen()
        // Deitado é o jeito de jogar; nem todo aparelho deixa travar a orientação
        .then(() => screen.orientation?.lock?.('landscape'))
        .catch(() => undefined);
    });
    this.root.appendChild(element);
  }

  // --- Direcional flutuante (em jogo) ------------------------------------------------------

  private buildStick(): void {
    const zone = document.createElement('div');
    zone.className = 'tstick';
    const rest = document.createElement('div');
    rest.className = 'tstick__rest';
    rest.textContent = '◀ ▶';
    const base = document.createElement('div');
    base.className = 'tstick__base';
    const knob = document.createElement('div');
    knob.className = 'tstick__knob';
    zone.append(rest, base, knob);
    this.root.appendChild(zone);

    const dirs: StickDirections = { left: false, right: false, up: false, down: false };
    const applied: StickDirections = { left: false, right: false, up: false, down: false };
    let pointer = -1;
    let originX = 0;
    let originY = 0;

    const sync = (): void => {
      for (const direction of ['left', 'right', 'up', 'down'] as const) {
        if (dirs[direction] === applied[direction]) continue;
        applied[direction] = dirs[direction];
        if (dirs[direction]) this.press(direction);
        else this.release(direction);
      }
    };
    const stop = (): void => {
      if (pointer < 0) return;
      pointer = -1;
      zone.classList.remove('active');
      dirs.left = dirs.right = dirs.up = dirs.down = false;
      sync();
    };

    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (pointer >= 0) return;
      pointer = event.pointerId;
      this.capture(zone, event.pointerId);
      const box = zone.getBoundingClientRect();
      originX = event.clientX;
      originY = event.clientY;
      zone.classList.add('active');
      base.style.transform = `translate(${originX - box.left}px, ${originY - box.top}px)`;
      knob.style.transform = base.style.transform;
    });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - originX;
      const dy = event.clientY - originY;
      stickDirections(dx, dy, TOUCH.stickDeadzone, dirs);
      // Em jogo só importa o lado: subir e descer não fazem nada (o pulo é um botão)
      dirs.up = false;
      dirs.down = false;
      sync();
      const box = zone.getBoundingClientRect();
      const clamped = clampToRadius(dx, dy, TOUCH.stickRadius);
      knob.style.transform = `translate(${originX - box.left + clamped.x}px, ${originY - box.top + clamped.y}px)`;
    });
    zone.addEventListener('pointerup', stop);
    zone.addEventListener('pointercancel', stop);
    zone.addEventListener('lostpointercapture', stop);
  }
}

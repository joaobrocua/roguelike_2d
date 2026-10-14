import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { PAUSE_SCREEN as P, TEXT_COLORS } from '../data/ui';
import { getAudio, sfx } from '../systems/AudioSystem';
import { ensurePanelTexture } from '../systems/hudArt';
import { MenuInput } from '../systems/MenuInput';
import { MenuList, type MenuRow } from '../systems/MenuList';
import { ControlsPanel, soundRows } from '../systems/menuRows';
import { pixelText } from '../systems/pixelFont';

/** Evento (em `game.events`) com a escolha feita no menu de pausa. */
export const EVENT_PAUSE_DONE = 'pause-done';
export type PauseChoice = 'resume' | 'quit';

type Page = 'main' | 'controls' | 'confirmQuit';

/** Posição de cada linha do menu de pausa (para devolver o foco ao voltar de uma página). */
const MAIN = { resume: 0, controls: 4, quit: 5 } as const;
/** Na confirmação de desistir, as linhas são [NÃO, SIM]: o foco começa no NÃO. */
const QUIT_NO = 0;

/**
 * Menu de pausa: abre por cima do jogo parado (Esc, P ou Start). Continuar, mexer no som, ver os
 * controles ou desistir da descida (com confirmação). Quem abriu a pausa escuta o evento.
 */
export class PauseScene extends Phaser.Scene {
  private input2!: MenuInput;
  private menu!: MenuList;
  private page: Page = 'main';
  private controls: ControlsPanel | null = null;
  private extra: Phaser.GameObjects.BitmapText[] = [];
  private lockMs = 0;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.page = 'main';
    this.controls = null;
    this.extra = [];
    this.lockMs = P.inputLockMs;
    // A pausa abre com Esc, P ou Start; as mesmas teclas também a fecham
    this.input2 = new MenuInput(this, { keys: ['P'], padButtons: [9] });
    const { width, height } = GAME_SIZE;
    const panel = P.layout.panel;
    const x = (width - panel.width) / 2;
    const y = (height - panel.height) / 2;
    this.add.rectangle(0, 0, width, height, PALETTE.void, P.overlayAlpha).setOrigin(0, 0);
    this.add
      .image(x, y, ensurePanelTexture(this, panel.width, panel.height, PALETTE.glow))
      .setOrigin(0, 0);
    pixelText(this, width / 2, y + P.layout.titleDy, P.title, {
      color: PALETTE.glow,
      originX: 0.5,
      originY: 0.5,
    });
    pixelText(this, width / 2, y + panel.height - P.layout.hintDy, P.hint, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
    this.menu = new MenuList(this, {
      x: width / 2,
      y: y + P.layout.menuDy,
      step: P.layout.menuStep,
    });
    this.showPage('main');
    sfx('uiConfirm');
  }

  private showPage(page: Page, focus = 0): void {
    this.page = page;
    this.menu.setTop((GAME_SIZE.height - P.layout.panel.height) / 2 + P.layout.menuDy);
    this.controls?.destroy();
    this.controls = null;
    for (const text of this.extra) text.destroy();
    this.extra = [];
    let rows: MenuRow[] = [];
    switch (page) {
      case 'main':
        rows = [
          { label: P.resume, onActivate: () => this.finish('resume') },
          ...soundRows(getAudio()),
          { label: P.controls, onActivate: () => this.showPage('controls') },
          {
            label: P.quit,
            color: TEXT_COLORS.dim,
            onActivate: () => this.showPage('confirmQuit', QUIT_NO),
          },
        ];
        break;
      case 'controls':
        this.controls = new ControlsPanel(this, 5);
        break;
      case 'confirmQuit': {
        const cx = GAME_SIZE.width / 2;
        const top = (GAME_SIZE.height - P.layout.panel.height) / 2;
        const c = P.layout.confirm;
        this.menu.setTop(top + c.menuDy);
        this.extra.push(
          pixelText(this, cx, top + c.questionDy, P.quitConfirm.question, {
            color: TEXT_COLORS.danger,
            originX: 0.5,
            originY: 0.5,
          }),
          pixelText(this, cx, top + c.warningDy, P.quitConfirm.warning, {
            color: TEXT_COLORS.dim,
            originX: 0.5,
            originY: 0.5,
          }),
        );
        this.extra.push(
          pixelText(this, cx, top + c.warning2Dy, P.quitConfirm.warning2, {
            color: TEXT_COLORS.dim,
            originX: 0.5,
            originY: 0.5,
          }),
        );
        rows = [
          { label: P.quitConfirm.no, onActivate: () => this.showPage('main', MAIN.quit) },
          {
            label: P.quitConfirm.yes,
            color: TEXT_COLORS.danger,
            onActivate: () => this.finish('quit'),
          },
        ];
        break;
      }
    }
    this.menu.setRows(rows, focus);
  }

  private finish(choice: PauseChoice): void {
    this.game.events.emit(EVENT_PAUSE_DONE, choice);
  }

  update(_time: number, delta: number): void {
    this.lockMs -= delta;
    this.input2.update();
    if (this.lockMs > 0) return;
    if (this.input2.pressed.cancel) {
      sfx('uiBack');
      if (this.page === 'main') this.finish('resume');
      else this.showPage('main', this.page === 'controls' ? MAIN.controls : MAIN.quit);
      return;
    }
    if (this.page === 'controls') {
      if (this.input2.pressed.confirm) this.showPage('main', MAIN.controls);
      return;
    }
    this.menu.handle(this.input2);
  }
}

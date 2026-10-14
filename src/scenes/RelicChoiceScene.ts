import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { MENU_PAD, STICK_DEADZONE } from '../data/input';
import { RELICS, relicIconKey, type RelicId } from '../data/relics';
import { RELIC_CHOICE as UI, TEXT_COLORS } from '../data/ui';
import { ENV_TEXTURE } from '../systems/environmentTextures';
import { pixelText } from '../systems/pixelFont';

export interface RelicChoiceData {
  newRelic: RelicId;
  slots: readonly [RelicId, RelicId];
  active: 0 | 1;
}

export interface RelicChoiceResult {
  /** Slot que será substituído pela relíquia nova; null = deixar a nova no chão. */
  discardSlot: 0 | 1 | null;
}

export const EVENT_DONE = 'relic-choice-done';
const OPTION_COUNT = 3;
const KEEP_INDEX = 2;

/** Tela por cima do jogo parado: ao pegar uma relíquia nova, escolhe qual das carregadas descartar. */
export class RelicChoiceScene extends Phaser.Scene {
  private keys!: Record<
    'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'j' | 'space' | 'enter' | 'esc',
    Phaser.Input.Keyboard.Key
  >;
  /** Grupos de teclas por ação: todas são consultadas a cada quadro (sem curto-circuito). */
  private prevKeys: Phaser.Input.Keyboard.Key[] = [];
  private nextKeys: Phaser.Input.Keyboard.Key[] = [];
  private confirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private optionBoxes: Phaser.GameObjects.Rectangle[] = [];
  private optionNames: Phaser.GameObjects.BitmapText[] = [];
  private marker!: Phaser.GameObjects.Rectangle;
  private optionCenters: { x: number; y: number }[] = [];
  private selected = 0;
  private lockMs: number = UI.inputLockMs;
  private done = false;
  // Estado do controle no quadro anterior, para detectar borda de subida.
  private wasPrev = false;
  private wasNext = false;
  private wasConfirm = false;

  constructor() {
    super('RelicChoice');
  }

  create(data: RelicChoiceData): void {
    this.done = false;
    this.lockMs = UI.inputLockMs;
    this.optionBoxes = [];
    this.optionNames = [];
    this.optionCenters = [];
    this.selected = 1 - data.active; // começa na relíquia inativa

    const kb = this.input.keyboard;
    if (!kb) throw new Error('RelicChoiceScene: teclado indisponível');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      up: kb.addKey(K.UP),
      down: kb.addKey(K.DOWN),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      w: kb.addKey(K.W),
      s: kb.addKey(K.S),
      j: kb.addKey(K.J),
      space: kb.addKey(K.SPACE),
      enter: kb.addKey(K.ENTER),
      esc: kb.addKey(K.ESC),
    };
    this.prevKeys = [this.keys.up, this.keys.w, this.keys.left, this.keys.a];
    this.nextKeys = [this.keys.down, this.keys.s, this.keys.right, this.keys.d];
    this.confirmKeys = [this.keys.j, this.keys.space, this.keys.enter];
    // Descarta pressionamentos anteriores à abertura da tela.
    for (const key of Object.values(this.keys)) key.reset();

    // Ignora botões que já estavam apertados ao abrir.
    const pad = this.input.gamepad?.getPad(0);
    this.wasPrev = pad ? this.padPrevDown(pad) : false;
    this.wasNext = pad ? this.padNextDown(pad) : false;
    this.wasConfirm = pad ? this.padConfirmDown(pad) : false;

    this.buildLayout(data);
    this.applySelection();
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    this.lockMs -= delta;

    const pad = this.input.gamepad?.getPad(0);
    const padPrev = pad ? this.padPrevDown(pad) : false;
    const padNext = pad ? this.padNextDown(pad) : false;
    const padConfirm = pad ? this.padConfirmDown(pad) : false;
    const padPrevEdge = padPrev && !this.wasPrev;
    const padNextEdge = padNext && !this.wasNext;
    const padConfirmEdge = padConfirm && !this.wasConfirm;
    this.wasPrev = padPrev;
    this.wasNext = padNext;
    this.wasConfirm = padConfirm;

    const k = this.keys;
    // Cima/esquerda sobem na lista; baixo/direita descem (a lista é vertical, mas A/D também valem)
    const prev = this.anyJustDown(this.prevKeys);
    const next = this.anyJustDown(this.nextKeys);
    const confirm = this.anyJustDown(this.confirmKeys);
    const escape = Phaser.Input.Keyboard.JustDown(k.esc);

    if (escape) {
      this.finish(null);
      return;
    }

    if (prev || padPrevEdge) this.moveSelection(-1);
    if (next || padNextEdge) this.moveSelection(1);

    if (this.lockMs <= 0 && (confirm || padConfirmEdge)) {
      this.finish(this.selected === KEEP_INDEX ? null : this.selected === 0 ? 0 : 1);
    }
  }

  /** Direção do controle: -1 (sobe), 1 (desce) ou 0. O eixo vertical vale antes do horizontal. */
  private padDirection(pad: Phaser.Input.Gamepad.Gamepad): number {
    const up = !!pad.buttons[MENU_PAD.up]?.pressed || pad.leftStick.y < -STICK_DEADZONE;
    const down = !!pad.buttons[MENU_PAD.down]?.pressed || pad.leftStick.y > STICK_DEADZONE;
    if (up !== down) return up ? -1 : 1;
    const left = !!pad.buttons[MENU_PAD.left]?.pressed || pad.leftStick.x < -STICK_DEADZONE;
    const right = !!pad.buttons[MENU_PAD.right]?.pressed || pad.leftStick.x > STICK_DEADZONE;
    if (left !== right) return left ? -1 : 1;
    return 0;
  }

  private padPrevDown(pad: Phaser.Input.Gamepad.Gamepad): boolean {
    return this.padDirection(pad) < 0;
  }

  private padNextDown(pad: Phaser.Input.Gamepad.Gamepad): boolean {
    return this.padDirection(pad) > 0;
  }

  private padConfirmDown(pad: Phaser.Input.Gamepad.Gamepad): boolean {
    for (const button of MENU_PAD.confirm) {
      if (pad.buttons[button]?.pressed) return true;
    }
    return false;
  }

  /** Consulta todas as teclas (sem curto-circuito) para consumir cada JustDown. */
  private anyJustDown(keys: readonly Phaser.Input.Keyboard.Key[]): boolean {
    let pressed = false;
    for (const key of keys) {
      if (Phaser.Input.Keyboard.JustDown(key)) pressed = true;
    }
    return pressed;
  }

  private moveSelection(step: number): void {
    const next = Phaser.Math.Clamp(this.selected + step, 0, OPTION_COUNT - 1);
    if (next === this.selected) return;
    this.selected = next;
    this.applySelection();
  }

  /** Emite o resultado uma única vez; quem integra é que encerra a cena. */
  private finish(discardSlot: 0 | 1 | null): void {
    if (this.done) return;
    this.done = true;
    const result: RelicChoiceResult = { discardSlot };
    this.game.events.emit(EVENT_DONE, result);
  }

  /** Destaca a opção escolhida: moldura clara, fundo mais claro e o losango ao lado. */
  private applySelection(): void {
    for (let i = 0; i < OPTION_COUNT; i++) {
      const box = this.optionBoxes[i];
      const name = this.optionNames[i];
      if (!box || !name) continue;
      const isSelected = i === this.selected;
      box.setFillStyle(isSelected ? PALETTE.stone : PALETTE.stoneDark, isSelected ? 1 : 0.92);
      box.setStrokeStyle(isSelected ? 2 : 1, isSelected ? PALETTE.bone : PALETTE.stoneLight);
      if (i === KEEP_INDEX) {
        name.setTint(isSelected ? TEXT_COLORS.normal : TEXT_COLORS.dim);
      }
    }
    const center = this.optionCenters[this.selected];
    if (center) this.marker.setPosition(center.x, center.y);
  }

  /** Moldura ornamentada: fundo escuro, borda dupla e quatro cantos acesos. */
  private drawFrame(x: number, y: number, w: number, h: number, accent: number): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.deep, 0.96);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, PALETTE.stoneLight, 1);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.lineStyle(1, PALETTE.stoneDark, 1);
    g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    g.fillStyle(accent, 1);
    for (const [cx, cy] of [
      [x - 1, y - 1],
      [x + w - 3, y - 1],
      [x - 1, y + h - 3],
      [x + w - 3, y + h - 3],
    ] as const) {
      g.fillRect(cx, cy, 4, 4);
    }
  }

  /** Linha com losango na ponta, usada ao lado do título. */
  private drawOrnament(fromX: number, toX: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.stoneLight, 1);
    g.fillRect(Math.min(fromX, toX), y, Math.abs(toX - fromX), 1);
    g.fillStyle(PALETTE.glow, 1);
    g.fillRect(toX - 2, y - 2, 5, 5);
    g.fillStyle(PALETTE.ember, 1);
    g.fillRect(toX - 1, y - 1, 3, 3);
  }

  private buildLayout(data: RelicChoiceData): void {
    const cx = GAME_SIZE.width / 2;
    const relic = RELICS[data.newRelic];

    this.add
      .rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, PALETTE.void, UI.overlayAlpha)
      .setOrigin(0, 0);

    const title = pixelText(this, cx, UI.titleY, UI.title, {
      size: 2,
      color: TEXT_COLORS.normal,
      originX: 0.5,
      originY: 0.5,
    });
    const halfTitle = title.displayWidth / 2 + 14;
    this.drawOrnament(cx - halfTitle - 90, cx - halfTitle, UI.titleY);
    this.drawOrnament(cx + halfTitle + 90, cx + halfTitle, UI.titleY);

    this.buildNewRelicCard(relic);
    this.buildOptions(data);

    pixelText(this, cx, UI.hintY, UI.hint, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
  }

  /** Ficha da relíquia encontrada: ícone grande com halo, nome e o que ela faz. */
  private buildNewRelicCard(relic: (typeof RELICS)[RelicId]): void {
    const card = UI.newCard;
    const cx = card.x + card.width / 2;
    this.drawFrame(card.x, card.y, card.width, card.height, relic.color);

    pixelText(this, cx, card.y + 11, UI.newLabel, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });

    const iconY = card.y + 50;
    this.add
      .image(cx, iconY, ENV_TEXTURE.glow)
      .setTint(relic.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.45)
      .setScale(1.25);
    this.add.image(cx, iconY, relicIconKey(relic.id)).setScale(UI.iconScaleBig);

    pixelText(this, cx, card.y + 90, relic.name, {
      color: relic.color,
      originX: 0.5,
      originY: 0.5,
    });

    const divider = this.add.graphics();
    divider.fillStyle(PALETTE.stoneLight, 1);
    divider.fillRect(card.x + 16, card.y + 101, card.width - 32, 1);

    const rows: readonly (readonly [string, string, number])[] = [
      [UI.rows.basic, relic.summary.basic, TEXT_COLORS.normal],
      [UI.rows.special, relic.summary.special, TEXT_COLORS.normal],
      [UI.rows.passive, relic.passiveText, PALETTE.glow],
    ];
    rows.forEach(([label, text, color], i) => {
      const y = card.y + 106 + i * UI.rowStep;
      pixelText(this, card.x + 14, y, label, { color: TEXT_COLORS.dim });
      pixelText(this, card.x + 14, y + 10, text, { color, maxWidth: card.width - 28 });
    });
  }

  /** Lista da direita: as duas relíquias carregadas e o botão de deixar no chão. */
  private buildOptions(data: RelicChoiceData): void {
    const card = UI.optionCard;
    const header = pixelText(this, card.x + card.width / 2, UI.headerY, UI.discardLabel, {
      color: TEXT_COLORS.normal,
      originX: 0.5,
      originY: 0.5,
    });
    header.setDepth(1);

    for (let i = 0; i < 2; i++) {
      const slotRelic = RELICS[data.slots[i === 0 ? 0 : 1]];
      const y = card.firstY + i * (card.height + card.gap);
      this.drawFrame(card.x, y, card.width, card.height, slotRelic.color);
      const box = this.add
        .rectangle(card.x + 3, y + 3, card.width - 6, card.height - 6, PALETTE.stoneDark, 0.92)
        .setOrigin(0, 0);
      this.add.image(card.x + 30, y + 22, relicIconKey(slotRelic.id)).setScale(UI.iconScaleSmall);
      const name = pixelText(this, card.x + 56, y + 17, slotRelic.name, {
        color: slotRelic.color,
        originY: 0.5,
      });
      pixelText(this, card.x + 56, y + 29, slotRelic.passiveText, {
        color: TEXT_COLORS.dim,
        maxWidth: card.width - 70,
      });
      if (i === data.active) {
        pixelText(this, card.x + 30, y + card.height - 11, UI.activeTag, {
          color: PALETTE.glow,
          originX: 0.5,
          originY: 0.5,
        });
      }
      this.optionBoxes.push(box);
      this.optionNames.push(name);
      this.optionCenters.push({ x: card.x - 7, y: y + card.height / 2 });
    }

    // Botão "deixar no chão"
    const keep = UI.keepButton;
    const keepBox = this.add
      .rectangle(keep.x, keep.y, keep.width, keep.height, PALETTE.stoneDark, 0.92)
      .setOrigin(0, 0);
    const keepText = pixelText(this, keep.x + keep.width / 2, keep.y + keep.height / 2, UI.keep, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
    this.optionBoxes.push(keepBox);
    this.optionNames.push(keepText);
    this.optionCenters.push({ x: keep.x - 7, y: keep.y + keep.height / 2 });

    // Losango que aponta para a opção escolhida
    this.marker = this.add.rectangle(0, 0, 5, 5, PALETTE.glow).setAngle(45);
  }
}

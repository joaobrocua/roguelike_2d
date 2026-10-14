import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { MENU_PAD, STICK_DEADZONE } from '../data/input';
import { UPGRADE_NODES, type UpgradeNode, type UpgradeType } from '../data/meta';
import { PALETTE } from '../data/palette';
import { RELICS, STARTING_LOADOUT } from '../data/relics';
import { SANCTUARY as UI, TEXT_COLORS } from '../data/ui';
import { nextCost, nodeLevel, purchaseBlock, purchaseUpgrade } from '../logic/meta/tree';
import { ensurePanelTexture } from '../systems/hudArt';
import { getMetaStore } from '../systems/metaStore';
import { pixelText } from '../systems/pixelFont';
import { ensureSoulGem } from '../systems/SoulCounter';

/** Evento (em `game.events`) que avisa o jogo de que a janela do santuário foi fechada. */
export const EVENT_SANCTUARY_CLOSED = 'sanctuary-closed';

/** Cor de destaque de cada tipo de melhoria (borda do cartão em foco). */
const TYPE_COLOR: Readonly<Record<UpgradeType, number>> = {
  basic: PALETTE.player,
  agency: PALETTE.glow,
  expansion: PALETTE.wraith,
};
const COLUMN_ORDER: readonly UpgradeType[] = ['basic', 'agency', 'expansion'];

type PadName = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel';

type Item =
  { kind: 'node'; node: UpgradeNode; column: number; row: number; card: Card } | { kind: 'start' };

interface Card {
  x: number;
  y: number;
  panel: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.BitmapText;
  cost: Phaser.GameObjects.BitmapText;
  pips: Phaser.GameObjects.Rectangle[];
  flash: Phaser.GameObjects.Rectangle;
}

/**
 * Janela do santuário: abre sobre o jogo parado quando o herói aperta E diante da estátua. Mostra
 * as almas guardadas e a árvore de melhorias permanentes em três colunas (atributos, agência,
 * expansão); J compra o nó em foco e E (ou Esc) fecha e devolve o jogo.
 */
export class SanctuaryScene extends Phaser.Scene {
  private items: Item[] = [];
  private focus = 0;
  private lastColumn = 0;
  private lockMs: number = UI.inputLockMs;
  /** Canto superior esquerdo da janela (ela fica centralizada na tela). */
  private originX = 0;
  private originY = 0;
  private soulsText!: Phaser.GameObjects.BitmapText;
  private detailTitle!: Phaser.GameObjects.BitmapText;
  private detailText!: Phaser.GameObjects.BitmapText;
  private detailStatus!: Phaser.GameObjects.BitmapText;
  private startText: Phaser.GameObjects.BitmapText | null = null;
  private startIndex = 0;
  private status: string | null = null;

  private keys!: Record<
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'w'
    | 'a'
    | 's'
    | 'd'
    | 'j'
    | 'space'
    | 'enter'
    | 'e'
    | 'esc',
    Phaser.Input.Keyboard.Key
  >;
  /** Apertos deste frame (objeto reaproveitado: o update não aloca). */
  private readonly edges: Record<PadName, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    cancel: false,
  };
  private readonly wasPad: Record<PadName, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    cancel: false,
  };

  constructor() {
    super('Sanctuary');
  }

  create(): void {
    this.items = [];
    this.focus = 0;
    this.lastColumn = 0;
    this.lockMs = UI.inputLockMs;
    this.status = null;
    this.startText = null;
    this.originX = Math.round((GAME_SIZE.width - UI.layout.width) / 2);
    this.originY = Math.round((GAME_SIZE.height - UI.layout.height) / 2);

    const kb = this.input.keyboard;
    if (!kb) throw new Error('SanctuaryScene: teclado indisponível');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP),
      down: kb.addKey(K.DOWN),
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W),
      a: kb.addKey(K.A),
      s: kb.addKey(K.S),
      d: kb.addKey(K.D),
      j: kb.addKey(K.J),
      space: kb.addKey(K.SPACE),
      enter: kb.addKey(K.ENTER),
      e: kb.addKey(K.E),
      esc: kb.addKey(K.ESC),
    };
    for (const key of Object.values(this.keys)) key.reset();
    // Botões já apertados ao abrir (o E/RT que abriu a janela) não contam como aperto novo
    const pad = this.input.gamepad?.getPad(0);
    for (const name of Object.keys(this.wasPad) as PadName[]) {
      this.wasPad[name] = !!pad && this.padDown(pad, name);
    }

    this.buildBackground();
    this.buildHeader();
    this.buildCards();
    this.buildDetail();
    this.buildHint();
    this.ensureStartRow();
    this.startIndex = this.currentStartIndex();
    this.refresh();
  }

  // --- Montagem -----------------------------------------------------------------------------

  private buildBackground(): void {
    const { width, height } = GAME_SIZE;
    this.add.rectangle(0, 0, width, height, PALETTE.void, UI.dimAlpha).setOrigin(0, 0);
    this.add
      .image(
        this.originX,
        this.originY,
        ensurePanelTexture(this, UI.layout.width, UI.layout.height, PALETTE.glow),
      )
      .setOrigin(0, 0);
  }

  private buildHeader(): void {
    const { padding, titleY, width } = UI.layout;
    const y = this.originY + titleY;
    pixelText(this, this.originX + padding, y, UI.title, {
      color: PALETTE.glow,
      originY: 0.5,
    });
    // Almas guardadas, no canto
    this.add.image(this.originX + width - padding, y, ensureSoulGem(this)).setOrigin(1, 0.5);
    this.soulsText = pixelText(this, this.originX + width - padding - 8, y, '0', {
      color: PALETTE.soul,
      originX: 1,
      originY: 0.5,
    });
  }

  private buildCards(): void {
    const { padding, columnWidth, columnGap, headerY, firstCardY, card } = UI.layout;
    COLUMN_ORDER.forEach((type, column) => {
      const x = this.originX + padding + column * (columnWidth + columnGap);
      pixelText(this, x + columnWidth / 2, this.originY + headerY, UI.columns[type], {
        color: TYPE_COLOR[type],
        originX: 0.5,
        originY: 0.5,
      });
      const nodes = UPGRADE_NODES.filter((node) => node.type === type);
      nodes.forEach((node, row) => {
        const y = this.originY + firstCardY + row * (card.height + card.gap);
        this.items.push({ kind: 'node', node, column, row, card: this.makeCard(node, x, y) });
      });
    });
  }

  private makeCard(node: UpgradeNode, x: number, y: number): Card {
    const { columnWidth, card, pip } = UI.layout;
    const panel = this.add
      .image(x, y, ensurePanelTexture(this, columnWidth, card.height))
      .setOrigin(0, 0);
    const name = pixelText(this, x + 6, y + 4, node.name, { color: TEXT_COLORS.normal });
    const cost = pixelText(this, x + columnWidth - 6, y + card.height - 10, '', {
      color: PALETTE.soul,
      originX: 1,
    });
    const pips: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < node.maxLevel; i++) {
      pips.push(
        this.add
          .rectangle(
            x + 7 + i * (pip.size + pip.gap),
            y + card.height - 8,
            pip.size,
            pip.size,
            PALETTE.stoneDark,
          )
          .setOrigin(0, 0)
          .setStrokeStyle(1, PALETTE.void),
      );
    }
    const flash = this.add
      .rectangle(x + 2, y + 2, columnWidth - 4, card.height - 4, UI.fx.flashColor, 1)
      .setOrigin(0, 0)
      .setAlpha(0);
    return { x, y, panel, name, cost, pips, flash };
  }

  /**
   * Linha para escolher a relíquia inicial: só existe depois de comprar o Mestre. É criada ao abrir
   * a janela (se já comprado) ou na hora da compra.
   */
  private ensureStartRow(): void {
    const meta = getMetaStore();
    if (!meta.effects.canChooseStart || this.startText) return;
    this.startText = pixelText(
      this,
      this.originX + UI.layout.width / 2,
      this.originY + UI.layout.startRow.y,
      '',
      { color: TEXT_COLORS.normal, originX: 0.5, originY: 0.5 },
    );
    this.items.push({ kind: 'start' });
    this.startIndex = this.currentStartIndex();
  }

  private buildDetail(): void {
    const { padding, width, detail } = UI.layout;
    const x = this.originX + padding;
    const w = width - padding * 2;
    const y = this.originY + detail.y;
    this.add.image(x, y, ensurePanelTexture(this, w, detail.height)).setOrigin(0, 0);
    this.detailTitle = pixelText(this, x + 6, y + 5, '', { color: TEXT_COLORS.normal });
    this.detailText = pixelText(this, x + 6, y + 16, '', { color: TEXT_COLORS.dim });
    this.detailStatus = pixelText(this, x + w - 6, y + 5, '', {
      color: TEXT_COLORS.dim,
      originX: 1,
    });
  }

  private buildHint(): void {
    pixelText(this, GAME_SIZE.width / 2, this.originY + UI.layout.hintY, UI.hint, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
  }

  // --- Estado visível -----------------------------------------------------------------------

  /** Reescreve tudo o que depende do save (almas, níveis, custos, foco). */
  private refresh(): void {
    const meta = getMetaStore();
    this.soulsText.setText(String(meta.save.souls));
    const { columnWidth, card } = UI.layout;
    this.items.forEach((item, index) => {
      if (item.kind !== 'node') return;
      const { node } = item;
      const level = nodeLevel(meta.save, node.id);
      const block = purchaseBlock(meta.save, node);
      const cost = nextCost(meta.save, node);
      const focused = index === this.focus;
      item.card.panel.setTexture(
        ensurePanelTexture(
          this,
          columnWidth,
          card.height,
          focused ? TYPE_COLOR[node.type] : undefined,
        ),
      );
      const nameColor =
        block === 'maxed'
          ? PALETTE.soul
          : block === 'locked'
            ? PALETTE.stoneLight
            : block === 'poor'
              ? TEXT_COLORS.dim
              : TEXT_COLORS.normal;
      item.card.name.setTint(nameColor);
      item.card.cost.setText(cost === null ? UI.status.maxedShort : String(cost));
      item.card.cost.setTint(
        block === null ? PALETTE.soul : block === 'maxed' ? PALETTE.soul : PALETTE.stoneLight,
      );
      item.card.pips.forEach((pip, i) => {
        pip.setFillStyle(i < level ? TYPE_COLOR[node.type] : PALETTE.stoneDark);
      });
    });
    this.refreshStartRow();
    this.refreshDetail();
  }

  private currentStartIndex(): number {
    const meta = getMetaStore();
    const list = meta.unlocked();
    const current = meta.save.startRelic ?? STARTING_LOADOUT[0];
    return Math.max(0, list.indexOf(current));
  }

  private refreshStartRow(): void {
    if (!this.startText) return;
    const meta = getMetaStore();
    const list = meta.unlocked();
    const id = list[this.startIndex] ?? STARTING_LOADOUT[0];
    const focused = this.items[this.focus]?.kind === 'start';
    this.startText.setText(
      `${UI.startLabel}  ${focused ? '<' : ' '} ${RELICS[id].name} ${focused ? '>' : ' '}`,
    );
    this.startText.setTint(focused ? RELICS[id].color : TEXT_COLORS.dim);
  }

  private refreshDetail(): void {
    const meta = getMetaStore();
    const item = this.items[this.focus];
    if (!item || item.kind !== 'node') {
      this.detailTitle.setText(UI.startLabel).setTint(TEXT_COLORS.normal);
      this.detailText.setText(UI.startHelp);
      this.detailStatus.setText('');
      return;
    }
    const { node } = item;
    const level = nodeLevel(meta.save, node.id);
    this.detailTitle
      .setText(`${node.name}  ${level}/${node.maxLevel}`)
      .setTint(TYPE_COLOR[node.type]);
    this.detailText.setText(node.description);
    const block = purchaseBlock(meta.save, node);
    let text: string = this.status ?? UI.status.ready;
    let color: number = PALETTE.soul;
    if (this.status === null) {
      if (block === 'maxed') {
        text = UI.status.maxed;
      } else if (block === 'locked') {
        const missing = node.prerequisites
          .filter((id) => nodeLevel(meta.save, id) < 1)
          .map((id) => UPGRADE_NODES.find((n) => n.id === id)?.name ?? id)
          .join(', ');
        text = `${UI.status.locked}${missing}`;
        color = PALETTE.stoneLight;
      } else if (block === 'poor') {
        text = UI.status.poor;
        color = PALETTE.blood;
      }
    } else {
      color = PALETTE.glow;
    }
    this.detailStatus.setText(text).setTint(color);
  }

  // --- Entrada ------------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    this.lockMs -= delta;
    const pad = this.input.gamepad?.getPad(0);
    const k = this.keys;
    const J = Phaser.Input.Keyboard.JustDown;
    const edges = this.edges;
    edges.up = this.edge(J(k.up) || J(k.w), pad, 'up');
    edges.down = this.edge(J(k.down) || J(k.s), pad, 'down');
    edges.left = this.edge(J(k.left) || J(k.a), pad, 'left');
    edges.right = this.edge(J(k.right) || J(k.d), pad, 'right');
    edges.confirm = this.edge(J(k.j) || J(k.space) || J(k.enter), pad, 'confirm');
    edges.cancel = this.edge(J(k.e) || J(k.esc), pad, 'cancel');
    if (this.lockMs > 0) return;
    if (edges.cancel) {
      this.close();
      return;
    }
    if (edges.up) this.move(0, -1);
    if (edges.down) this.move(0, 1);
    if (edges.left) this.move(-1, 0);
    if (edges.right) this.move(1, 0);
    if (edges.confirm) this.confirm();
  }

  /** Aperto novo: tecla recém apertada ou botão do controle que acabou de descer. */
  private edge(
    keyPressed: boolean,
    pad: Phaser.Input.Gamepad.Gamepad | undefined,
    name: PadName,
  ): boolean {
    const down = !!pad && this.padDown(pad, name);
    const risen = down && !this.wasPad[name];
    this.wasPad[name] = down;
    return keyPressed || risen;
  }

  private padDown(pad: Phaser.Input.Gamepad.Gamepad, name: PadName): boolean {
    switch (name) {
      case 'up':
        return !!pad.buttons[MENU_PAD.up]?.pressed || pad.leftStick.y < -STICK_DEADZONE;
      case 'down':
        return !!pad.buttons[MENU_PAD.down]?.pressed || pad.leftStick.y > STICK_DEADZONE;
      case 'left':
        return !!pad.buttons[MENU_PAD.left]?.pressed || pad.leftStick.x < -STICK_DEADZONE;
      case 'right':
        return !!pad.buttons[MENU_PAD.right]?.pressed || pad.leftStick.x > STICK_DEADZONE;
      case 'confirm':
        return MENU_PAD.confirm.some((index) => !!pad.buttons[index]?.pressed);
      case 'cancel':
        return MENU_PAD.cancel.some((index) => !!pad.buttons[index]?.pressed);
    }
  }

  private nodeAt(column: number, row: number): number {
    return this.items.findIndex((i) => i.kind === 'node' && i.column === column && i.row === row);
  }

  private columnLength(column: number): number {
    return this.items.filter((i) => i.kind === 'node' && i.column === column).length;
  }

  private move(dx: number, dy: number): void {
    const current = this.items[this.focus];
    if (!current) return;
    this.status = null;
    let next = this.focus;
    if (current.kind === 'node') {
      this.lastColumn = current.column;
      if (dx !== 0) {
        const column = Phaser.Math.Clamp(current.column + dx, 0, COLUMN_ORDER.length - 1);
        const row = Math.min(current.row, this.columnLength(column) - 1);
        next = this.nodeAt(column, row);
      } else if (dy > 0) {
        const below = this.nodeAt(current.column, current.row + 1);
        next = below >= 0 ? below : this.items.findIndex((i) => i.kind === 'start');
      } else if (dy < 0) {
        const above = this.nodeAt(current.column, current.row - 1);
        next = above >= 0 ? above : this.focus;
      }
    } else {
      if (dx !== 0) {
        this.cycleStartRelic(dx);
        return;
      }
      if (dy < 0) next = this.nodeAt(this.lastColumn, this.columnLength(this.lastColumn) - 1);
    }
    if (next >= 0 && next !== this.focus) this.focus = next;
    this.refresh();
  }

  private cycleStartRelic(step: number): void {
    const meta = getMetaStore();
    const list = meta.unlocked();
    if (list.length === 0) return;
    this.startIndex = (this.startIndex + step + list.length) % list.length;
    meta.setStartRelic(list[this.startIndex] ?? null);
    this.refresh();
  }

  private confirm(): void {
    const item = this.items[this.focus];
    if (!item || item.kind !== 'node') return;
    const meta = getMetaStore();
    if (purchaseUpgrade(meta.save, item.node)) {
      const saved = meta.commit();
      this.status = saved ? UI.status.bought : UI.status.notSaved;
      this.flashCard(item.card);
      this.ensureStartRow(); // o Mestre libera a linha da relíquia inicial na hora
    } else {
      this.status = null;
    }
    this.refresh();
  }

  private flashCard(card: Card): void {
    card.flash.setAlpha(UI.fx.flashAlpha);
    this.tweens.add({ targets: card.flash, alpha: 0, duration: UI.fx.flashMs });
  }

  /** Fecha a janela: quem a abriu (o jogo) escuta o evento, retoma e aplica as melhorias. */
  private close(): void {
    this.game.events.emit(EVENT_SANCTUARY_CLOSED);
  }
}

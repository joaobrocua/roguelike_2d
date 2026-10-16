import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { BIOME_NAMES, BIOME_SHORT_NAMES, type BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { ROAD_CHOICE as UI, TEXT_COLORS } from '../data/ui';
import { sfx } from '../systems/AudioSystem';
import { MenuInput } from '../systems/MenuInput';
import { pixelText } from '../systems/pixelFont';
import { ensureViewTexture } from '../systems/sanctuaryArt';

export interface RoadChoiceData {
  /** As áreas que a saída oferece (2). */
  options: readonly BiomeId[];
}

/** Evento (em `game.events`) com o caminho escolhido (ou null se o jogador voltou). */
export const EVENT_ROAD_DONE = 'road-choice-done';

/**
 * Bifurcação: ao cruzar a porta de saída de uma área que oferece dois caminhos, o jogo para e
 * mostra uma carta para cada um, com a paisagem do lugar. Setas escolhem, J segue, Esc volta.
 */
export class RoadChoiceScene extends Phaser.Scene {
  private input2!: MenuInput;
  private options: readonly BiomeId[] = [];
  private selected = 0;
  private lockMs: number = UI.inputLockMs;
  private done = false;
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private views: Phaser.GameObjects.Image[] = [];
  private names: Phaser.GameObjects.BitmapText[] = [];

  constructor() {
    super('RoadChoice');
  }

  create(data: RoadChoiceData): void {
    this.options = data.options;
    this.selected = 0;
    this.done = false;
    this.lockMs = UI.inputLockMs;
    this.frames = [];
    this.views = [];
    this.names = [];
    this.input2 = new MenuInput(this);

    const { width, height } = GAME_SIZE;
    this.add.rectangle(0, 0, width, height, PALETTE.void, UI.overlayAlpha).setOrigin(0, 0);
    pixelText(this, width / 2, UI.titleY, UI.title, {
      color: PALETTE.glow,
      originX: 0.5,
      originY: 0.5,
    });
    pixelText(this, width / 2, UI.hintY, UI.hint, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });

    const card = UI.card;
    const count = this.options.length;
    const totalWidth = count * card.width + (count - 1) * card.gap;
    this.options.forEach((dest, i) => {
      const left = (width - totalWidth) / 2 + i * (card.width + card.gap);
      const frame = this.add
        .rectangle(left, card.top, card.width, card.height, PALETTE.deep, 0.9)
        .setOrigin(0, 0)
        .setStrokeStyle(1, PALETTE.stoneLight);
      this.frames.push(frame);
      const view = this.add
        .image(left + card.width / 2, card.top + card.viewDy, ensureViewTexture(this, dest))
        .setOrigin(0.5, 0)
        .setScale(card.viewScale);
      this.views.push(view);
      this.names.push(
        pixelText(
          this,
          left + card.width / 2,
          card.top + card.height - card.nameDy,
          BIOME_SHORT_NAMES[dest],
          {
            color: TEXT_COLORS.normal,
            originX: 0.5,
            originY: 0.5,
          },
        ),
      );
      pixelText(
        this,
        left + card.width / 2,
        card.top + card.height - card.subtitleDy,
        BIOME_NAMES[dest],
        {
          color: TEXT_COLORS.dim,
          originX: 0.5,
          originY: 0.5,
          maxWidth: card.width - 8,
          align: 'center',
        },
      );
    });
    this.applySelection();
    sfx('uiConfirm');
  }

  update(_time: number, delta: number): void {
    if (this.done) return;
    this.lockMs -= delta;
    const input = this.input2;
    input.update();
    const pressed = input.pressed;
    if (pressed.left || pressed.up) this.move(-1);
    if (pressed.right || pressed.down) this.move(1);
    if (this.lockMs > 0) return;
    if (pressed.cancel) {
      this.finish(null);
      return;
    }
    if (pressed.confirm) this.finish(this.options[this.selected] ?? null);
  }

  private move(step: number): void {
    const count = this.options.length;
    if (count < 2) return;
    this.selected = (this.selected + step + count) % count;
    sfx('uiMove');
    this.applySelection();
  }

  private applySelection(): void {
    this.frames.forEach((frame, i) => {
      const on = i === this.selected;
      frame.setStrokeStyle(on ? 2 : 1, on ? PALETTE.glow : PALETTE.stoneLight);
    });
    this.views.forEach((view, i) => view.setAlpha(i === this.selected ? 1 : UI.dimAlpha));
    this.names.forEach((name, i) =>
      name.setTint(i === this.selected ? PALETTE.glow : TEXT_COLORS.normal),
    );
  }

  private finish(choice: BiomeId | null): void {
    this.done = true;
    sfx(choice ? 'uiConfirm' : 'uiBack');
    this.game.events.emit(EVENT_ROAD_DONE, choice);
    this.scene.stop();
  }
}

import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { TEXT_COLORS, VICTORY_SCREEN } from '../data/ui';
import { InputSystem } from '../systems/InputSystem';
import { pixelText } from '../systems/pixelFont';
import { pulse, UI_TEXTURE } from '../systems/uiArt';

/** Tela de vitória: o Guardião caiu e a névoa recua. Apertar um botão começa uma run nova. */
export class VictoryScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private lockMs: number = VICTORY_SCREEN.inputLockMs;

  constructor() {
    super('Victory');
  }

  create(): void {
    this.lockMs = VICTORY_SCREEN.inputLockMs;
    this.inputSystem = new InputSystem(this);

    this.add
      .rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, PALETTE.void, VICTORY_SCREEN.overlayAlpha)
      .setOrigin(0, 0);
    const layout = VICTORY_SCREEN.layout;
    const cx = GAME_SIZE.width / 2;
    const cy = GAME_SIZE.height / 2;
    // Faixa escura atrás do texto e divisores dourados
    this.add
      .rectangle(0, cy - layout.bandHalf, GAME_SIZE.width, layout.bandHalf * 2, PALETTE.void, 0.4)
      .setOrigin(0, 0);
    this.add.image(cx, cy - layout.dividerY, UI_TEXTURE.divider).setTint(PALETTE.glow);
    this.add.image(cx, cy + layout.dividerY, UI_TEXTURE.divider).setTint(PALETTE.glow);
    const title = pixelText(this, cx, cy + layout.titleY, VICTORY_SCREEN.title, {
      size: 2,
      color: PALETTE.glow,
      originX: 0.5,
      originY: 0.5,
    }).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: VICTORY_SCREEN.titleFadeMs });
    pixelText(this, cx, cy + layout.subtitleY, VICTORY_SCREEN.subtitle, {
      color: TEXT_COLORS.normal,
      originX: 0.5,
      originY: 0.5,
    });
    const prompt = pixelText(this, cx, cy + layout.promptY, VICTORY_SCREEN.prompt, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
    pulse(this, prompt);
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update();
    this.lockMs -= delta;
    const intent = this.inputSystem.intent;
    if (this.lockMs <= 0 && (intent.attackPressed || intent.jumpPressed)) {
      this.scene.stop('Game');
      this.scene.start('Game'); // sem dados: começa uma run nova
    }
  }
}

import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { DEATH_SCREEN, TEXT_COLORS } from '../data/ui';
import { InputSystem } from '../systems/InputSystem';
import { pixelText } from '../systems/pixelFont';
import { pulse, UI_TEXTURE } from '../systems/uiArt';

/** Tela de morte: aparece por cima do jogo parado; apertar um botão reinicia a run. */
export class DeathScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private lockMs: number = DEATH_SCREEN.inputLockMs;

  constructor() {
    super('Death');
  }

  create(): void {
    this.lockMs = DEATH_SCREEN.inputLockMs;
    this.inputSystem = new InputSystem(this);

    this.add
      .rectangle(0, 0, GAME_SIZE.width, GAME_SIZE.height, PALETTE.void, DEATH_SCREEN.overlayAlpha)
      .setOrigin(0, 0);
    const layout = DEATH_SCREEN.layout;
    const cx = GAME_SIZE.width / 2;
    const cy = GAME_SIZE.height / 2;
    // Faixa escura atrás do título e divisores em vermelho
    this.add
      .rectangle(0, cy - layout.bandHalf, GAME_SIZE.width, layout.bandHalf * 2, PALETTE.void, 0.45)
      .setOrigin(0, 0);
    this.add.image(cx, cy - layout.dividerY, UI_TEXTURE.divider).setTint(PALETTE.bloodDark);
    this.add.image(cx, cy + layout.dividerY, UI_TEXTURE.divider).setTint(PALETTE.bloodDark);
    const title = pixelText(this, cx, cy + layout.titleY, DEATH_SCREEN.title, {
      size: 2,
      color: TEXT_COLORS.danger,
      originX: 0.5,
      originY: 0.5,
    }).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: DEATH_SCREEN.titleFadeMs });
    const prompt = pixelText(this, cx, cy + layout.promptY, DEATH_SCREEN.prompt, {
      color: TEXT_COLORS.normal,
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
      this.scene.start('Game'); // para esta cena e começa uma run nova
    }
  }
}

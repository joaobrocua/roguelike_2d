import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PICKUP_FX } from '../data/fx';
import { RELIC_DROP, RELICS, relicIconKey, type RelicId } from '../data/relics';
import { createBox, type Box } from '../logic/geometry';
import { pickupPhase } from '../logic/drops';
import { ENV_TEXTURE } from '../systems/environmentTextures';
import { ensureKeycap } from '../systems/hudArt';
import { pixelText } from '../systems/pixelFont';

/** Altura em que o aviso e a arma ficam em relação aos outros objetos do mundo. */
const PROMPT_DEPTH = DEPTH.hud - 1;
const PROMPT_KEY = 'E';

/**
 * Relíquia largada no chão: a arma de verdade, deitada, com um brilho embaixo. Cai até o chão
 * com um quique. Quando o jogador chega perto aparece o aviso "[E] nome"; é preciso apertar o
 * botão para abrir a tela de troca. As largadas por inimigos somem depois de um tempo (piscam
 * antes); as de baús e do chefe esperam para sempre.
 */
export class RelicPickup extends Phaser.GameObjects.Image {
  readonly relicId: RelicId;
  /** Região em que o jogador consegue pegar a arma (um pouco maior que o desenho). */
  readonly box: Box = createBox();
  /** O tempo acabou: a cena deve removê-la. */
  expired = false;
  private readonly lifetimeMs: number;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly nameText: Phaser.GameObjects.BitmapText;
  private readonly keyImage: Phaser.GameObjects.Image;
  private clockMs = 0;
  private near = false;

  /** (x, floorY): onde a arma fica quando para; `fromY` é de onde ela começa a cair. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    fromY: number,
    floorY: number,
    relicId: RelicId,
    lifetimeMs = Number.POSITIVE_INFINITY,
  ) {
    super(scene, x, fromY, relicIconKey(relicId));
    this.relicId = relicId;
    this.lifetimeMs = lifetimeMs;
    const relic = RELICS[relicId];
    scene.add.existing(this);
    this.setDepth(DEPTH.warmGlow);
    // A espada, o martelo etc. ficam deitados; o tomo (livro) já nasce "deitado"
    this.setAngle(relic.floatingWeapon ? 0 : PICKUP_FX.lieAngleDeg);

    const restY = floorY - PICKUP_FX.restOffsetY;
    const glowFx = PICKUP_FX.glow;
    this.glow = scene.add
      .image(x, floorY - glowFx.offsetY, ENV_TEXTURE.glow)
      .setTint(relic.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(glowFx.scaleX, glowFx.scaleY)
      .setAlpha(glowFx.alpha)
      .setDepth(DEPTH.warmGlow - 0.1);
    this.nameText = pixelText(scene, x, restY + PICKUP_FX.prompt.nameDy, relic.name, {
      color: relic.color,
      originX: 0.5,
      originY: 0.5,
      depth: PROMPT_DEPTH,
    }).setVisible(false);
    this.keyImage = scene.add
      .image(x, restY + PICKUP_FX.prompt.keyDy, ensureKeycap(scene, PROMPT_KEY))
      .setDepth(PROMPT_DEPTH)
      .setVisible(false);

    // Cai até o chão e quica
    scene.tweens.add({
      targets: this,
      y: restY,
      duration: PICKUP_FX.dropMs,
      ease: 'Bounce.easeOut',
    });
    this.refreshBox();
  }

  /** O jogador está perto o bastante para pegar? Liga e desliga o aviso. */
  setNear(near: boolean): void {
    if (near === this.near) return;
    this.near = near;
    this.nameText.setVisible(near);
    this.keyImage.setVisible(near);
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    const phase = pickupPhase(this.clockMs, this.lifetimeMs, RELIC_DROP.warnMs);
    this.expired = phase === 'expired';
    const hidden = phase === 'warning' && Math.floor(this.clockMs / RELIC_DROP.blinkMs) % 2 === 1;
    const alpha = hidden ? 0 : 1;
    this.setAlpha(alpha);
    // O brilho do chão respira devagar
    const wave = 0.5 + 0.5 * Math.sin((this.clockMs / PICKUP_FX.glow.pulseMs) * Math.PI * 2);
    this.glow.setAlpha(alpha * PICKUP_FX.glow.alpha * (0.65 + 0.35 * wave));
    this.refreshBox();
  }

  override destroy(fromScene?: boolean): void {
    this.glow.destroy();
    this.nameText.destroy();
    this.keyImage.destroy();
    super.destroy(fromScene);
  }

  private refreshBox(): void {
    const half = this.width / 2 + PICKUP_FX.reach;
    this.box.x = this.x - half;
    this.box.y = this.y - half;
    this.box.width = half * 2;
    this.box.height = half * 2;
  }
}

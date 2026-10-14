import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PICKUP_FX } from '../data/fx';
import { RELIC_DROP, RELICS, type RelicId } from '../data/relics';
import { pickupPhase } from '../logic/drops';
import { createBox, type Box } from '../logic/geometry';
import { TEXTURE } from '../systems/textures';

/**
 * Relíquia largada no chão: flutua, brilha e espera o jogador encostar. As largadas por inimigos
 * somem depois de um tempo (piscam antes); as de baús e do chefe esperam para sempre.
 */
export class RelicPickup extends Phaser.GameObjects.Image {
  readonly relicId: RelicId;
  readonly box: Box = createBox();
  /** O jogador recusou a troca: o item só reabre a escolha depois que ele sair de cima. */
  refused = false;
  /** O tempo acabou: a cena deve removê-la. */
  expired = false;
  private readonly baseY: number;
  private readonly lifetimeMs: number;
  private clockMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    relicId: RelicId,
    lifetimeMs = Number.POSITIVE_INFINITY,
  ) {
    super(scene, x, y, TEXTURE.pickup);
    this.relicId = relicId;
    this.lifetimeMs = lifetimeMs;
    this.baseY = y;
    scene.add.existing(this);
    this.setTint(RELICS[relicId].color).setDepth(DEPTH.warmGlow);
    this.refreshBox();
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    this.y =
      this.baseY + Math.sin((this.clockMs / PICKUP_FX.bobPeriodMs) * Math.PI * 2) * PICKUP_FX.bobPx;
    const phase = pickupPhase(this.clockMs, this.lifetimeMs, RELIC_DROP.warnMs);
    this.expired = phase === 'expired';
    const hidden = phase === 'warning' && Math.floor(this.clockMs / RELIC_DROP.blinkMs) % 2 === 1;
    this.setAlpha(hidden ? 0 : this.refused ? PICKUP_FX.refusedAlpha : 1);
    this.refreshBox();
  }

  private refreshBox(): void {
    this.box.x = this.x - this.displayWidth / 2;
    this.box.y = this.y - this.displayHeight / 2;
    this.box.width = this.displayWidth;
    this.box.height = this.displayHeight;
  }
}

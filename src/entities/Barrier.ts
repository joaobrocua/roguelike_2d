import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { BARRIER_FX } from '../data/fx';
import { createBox, type Box } from '../logic/geometry';
import { TEXTURE } from '../systems/textures';

/**
 * Barreira do Tomo Cinzento: uma parede de luz à frente do jogador que bloqueia projéteis
 * inimigos enquanto dura. Um só objeto, reaproveitado a cada uso.
 */
export class Barrier extends Phaser.GameObjects.Image {
  readonly box: Box = createBox();
  private remainingMs = 0;
  private durationMs = 1;

  constructor(scene: Phaser.Scene, tint: number) {
    super(scene, 0, 0, TEXTURE.barrier);
    scene.add.existing(this);
    this.setTint(tint).setDepth(DEPTH.warmGlow).setVisible(false);
  }

  get live(): boolean {
    return this.remainingMs > 0;
  }

  raise(durationMs: number, width: number, height: number, tint: number): void {
    this.setTint(tint);
    this.remainingMs = durationMs;
    this.durationMs = durationMs;
    this.setDisplaySize(width, height);
    this.setVisible(true);
  }

  dismiss(): void {
    this.remainingMs = 0;
    this.setVisible(false);
  }

  /** Acompanha o jogador: fica `offsetX` à frente, na altura do corpo. */
  update(dtMs: number, x: number, y: number, facing: number, offsetX: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
    if (this.remainingMs === 0) {
      this.setVisible(false);
      return;
    }
    this.setPosition(x + facing * offsetX, y);
    // Pisca no fim para avisar que vai cair
    const fading = this.remainingMs / this.durationMs < BARRIER_FX.fadeFraction;
    this.setAlpha(fading ? BARRIER_FX.alphaFading : BARRIER_FX.alpha);
    this.box.x = this.x - this.displayWidth / 2;
    this.box.y = this.y - this.displayHeight / 2;
    this.box.width = this.displayWidth;
    this.box.height = this.displayHeight;
  }
}

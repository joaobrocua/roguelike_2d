import Phaser from 'phaser';
import { SLASH_FX } from '../data/fx';
import type { Box } from '../logic/geometry';
import { easeOutQuad } from '../logic/floatingText';
import { TEXTURE } from './textures';

/**
 * Arco visual de um golpe. Fica esticado sobre a hitbox, espelhado conforme a direção,
 * e "abre" e some aos poucos durante a fase ativa. Reutiliza um único sprite.
 */
export class SlashVisual {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, tint: number) {
    this.image = scene.add
      .image(0, 0, TEXTURE.slashArc)
      .setTint(tint)
      .setDepth(8)
      .setVisible(false);
  }

  /** `progress` vai de 0 a 1 ao longo da fase ativa do golpe. */
  update(active: boolean, box: Box, facing: number, progress: number): void {
    this.image.setVisible(active);
    if (!active) return;
    const eased = easeOutQuad(progress);
    const widthFactor = SLASH_FX.startWidth + (1 - SLASH_FX.startWidth) * eased;
    // O arco cresce a partir do corpo de quem ataca: ancora a borda de dentro da hitbox
    const width = box.width * widthFactor;
    const innerX = facing >= 0 ? box.x : box.x + box.width;
    this.image.setPosition(innerX + (facing >= 0 ? width / 2 : -width / 2), box.y + box.height / 2);
    this.image.setDisplaySize(width, box.height);
    this.image.setFlipX(facing < 0);
    this.image.setAlpha(SLASH_FX.alpha * (1 - progress * 0.6));
  }

  setTint(tint: number): void {
    this.image.setTint(tint);
  }

  hide(): void {
    this.image.setVisible(false);
  }
}

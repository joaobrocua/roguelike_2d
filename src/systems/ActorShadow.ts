import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { ACTOR_SHADOW } from '../data/fx';
import { canvasTexture, rect, type Ctx } from './pixelCanvas';

/**
 * Sombra escura e macia sob os pés de um personagem, que o "prende" ao chão (sem ela os
 * sprites parecem flutuar sobre o cenário). Some quando ele está no ar.
 */
const KEY = 'actor-shadow';

function drawShadow(ctx: Ctx): void {
  const { width, height } = ACTOR_SHADOW.texture;
  // Elipse em três anéis, cada um mais fraco, para a borda ficar suave sem borrar o pixel
  for (let ring = 0; ring < 3; ring++) {
    const inset = ring;
    const h = Math.max(1, height - ring * 2);
    rect(ctx, 0x04060c, inset * 2, Math.floor((height - h) / 2), width - inset * 4, h, 0.28);
  }
}

export class ActorShadow {
  private readonly image: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly bodyWidth: number,
  ) {
    canvasTexture(scene, KEY, ACTOR_SHADOW.texture.width, ACTOR_SHADOW.texture.height, drawShadow);
    this.image = scene.add.image(0, 0, KEY).setDepth(DEPTH.shadow).setVisible(false);
  }

  /** `centerX` e `bottomY`: o meio dos pés; `grounded`: está pisando no chão? */
  update(centerX: number, bottomY: number, grounded: boolean, alive: boolean): void {
    const show = grounded && alive;
    this.image.setVisible(show);
    if (!show) return;
    this.image.setPosition(centerX, bottomY + ACTOR_SHADOW.offsetY);
    this.image.setScale(
      (this.bodyWidth * ACTOR_SHADOW.widthFactor) / ACTOR_SHADOW.texture.width,
      1,
    );
  }

  destroy(): void {
    this.image.destroy();
  }
}

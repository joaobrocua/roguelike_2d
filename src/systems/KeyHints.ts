import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { HUD, PIXEL_FONT, TEXT_COLORS } from '../data/ui';
import { KEYCAP_KEY } from './hudArt';
import { pixelText } from './pixelFont';

/**
 * Dica de controles: cada tecla é um quadradinho com a letra, seguido do que ela faz. Fica no pé
 * da tela, à direita das casas de relíquia, e some sozinha depois de alguns segundos.
 */
export class KeyHints {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const { items, left, bottom, itemGap, holdMs, fadeMs } = HUD.hints;
    const { size, labelGap, keyGap } = HUD.keycap;
    const y = GAME_SIZE.height - bottom - size;
    const children: Phaser.GameObjects.GameObject[] = [];
    let x = left;
    for (const item of items) {
      for (const key of item.keys) {
        children.push(scene.add.image(x, y, KEYCAP_KEY).setOrigin(0, 0));
        children.push(
          pixelText(scene, x + 3, y + 2, key, { color: TEXT_COLORS.keycap, fixed: true }),
        );
        x += size + keyGap;
      }
      x += labelGap - keyGap;
      children.push(
        pixelText(scene, x, y + 2, item.label, { color: TEXT_COLORS.dim, fixed: true }),
      );
      x += item.label.length * PIXEL_FONT.glyphSize + itemGap;
    }
    this.container = scene.add.container(0, 0, children).setScrollFactor(0).setDepth(DEPTH.hud);
    scene.tweens.add({
      targets: this.container,
      alpha: 0,
      delay: holdMs,
      duration: fadeMs,
      onComplete: () => this.container.destroy(),
    });
  }
}

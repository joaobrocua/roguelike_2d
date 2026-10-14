import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { BANNER, TEXT_COLORS } from '../data/ui';
import { pixelText } from './pixelFont';
import { UI_TEXTURE } from './uiArt';

/**
 * Nome do bioma ao entrar nele: o "ATO I" pequeno em cima, o nome grande no meio e dois divisores
 * dourados. Sobe um pouquinho enquanto aparece, fica um instante e some.
 */
export function showBiomeBanner(scene: Phaser.Scene, actIndex: number, name: string): void {
  const cx = GAME_SIZE.width / 2;
  const act = BANNER.acts[actIndex] ?? String(actIndex + 1);
  const caption = pixelText(scene, cx, BANNER.y + BANNER.captionDy, `${BANNER.actLabel} ${act}`, {
    color: TEXT_COLORS.dim,
    originX: 0.5,
    originY: 0.5,
    fixed: true,
  });
  const title = pixelText(scene, cx, BANNER.y, name, {
    size: 2,
    color: TEXT_COLORS.normal,
    originX: 0.5,
    originY: 0.5,
    fixed: true,
  });
  const dividerY = BANNER.y + BANNER.dividerDy;
  const top = scene.add
    .image(cx, BANNER.y + BANNER.captionDy - 8, UI_TEXTURE.divider)
    .setTint(PALETTE.glow)
    .setScrollFactor(0);
  const bottom = scene.add
    .image(cx, dividerY + 6, UI_TEXTURE.divider)
    .setTint(PALETTE.glow)
    .setScrollFactor(0);
  const banner = scene.add
    .container(0, BANNER.slidePx, [top, caption, title, bottom])
    .setScrollFactor(0)
    .setDepth(DEPTH.hud)
    .setAlpha(0);
  scene.tweens.add({
    targets: banner,
    alpha: 1,
    y: 0,
    duration: BANNER.fadeMs,
    ease: 'Sine.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: banner,
        alpha: 0,
        delay: BANNER.holdMs,
        duration: BANNER.fadeMs,
        onComplete: () => banner.destroy(),
      });
    },
  });
}

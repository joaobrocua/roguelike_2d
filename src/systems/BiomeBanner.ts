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
/**
 * O nome da ala ao entrar nela (BIBLIOTECA, CAPELA...): uma linha discreta com um divisor, que
 * aparece e some sozinha. Não repete o aviso grande da área.
 */
export function showWingCaption(scene: Phaser.Scene, name: string): void {
  const cx = GAME_SIZE.width / 2;
  const label = pixelText(scene, cx, BANNER.wing.y, name, {
    color: TEXT_COLORS.normal,
    originX: 0.5,
    originY: 0.5,
    fixed: true,
  });
  const divider = scene.add
    .image(cx, BANNER.wing.y + BANNER.wing.dividerDy, UI_TEXTURE.divider)
    .setTint(PALETTE.glow)
    .setScrollFactor(0);
  const caption = scene.add
    .container(0, 0, [label, divider])
    .setScrollFactor(0)
    .setDepth(DEPTH.hud)
    .setAlpha(0);
  scene.tweens.add({
    targets: caption,
    alpha: 1,
    duration: BANNER.wing.fadeMs,
    hold: BANNER.wing.holdMs,
    yoyo: true,
    onComplete: () => caption.destroy(),
  });
}

export function showBiomeBanner(
  scene: Phaser.Scene,
  actIndex: number,
  name: string,
  banked = 0,
  /** Texto no lugar do "ATO I" (o santuário não é um ato). */
  captionText?: string,
): void {
  const cx = GAME_SIZE.width / 2;
  const act = BANNER.acts[actIndex] ?? String(actIndex + 1);
  const caption = pixelText(
    scene,
    cx,
    BANNER.y + BANNER.captionDy,
    captionText ?? `${BANNER.actLabel} ${act}`,
    {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
      fixed: true,
    },
  );
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
  const children: Phaser.GameObjects.GameObject[] = [top, caption, title, bottom];
  if (banked > 0) {
    // Almas que acabaram de ser guardadas ao passar de bioma
    children.push(
      pixelText(scene, cx, dividerY + BANNER.bankedDy, `+${banked} ${BANNER.bankedLabel}`, {
        color: PALETTE.soul,
        originX: 0.5,
        originY: 0.5,
        fixed: true,
      }),
    );
  }
  const banner = scene.add
    .container(0, BANNER.slidePx, children)
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

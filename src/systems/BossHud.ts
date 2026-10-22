import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BOSS_BAR } from '../data/boss';
import { PALETTE } from '../data/palette';
import { TEXT_COLORS } from '../data/ui';
import { clampFraction, trailFraction } from '../logic/gauge';
import { ensureGauge } from './gaugeArt';
import { ensurePanelTexture } from './hudArt';
import { pixelText } from './pixelFont';

/**
 * Nome e barra de vida do chefe, num painel no pé da tela: a barra tem moldura com marcas e um
 * traço onde começa a fase 2, um rastro claro que mostra o tamanho do último golpe, e o conjunto
 * todo sobe e aparece devagar quando a luta começa.
 */
export class BossHud {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly ghost: Phaser.GameObjects.Image;
  private ghostFraction = 1;

  constructor(scene: Phaser.Scene, bossName: string) {
    const { width, height, border, padding, plateHeight, bottomMargin, nameY, barY } = BOSS_BAR;
    const plateWidth = width + border * 2 + padding * 2;
    const left = Math.floor((GAME_SIZE.width - plateWidth) / 2);
    const top = GAME_SIZE.height - bottomMargin - plateHeight;
    const keys = ensureGauge(scene, {
      prefix: 'hud-boss',
      width,
      height,
      border,
      divisions: 10,
      highlightAt: BOSS_BAR.phaseMark,
    });

    const plate = scene.add
      .image(left, top, ensurePanelTexture(scene, plateWidth, plateHeight, PALETTE.blood))
      .setOrigin(0, 0);
    const barLeft = left + padding;
    const inner = { x: barLeft + border, y: top + barY + border };
    const frame = scene.add.image(barLeft, top + barY, keys.frame).setOrigin(0, 0);
    this.ghost = scene.add.image(inner.x, inner.y, keys.ghost).setOrigin(0, 0);
    this.fill = scene.add.image(inner.x, inner.y, keys.fill).setOrigin(0, 0);
    const marks = scene.add.image(inner.x, inner.y, keys.marks).setOrigin(0, 0);
    const name = pixelText(scene, GAME_SIZE.width / 2, top + nameY, bossName.toUpperCase(), {
      color: TEXT_COLORS.normal,
      originX: 0.5,
    });

    this.container = scene.add
      .container(0, 0, [plate, frame, this.ghost, this.fill, marks, name])
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    this.container.y = BOSS_BAR.introSlidePx;
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: 0,
      duration: BOSS_BAR.introMs,
      ease: 'Sine.easeOut',
    });
  }

  /** O chefe caiu: a barra some devagar e o painel é destruído. */
  hide(): void {
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: BOSS_BAR.introMs,
      onComplete: () => this.container.destroy(),
    });
  }

  /** `dtMs` em tempo real; `hpFraction` de 0 a 1. */
  update(dtMs: number, hpFraction: number): void {
    const { width, height, ghostDelayRate } = BOSS_BAR;
    const f = clampFraction(hpFraction);
    this.fill.setCrop(0, 0, Math.round(width * f), height);
    this.ghostFraction = trailFraction(this.ghostFraction, f, ghostDelayRate, dtMs);
    this.ghost.setCrop(0, 0, Math.round(width * this.ghostFraction), height);
  }
}
